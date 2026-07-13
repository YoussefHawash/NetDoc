"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LinkType, TopologyShapeType } from "@/generated/prisma/enums";

export type SaveTopologyConnection = {
  id: string | null;
  deviceAId: string;
  deviceBId: string;
  portA: string | null;
  portB: string | null;
  linkType: LinkType;
  label: string | null;
};

export type SaveTopologyShape = {
  id: string | null;
  type: TopologyShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string | null;
  color: string;
};

export type SaveTopologyInput = {
  placed: { id: string; x: number; y: number }[];
  removedDeviceIds: string[];
  connections: SaveTopologyConnection[];
  deletedConnectionIds: string[];
  shapes: SaveTopologyShape[];
  deletedShapeIds: string[];
};

export async function saveTopology(input: SaveTopologyInput) {
  await prisma.$transaction([
    ...input.placed.map((d) =>
      prisma.device.update({
        where: { id: d.id },
        data: { positionX: d.x, positionY: d.y, onCanvas: true },
      }),
    ),
    ...(input.removedDeviceIds.length > 0
      ? [
          prisma.device.updateMany({
            where: { id: { in: input.removedDeviceIds } },
            data: { onCanvas: false },
          }),
        ]
      : []),
    ...(input.deletedConnectionIds.length > 0
      ? [
          prisma.connection.deleteMany({
            where: { id: { in: input.deletedConnectionIds } },
          }),
        ]
      : []),
    ...input.connections.map((c) =>
      c.id
        ? prisma.connection.update({
            where: { id: c.id },
            data: {
              deviceAId: c.deviceAId,
              deviceBId: c.deviceBId,
              portA: c.portA,
              portB: c.portB,
              linkType: c.linkType,
              label: c.label,
            },
          })
        : prisma.connection.create({
            data: {
              deviceAId: c.deviceAId,
              deviceBId: c.deviceBId,
              portA: c.portA,
              portB: c.portB,
              linkType: c.linkType,
              label: c.label,
            },
          }),
    ),
    ...(input.deletedShapeIds.length > 0
      ? [
          prisma.topologyShape.deleteMany({
            where: { id: { in: input.deletedShapeIds } },
          }),
        ]
      : []),
    ...input.shapes.map((s) =>
      s.id
        ? prisma.topologyShape.update({
            where: { id: s.id },
            data: {
              type: s.type,
              x: s.x,
              y: s.y,
              width: s.width,
              height: s.height,
              text: s.text,
              color: s.color,
            },
          })
        : prisma.topologyShape.create({
            data: {
              type: s.type,
              x: s.x,
              y: s.y,
              width: s.width,
              height: s.height,
              text: s.text,
              color: s.color,
            },
          }),
    ),
  ]);

  revalidatePath("/topology");
  revalidatePath("/report");
}
