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

export async function createSite(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = str(formData, "name");
  if (!name) return { error: "Site name is required" };

  await prisma.site.create({
    data: {
      name,
      address: str(formData, "address"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateSite(
  siteId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = str(formData, "name");
  if (!name) return { error: "Site name is required" };

  await prisma.site.update({
    where: { id: siteId },
    data: {
      name,
      address: str(formData, "address"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteSite(siteId: string) {
  await prisma.site.delete({ where: { id: siteId } });
  revalidatePath("/", "layout");
}
