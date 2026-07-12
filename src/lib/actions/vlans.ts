"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildVlanData(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("VLAN name is required");

  const vlanIdRaw = str(formData, "vlanId");
  const vlanId = vlanIdRaw ? Number(vlanIdRaw) : NaN;
  if (!Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094) {
    throw new Error("VLAN ID must be an integer between 1 and 4094");
  }

  return {
    vlanId,
    name,
    purpose: str(formData, "purpose"),
    notes: str(formData, "notes"),
    siteId: str(formData, "siteId"),
  };
}

export async function createVlan(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.vlan.create({ data: buildVlanData(formData) });
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("Unique constraint")
          ? "That VLAN ID already exists for this site"
          : err instanceof Error
            ? err.message
            : "Failed to create VLAN",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateVlan(
  vlanId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.vlan.update({
      where: { id: vlanId },
      data: buildVlanData(formData),
    });
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("Unique constraint")
          ? "That VLAN ID already exists for this site"
          : err instanceof Error
            ? err.message
            : "Failed to update VLAN",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteVlan(vlanId: string) {
  await prisma.vlan.delete({ where: { id: vlanId } });
  revalidatePath("/", "layout");
}
