"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidIp } from "@/lib/subnet";
import type { ImportState } from "@/lib/actions/types";

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

// This only fills in the IP allocation picture for a subnet (so you can see
// how full it is) - it deliberately does NOT touch the Device inventory or
// the topology diagram, which are curated separately.
export async function importStaticIps(
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
    ipAddress: string;
    macAddress: string | null;
    vendorName: string | null;
  };

  const rows: Row[] = [];
  let skipped = 0;
  for (const raw of parsedRows) {
    const hostname = raw.hostname?.trim() || null;
    const ipAddress = raw.ipAddress?.trim() || "";
    const macAddress = raw.macAddress?.trim() || null;
    const vendorName = raw.vendor?.trim() || null;

    // A static IP entry only means something with an actual address.
    if (!ipAddress || !isValidIp(ipAddress)) {
      skipped++;
      continue;
    }
    rows.push({ hostname, ipAddress, macAddress, vendorName });
  }

  if (rows.length === 0) {
    return { error: "No rows had a valid IP address" };
  }

  // Look up every existing entry this batch could touch in one query,
  // instead of one findFirst per row.
  const ips = [...new Set(rows.map((r) => r.ipAddress))];
  const existing = await prisma.staticIp.findMany({
    where: { ipAddress: { in: ips } },
  });
  const existingByIp = new Map(existing.map((e) => [e.ipAddress, e]));

  const toCreate: {
    ipAddress: string;
    hostname: string | null;
    macAddress: string | null;
    notes: string | null;
    siteId: string | null;
    subnetId: string | null;
  }[] = [];
  const updates: Promise<unknown>[] = [];
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const notes = row.vendorName ? `Vendor: ${row.vendorName}` : null;
    const match = existingByIp.get(row.ipAddress);

    if (match) {
      updates.push(
        prisma.staticIp.update({
          where: { id: match.id },
          data: {
            hostname: row.hostname ?? match.hostname,
            macAddress: row.macAddress ?? match.macAddress,
            notes: notes ?? match.notes,
            siteId: siteId ?? match.siteId,
            subnetId: subnetId ?? match.subnetId,
          },
        }),
      );
      updated++;
    } else {
      toCreate.push({
        ipAddress: row.ipAddress,
        hostname: row.hostname,
        macAddress: row.macAddress,
        notes,
        siteId,
        subnetId,
      });
      created++;
    }
  }

  if (toCreate.length > 0) {
    await prisma.staticIp.createMany({ data: toCreate });
  }
  await Promise.all(updates);

  revalidatePath("/", "layout");

  return {
    error: null,
    summary: `${created} created, ${updated} updated, ${skipped} skipped`,
  };
}
