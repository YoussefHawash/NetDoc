"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidIp } from "@/lib/subnet";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildStaticIpData(formData: FormData) {
  const ipAddress = str(formData, "ipAddress");
  if (!ipAddress || !isValidIp(ipAddress)) {
    throw new Error(`Invalid IPv4 address: ${ipAddress ?? ""}`);
  }

  return {
    ipAddress,
    hostname: str(formData, "hostname"),
    macAddress: str(formData, "macAddress"),
    assignedTo: str(formData, "assignedTo"),
    notes: str(formData, "notes"),
    siteId: str(formData, "siteId"),
    subnetId: str(formData, "subnetId"),
  };
}

export async function createStaticIp(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.staticIp.create({ data: buildStaticIpData(formData) });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create static IP",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateStaticIp(
  staticIpId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.staticIp.update({
      where: { id: staticIpId },
      data: buildStaticIpData(formData),
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update static IP",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteStaticIp(staticIpId: string) {
  await prisma.staticIp.delete({ where: { id: staticIpId } });
  revalidatePath("/", "layout");
}
