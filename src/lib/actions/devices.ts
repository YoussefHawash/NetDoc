"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeviceType, DeviceStatus } from "@/generated/prisma/enums";
import { isValidIp } from "@/lib/subnet";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dateOrNull(formData: FormData, key: string): Date | null {
  const value = str(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enumOrDefault<T extends string>(
  value: string | null,
  allowed: Record<string, T>,
  fallback: T,
): T {
  return value && Object.values(allowed).includes(value as T)
    ? (value as T)
    : fallback;
}

function buildDeviceData(formData: FormData) {
  const hostname = str(formData, "hostname");
  if (!hostname) throw new Error("Hostname is required");

  const ipAddress = str(formData, "ipAddress");
  if (ipAddress && !isValidIp(ipAddress)) {
    throw new Error(`Invalid IPv4 address: ${ipAddress}`);
  }

  return {
    hostname,
    ipAddress,
    macAddress: str(formData, "macAddress"),
    type: enumOrDefault(str(formData, "type"), DeviceType, DeviceType.other),
    vendor: str(formData, "vendor"),
    model: str(formData, "model"),
    serialNumber: str(formData, "serialNumber"),
    os: str(formData, "os"),
    status: enumOrDefault(
      str(formData, "status"),
      DeviceStatus,
      DeviceStatus.active,
    ),
    owner: str(formData, "owner"),
    notes: str(formData, "notes"),
    purchaseDate: dateOrNull(formData, "purchaseDate"),
    warrantyExpiry: dateOrNull(formData, "warrantyExpiry"),
    siteId: str(formData, "siteId"),
    subnetId: str(formData, "subnetId"),
  };
}

export async function createDevice(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.device.create({ data: buildDeviceData(formData) });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create device" };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateDevice(
  deviceId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.device.update({
      where: { id: deviceId },
      data: buildDeviceData(formData),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update device" };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteDevice(deviceId: string) {
  await prisma.device.delete({ where: { id: deviceId } });
  revalidatePath("/", "layout");
  redirect("/devices");
}

export async function updateDevicePosition(
  deviceId: string,
  positionX: number,
  positionY: number,
) {
  await prisma.device.update({
    where: { id: deviceId },
    data: { positionX, positionY },
  });
  // Several routes (including /topology) are static-optimized at build time;
  // without this, a production build would keep serving stale positions.
  revalidatePath("/topology");
  revalidatePath("/report");
}
