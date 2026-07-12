"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidIp } from "@/lib/subnet";

export type ImportState = { error: string | null; summary?: string };

export const initialImportState: ImportState = { error: null };

// Vendor names from nmap/MAC-OUI lookups frequently contain commas (e.g.
// "TP-LINK TECHNOLOGIES CO.,LTD."). Tools that quote such fields (including
// Python's csv module, used by scripts/discover.py) wrap them in double
// quotes per RFC 4180, with embedded quotes doubled ("" -> "). Parse that
// properly rather than naively splitting on every comma.
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? "";
    });
    return row;
  });
}

export async function importDevices(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file" };
  }

  const siteId = (formData.get("siteId") as string) || null;
  const subnetId = (formData.get("subnetId") as string) || null;

  const text = await file.text();
  const parsedRows = parseCsv(text);
  if (parsedRows.length === 0) {
    return { error: "CSV file is empty or has no data rows" };
  }

  type Row = {
    hostname: string | null;
    ipAddress: string | null;
    macAddress: string | null;
    vendorName: string | null;
  };

  const rows: Row[] = [];
  let skipped = 0;
  for (const raw of parsedRows) {
    const hostname = raw.hostname?.trim() || null;
    const ipAddress = raw.ipAddress?.trim() || null;
    const macAddress = raw.macAddress?.trim() || null;
    const vendorName = raw.vendor?.trim() || null;

    if (!hostname && !ipAddress) {
      skipped++;
      continue;
    }
    if (ipAddress && !isValidIp(ipAddress)) {
      skipped++;
      continue;
    }
    rows.push({ hostname, ipAddress, macAddress, vendorName });
  }

  // Resolve all vendor names up front in a small, constant number of
  // queries instead of one upsert per row.
  const distinctVendorNames = [...new Set(rows.map((r) => r.vendorName).filter((v): v is string => !!v))];
  const vendorIdByName = new Map<string, string>();
  if (distinctVendorNames.length > 0) {
    const existingVendors = await prisma.vendor.findMany({
      where: { name: { in: distinctVendorNames } },
    });
    for (const v of existingVendors) vendorIdByName.set(v.name, v.id);

    const missingVendorNames = distinctVendorNames.filter((n) => !vendorIdByName.has(n));
    if (missingVendorNames.length > 0) {
      await prisma.vendor.createMany({
        data: missingVendorNames.map((name) => ({ name })),
        skipDuplicates: true,
      });
      const created = await prisma.vendor.findMany({
        where: { name: { in: missingVendorNames } },
      });
      for (const v of created) vendorIdByName.set(v.name, v.id);
    }
  }

  // Look up every existing device this batch could touch in one query,
  // instead of one findFirst per row.
  const ips = [...new Set(rows.map((r) => r.ipAddress).filter((v): v is string => !!v))];
  const hostnamesWithoutIp = [
    ...new Set(rows.filter((r) => !r.ipAddress && r.hostname).map((r) => r.hostname as string)),
  ];
  const existingDevices = await prisma.device.findMany({
    where: {
      OR: [
        ...(ips.length > 0 ? [{ ipAddress: { in: ips } }] : []),
        ...(hostnamesWithoutIp.length > 0 ? [{ hostname: { in: hostnamesWithoutIp } }] : []),
      ],
    },
  });
  const existingByIp = new Map(
    existingDevices.filter((d) => d.ipAddress).map((d) => [d.ipAddress as string, d]),
  );
  const existingByHostname = new Map(existingDevices.map((d) => [d.hostname, d]));

  const toCreate: {
    hostname: string;
    ipAddress: string | null;
    macAddress: string | null;
    vendorId: string | null;
    siteId: string | null;
    subnetId: string | null;
  }[] = [];
  const updates: Promise<unknown>[] = [];
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const vendorId = row.vendorName ? (vendorIdByName.get(row.vendorName) ?? null) : null;
    const existing = row.ipAddress
      ? existingByIp.get(row.ipAddress)
      : existingByHostname.get(row.hostname!);

    if (existing) {
      updates.push(
        prisma.device.update({
          where: { id: existing.id },
          data: {
            hostname: row.hostname ?? existing.hostname,
            macAddress: row.macAddress ?? existing.macAddress,
            vendorId: vendorId ?? existing.vendorId,
            siteId: siteId ?? existing.siteId,
            subnetId: subnetId ?? existing.subnetId,
          },
        }),
      );
      updated++;
    } else {
      toCreate.push({
        hostname: row.hostname ?? row.ipAddress!,
        ipAddress: row.ipAddress,
        macAddress: row.macAddress,
        vendorId,
        siteId,
        subnetId,
      });
      created++;
    }
  }

  if (toCreate.length > 0) {
    await prisma.device.createMany({ data: toCreate });
  }
  await Promise.all(updates);

  revalidatePath("/", "layout");

  return {
    error: null,
    summary: `${created} created, ${updated} updated, ${skipped} skipped`,
  };
}
