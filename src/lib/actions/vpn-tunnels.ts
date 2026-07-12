"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { VpnTunnelType, DeviceStatus } from "@/generated/prisma/enums";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function buildVpnTunnelData(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Tunnel name is required");

  return {
    name,
    tunnelType: enumOrDefault(
      str(formData, "tunnelType"),
      VpnTunnelType,
      VpnTunnelType.siteToSite,
    ),
    status: enumOrDefault(str(formData, "status"), DeviceStatus, DeviceStatus.active),
    localEndpoint: str(formData, "localEndpoint"),
    remoteEndpoint: str(formData, "remoteEndpoint"),
    encryption: str(formData, "encryption"),
    notes: str(formData, "notes"),
    localSiteId: str(formData, "localSiteId"),
    remoteSiteId: str(formData, "remoteSiteId"),
    deviceId: str(formData, "deviceId"),
  };
}

export async function createVpnTunnel(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.vpnTunnel.create({ data: buildVpnTunnelData(formData) });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create VPN tunnel",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateVpnTunnel(
  tunnelId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await prisma.vpnTunnel.update({
      where: { id: tunnelId },
      data: buildVpnTunnelData(formData),
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update VPN tunnel",
    };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteVpnTunnel(tunnelId: string) {
  await prisma.vpnTunnel.delete({ where: { id: tunnelId } });
  revalidatePath("/", "layout");
}
