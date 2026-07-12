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

export async function createDeviceModel(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = str(formData, "name");
  if (!name) return { error: "Model name is required" };

  try {
    await prisma.deviceModel.create({ data: { name } });
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("Unique constraint")
          ? "That model already exists"
          : "Failed to create model",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteDeviceModel(deviceModelId: string) {
  await prisma.deviceModel.delete({ where: { id: deviceModelId } });
  revalidatePath("/", "layout");
}
