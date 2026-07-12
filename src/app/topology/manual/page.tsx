import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopologyCanvas } from "@/components/topology/topology-canvas";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { Button } from "@/components/ui/button";

export default async function ManualTopologyPage() {
  const [devices, connections, sites, subnets, vendors, deviceModels] = await Promise.all([
    prisma.device.findMany({
      orderBy: { hostname: "asc" },
      select: {
        id: true,
        hostname: true,
        type: true,
        status: true,
        ipAddress: true,
        positionX: true,
        positionY: true,
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
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.deviceModel.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/topology"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Auto diagram
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Physical Connections
          </h1>
          <p className="text-sm text-muted-foreground">
            Drag devices to arrange them. Drag from one device&apos;s edge to
            another to connect them.
          </p>
        </div>
        <DeviceFormDialog
          sites={sites}
          subnets={subnets}
          vendors={vendors}
          deviceModels={deviceModels}
          trigger={<Button>Add Device</Button>}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-background">
        <TopologyCanvas devices={devices} connections={connections} />
      </div>
    </div>
  );
}
