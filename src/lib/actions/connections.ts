"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LinkType } from "@/generated/prisma/enums";
import type { FormState } from "@/lib/actions/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createConnection(
  deviceAId: string,
  deviceBId: string,
  portA?: string | null,
  portB?: string | null,
  linkType?: LinkType,
) {
  if (deviceAId === deviceBId) {
    throw new Error("A device cannot connect to itself");
  }

  // A cable is one physical link. If the other side already started this
  // same connection (e.g. from its own port panel) and hasn't set its port
  // yet, fill that in instead of creating a second, duplicate connection.
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { deviceAId, deviceBId },
        { deviceAId: deviceBId, deviceBId: deviceAId },
      ],
    },
  });

  if (existing) {
    const iAmDeviceA = existing.deviceAId === deviceAId;
    const mySideIsEmpty = iAmDeviceA ? !existing.portA : !existing.portB;

    if (mySideIsEmpty) {
      const connection = await prisma.connection.update({
        where: { id: existing.id },
        data: iAmDeviceA
          ? {
              portA: portA || existing.portA,
              portB: portB || existing.portB,
              linkType: linkType ?? undefined,
            }
          : {
              portB: portA || existing.portB,
              portA: portB || existing.portA,
              linkType: linkType ?? undefined,
            },
      });

      revalidatePath("/topology");
      revalidatePath("/report");
      revalidatePath("/", "layout");

      return connection;
    }
  }

  const connection = await prisma.connection.create({
    data: {
      deviceAId,
      deviceBId,
      portA: portA || null,
      portB: portB || null,
      linkType: linkType ?? undefined,
    },
  });

  revalidatePath("/topology");
  revalidatePath("/report");
  revalidatePath("/", "layout");

  return connection;
}

export async function updateConnection(
  connectionId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const linkTypeValue = str(formData, "linkType");
  const linkType =
    linkTypeValue && Object.values(LinkType).includes(linkTypeValue as LinkType)
      ? (linkTypeValue as LinkType)
      : LinkType.copper;

  try {
    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        linkType,
        label: str(formData, "label"),
        portA: str(formData, "portA"),
        portB: str(formData, "portB"),
      },
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update connection",
    };
  }

  revalidatePath("/topology");
  revalidatePath("/report");
  return { error: null };
}

export async function deleteConnection(connectionId: string) {
  await prisma.connection.delete({ where: { id: connectionId } });
  revalidatePath("/topology");
  revalidatePath("/report");
}
