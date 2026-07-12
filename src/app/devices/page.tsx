import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteDevice } from "@/lib/actions/devices";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeviceType, DeviceStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { deviceTypeIcons, deviceTypeLabels as typeLabels } from "@/lib/device-icons";

const statusVariants: Record<DeviceStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "outline",
  maintenance: "secondary",
};

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "";
  const status = params.status ?? "";

  const where: Prisma.DeviceWhereInput = {
    ...(q && {
      OR: [
        { hostname: { contains: q } },
        { ipAddress: { contains: q } },
      ],
    }),
    ...(type && { type: type as DeviceType }),
    ...(status && { status: status as DeviceStatus }),
  };

  const [devices, sites, subnets] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: { hostname: "asc" },
      include: { site: true, subnet: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <p className="text-sm text-muted-foreground">
            {devices.length} device{devices.length === 1 ? "" : "s"}
          </p>
        </div>
        <DeviceFormDialog
          sites={sites}
          subnets={subnets}
          trigger={<Button>Add Device</Button>}
        />
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          type="text"
          name="q"
          placeholder="Search hostname or IP…"
          defaultValue={q}
          className="h-9 min-w-48 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          name="type"
          defaultValue={type}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
        >
          <option value="">All types</option>
          {Object.values(DeviceType).map((t) => (
            <option key={t} value={t}>
              {typeLabels[t]}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
        >
          <option value="">All statuses</option>
          {Object.values(DeviceStatus).map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(q || type || status) && (
          <Button type="button" variant="ghost" render={<Link href="/devices" />}>
            Clear
          </Button>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Subnet</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No devices found.
                  </TableCell>
                </TableRow>
              )}
              {devices.map((device) => {
                const TypeIcon = deviceTypeIcons[device.type];
                return (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/devices/${device.id}`}
                      className="hover:underline"
                    >
                      {device.hostname}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <TypeIcon className="size-4 text-muted-foreground" />
                      {typeLabels[device.type]}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {device.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[device.status]}>
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.site?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.subnet?.name ?? "—"}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <DeviceFormDialog
                      device={device}
                      sites={sites}
                      subnets={subnets}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      action={deleteDevice.bind(null, device.id)}
                      confirmMessage={`Delete device "${device.hostname}"?`}
                    />
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
