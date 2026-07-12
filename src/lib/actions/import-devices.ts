"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidIp } from "@/lib/subnet";

export type ImportState = { error: string | null; summary?: string };

export const initialImportState: ImportState = { error: null };

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
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
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { error: "CSV file is empty or has no data rows" };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const hostname = row.hostname?.trim() || null;
    const ipAddress = row.ipAddress?.trim() || null;
    const macAddress = row.macAddress?.trim() || null;
    const vendorName = row.vendor?.trim() || null;

    if (!hostname && !ipAddress) {
      skipped++;
      continue;
    }
    if (ipAddress && !isValidIp(ipAddress)) {
      skipped++;
      continue;
    }

    let vendorId: string | null = null;
    if (vendorName) {
      const vendor = await prisma.vendor.upsert({
        where: { name: vendorName },
        create: { name: vendorName },
        update: {},
      });
      vendorId = vendor.id;
    }

    const existing = ipAddress
      ? await prisma.device.findFirst({ where: { ipAddress } })
      : await prisma.device.findFirst({ where: { hostname: hostname! } });

    if (existing) {
      await prisma.device.update({
        where: { id: existing.id },
        data: {
          hostname: hostname ?? existing.hostname,
          macAddress: macAddress ?? existing.macAddress,
          vendorId: vendorId ?? existing.vendorId,
          siteId: siteId ?? existing.siteId,
          subnetId: subnetId ?? existing.subnetId,
        },
      });
      updated++;
    } else {
      await prisma.device.create({
        data: {
          hostname: hostname ?? ipAddress!,
          ipAddress,
          macAddress,
          vendorId,
          siteId,
          subnetId,
        },
      });
      created++;
    }
  }

  revalidatePath("/", "layout");

  return {
    error: null,
    summary: `${created} created, ${updated} updated, ${skipped} skipped`,
  };
}
