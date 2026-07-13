import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteDevice } from "@/lib/actions/devices";
import { createConnection, deleteConnection } from "@/lib/actions/connections";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { PortPanel } from "@/components/ports/port-panel";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeviceStatus, LinkType } from "@/generated/prisma/enums";
import { deviceTypeIcons, deviceTypeLabels as typeLabels } from "@/lib/device-icons";

async function connectPort(
  deviceId: string,
  input: {
    portOnThisDevice: string;
    targetDeviceId: string;
    portOnPeer: string | null;
    linkType: LinkType;
  },
) {
  "use server";
  await createConnection(
    deviceId,
    input.targetDeviceId,
    input.portOnThisDevice,
    input.portOnPeer,
    input.linkType,
  );
}

async function disconnectPort(connectionId: string) {
  "use server";
  await deleteConnection(connectionId);
}

const statusVariants: Record<DeviceStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "outline",
  maintenance: "secondary",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [device, sites, subnets, vendors, deviceModels, otherDevices] =
    await Promise.all([
      prisma.device.findUnique({
        where: { id },
        include: {
          site: true,
          subnet: true,
          vendor: true,
          deviceModel: true,
          connectionsA: { include: { deviceB: true } },
          connectionsB: { include: { deviceA: true } },
        },
      }),
      prisma.site.findMany({ orderBy: { name: "asc" } }),
      prisma.subnet.findMany({ orderBy: { name: "asc" } }),
      prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      prisma.deviceModel.findMany({ orderBy: { name: "asc" } }),
      prisma.device.findMany({
        where: { id: { not: id } },
        orderBy: { hostname: "asc" },
        select: { id: true, hostname: true },
      }),
    ]);

  if (!device) notFound();

  const connections = [
    ...device.connectionsA.map((c) => ({
      id: c.id,
      peer: c.deviceB,
      linkType: c.linkType,
      label: c.label,
      portOnThisDevice: c.portA,
      portOnPeer: c.portB,
    })),
    ...device.connectionsB.map((c) => ({
      id: c.id,
      peer: c.deviceA,
      linkType: c.linkType,
      label: c.label,
      portOnThisDevice: c.portB,
      portOnPeer: c.portA,
    })),
  ];

  const TypeIcon = deviceTypeIcons[device.type];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/devices"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Devices
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {device.hostname}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={statusVariants[device.status]}>
              {device.status}
            </Badge>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TypeIcon className="size-4" />
              {typeLabels[device.type]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <DeviceFormDialog
            device={device}
            sites={sites}
            subnets={subnets}
            vendors={vendors}
            deviceModels={deviceModels}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <DeleteButton
            action={deleteDevice.bind(null, device.id)}
            confirmMessage={`Delete device "${device.hostname}"?`}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="IP Address" value={device.ipAddress} />
          <Field label="MAC Address" value={device.macAddress} />
          <Field label="Vendor" value={device.vendor?.name} />
          <Field label="Model" value={device.deviceModel?.name} />
          <Field label="Serial Number" value={device.serialNumber} />
          <Field label="Owner" value={device.owner} />
          <Field
            label="Site"
            value={
              device.site ? (
                <Link href="/sites" className="hover:underline">
                  {device.site.name}
                </Link>
              ) : null
            }
          />
          <Field
            label="Subnet"
            value={
              device.subnet ? (
                <Link
                  href={`/subnets/${device.subnet.id}`}
                  className="hover:underline"
                >
                  {device.subnet.name} ({device.subnet.cidr})
                </Link>
              ) : null
            }
          />
        </CardContent>
        {device.notes && (
          <CardContent className="border-t pt-4">
            <span className="text-xs text-muted-foreground">Notes</span>
            <p className="mt-1 text-sm whitespace-pre-wrap">{device.notes}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ports</CardTitle>
        </CardHeader>
        <CardContent>
          <PortPanel
            portCount={device.portCount}
            connections={connections.map((c) => ({
              id: c.id,
              portOnThisDevice: c.portOnThisDevice,
              peerId: c.peer.id,
              peerHostname: c.peer.hostname,
              portOnPeer: c.portOnPeer,
              linkType: c.linkType,
              label: c.label,
            }))}
            otherDevices={otherDevices}
            onConnect={connectPort.bind(null, device.id)}
            onDisconnect={disconnectPort}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No connections yet. Add them from the{" "}
              <Link href="/topology" className="hover:underline">
                topology view
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {connections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <Link
                    href={`/devices/${c.peer.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.peer.hostname}
                  </Link>
                  <span className="text-muted-foreground">
                    {c.linkType}
                    {c.label ? ` · ${c.label}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
