import { prisma } from "@/lib/prisma";
import { TopologyCanvas } from "@/components/topology/topology-canvas";

export default async function TopologyPage() {
  const [devices, connections, shapes, sites, subnets, vendors, deviceModels] =
    await Promise.all([
      prisma.device.findMany({
        orderBy: { hostname: "asc" },
        select: {
          id: true,
          hostname: true,
          displayName: true,
          type: true,
          status: true,
          ipAddress: true,
          portCount: true,
          positionX: true,
          positionY: true,
          onCanvas: true,
        },
      }),
      prisma.connection.findMany({
        select: {
          id: true,
          deviceAId: true,
          deviceBId: true,
          linkType: true,
          label: true,
          portA: true,
          portB: true,
        },
      }),
      prisma.topologyShape.findMany(),
      prisma.site.findMany({ orderBy: { name: "asc" } }),
      prisma.subnet.findMany({ orderBy: { name: "asc" } }),
      prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      prisma.deviceModel.findMany({ orderBy: { name: "asc" } }),
    ]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Topology</h1>
        <p className="text-sm text-muted-foreground">
          Drag devices onto the board, click one to open its ports and
          connect it to another device, and annotate subnets with circles or
          labels. Nothing is saved until you press Save.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-background">
        <TopologyCanvas
          devices={devices}
          connections={connections}
          shapes={shapes}
          sites={sites}
          subnets={subnets}
          vendors={vendors}
          deviceModels={deviceModels}
        />
      </div>
    </div>
  );
}
