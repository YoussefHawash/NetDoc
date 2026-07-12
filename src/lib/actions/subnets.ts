"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidCidr } from "@/lib/subnet";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildSubnetData(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Subnet name is required");

  const cidr = str(formData, "cidr");
  if (!cidr || !isValidCidr(cidr)) {
    throw new Error(`Invalid CIDR notation: ${cidr ?? ""}`);
  }

  const vlanIdRaw = str(formData, "vlanId");
  const vlanId = vlanIdRaw ? Number(vlanIdRaw) : null;
  if (vlanId !== null && (!Number.isInteger(vlanId) || vlanId < 1)) {
    throw new Error("VLAN ID must be a positive integer");
  }

  return {
    name,
    cidr,
    vlanId,
    description: str(formData, "description"),
    siteId: str(formData, "siteId"),
  };
}

export async function createSubnet(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.subnet.create({ data: buildSubnetData(formData) });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create subnet" };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateSubnet(
  subnetId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.subnet.update({
      where: { id: subnetId },
      data: buildSubnetData(formData),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update subnet" };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteSubnet(subnetId: string) {
  await prisma.subnet.delete({ where: { id: subnetId } });
  revalidatePath("/", "layout");
  redirect("/subnets");
}
