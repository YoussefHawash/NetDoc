import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseCidr } from "@/lib/subnet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceStatus } from "@/generated/prisma/enums";

const statusVariants: Record<DeviceStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "outline",
  maintenance: "secondary",
};

export default async function DashboardPage() {
  const [deviceCount, subnetCount, siteCount, connectionCount, statusGroups, subnets, recentDevices] =
    await Promise.all([
      prisma.device.count(),
      prisma.subnet.count(),
      prisma.site.count(),
      prisma.connection.count(),
      prisma.device.groupBy({ by: ["status"], _count: true }),
      prisma.subnet.findMany({
        include: { devices: { select: { ipAddress: true } } },
      }),
      prisma.device.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { site: true },
      }),
    ]);

  const statusCounts: Record<DeviceStatus, number> = {
    active: 0,
    inactive: 0,
    maintenance: 0,
  };
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count;
  }

  let totalUsable = 0;
  let totalUsed = 0;
  for (const subnet of subnets) {
    try {
      const parsed = parseCidr(subnet.cidr);
      totalUsable += parsed.usableCount;
      totalUsed += subnet.devices.filter((d) => d.ipAddress).length;
    } catch {
      // skip subnets with invalid CIDR
    }
  }
  const utilizationPct = totalUsable > 0 ? Math.round((totalUsed / totalUsable) * 100) : 0;

  const stats = [
    { label: "Devices", value: deviceCount, href: "/devices" },
    { label: "Subnets", value: subnetCount, href: "/subnets" },
    { label: "Sites", value: siteCount, href: "/sites" },
    { label: "Connections", value: connectionCount, href: "/topology" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your network documentation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(Object.keys(statusCounts) as DeviceStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <Badge variant={statusVariants[status]}>{status}</Badge>
                <span>{statusCounts[status]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IP utilization</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {totalUsed} / {totalUsable} addresses used across all subnets (
              {utilizationPct}%)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently updated devices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentDevices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No devices yet.{" "}
              <Link href="/devices" className="hover:underline">
                Add your first device
              </Link>
              .
            </p>
          )}
          {recentDevices.map((device) => (
            <Link
              key={device.id}
              href={`/devices/${device.id}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <span className="font-medium">{device.hostname}</span>
              <span className="text-muted-foreground">
                {device.site?.name ?? "—"}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
