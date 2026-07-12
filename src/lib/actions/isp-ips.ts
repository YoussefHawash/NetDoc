"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidIp, isValidCidr } from "@/lib/subnet";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildIspIpData(formData: FormData) {
  const provider = str(formData, "provider");
  if (!provider) throw new Error("Provider is required");

  const ipAddress = str(formData, "ipAddress");
  // ISPs may hand out a single public IP or a whole block, so accept either.
  if (!ipAddress || !(isValidIp(ipAddress) || isValidCidr(ipAddress))) {
    throw new Error(`Invalid IP address or CIDR block: ${ipAddress ?? ""}`);
  }

  return {
    provider,
    ipAddress,
    circuitId: str(formData, "circuitId"),
    gateway: str(formData, "gateway"),
    dns: str(formData, "dns"),
    notes: str(formData, "notes"),
    siteId: str(formData, "siteId"),
  };
}

export async function createIspIp(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.ispIp.create({ data: buildIspIpData(formData) });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create ISP IP",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateIspIp(
  ispIpId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.ispIp.update({
      where: { id: ispIpId },
      data: buildIspIpData(formData),
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update ISP IP",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteIspIp(ispIpId: string) {
  await prisma.ispIp.delete({ where: { id: ispIpId } });
  revalidatePath("/", "layout");
}
