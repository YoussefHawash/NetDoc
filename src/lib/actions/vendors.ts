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

export async function createVendor(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = str(formData, "name");
  if (!name) return { error: "Vendor name is required" };

  try {
    await prisma.vendor.create({ data: { name } });
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("Unique constraint")
          ? "That vendor already exists"
          : "Failed to create vendor",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteVendor(vendorId: string) {
  await prisma.vendor.delete({ where: { id: vendorId } });
  revalidatePath("/", "layout");
}
