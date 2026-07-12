import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  AutoTopology,
  type SiteSection,
  type SubnetGroup,
} from "@/components/topology/auto-topology";
import { Button } from "@/components/ui/button";

function ipSortKey(ip: string | null): number {
  if (!ip) return Number.MAX_SAFE_INTEGER;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    return Number.MAX_SAFE_INTEGER - 1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export default async function TopologyPage() {
  const [sites, subnets, devices, vlans] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
    prisma.device.findMany({
      orderBy: { hostname: "asc" },
      select: {
        id: true,
        hostname: true,
        ipAddress: true,
        status: true,
        subnetId: true,
      },
    }),
    prisma.vlan.findMany(),
  ]);

  const vlanNameByVlanId = new Map(vlans.map((v) => [v.vlanId, v.name]));

  const devicesBySubnetId = new Map<string, typeof devices>();
  const ungroupedDevices: typeof devices = [];
  for (const device of devices) {
    if (!device.subnetId) {
      ungroupedDevices.push(device);
      continue;
    }
    const list = devicesBySubnetId.get(device.subnetId) ?? [];
    list.push(device);
    devicesBySubnetId.set(device.subnetId, list);
  }
  for (const list of devicesBySubnetId.values()) {
    list.sort((a, b) => ipSortKey(a.ipAddress) - ipSortKey(b.ipAddress));
  }
  ungroupedDevices.sort((a, b) => a.hostname.localeCompare(b.hostname));

  const subnetGroupsBySiteId = new Map<string, SubnetGroup[]>();
  const noSiteSubnetGroups: SubnetGroup[] = [];

  for (const subnet of subnets) {
    const group: SubnetGroup = {
      id: subnet.id,
      name: subnet.name,
      cidr: subnet.cidr,
      vlanLabel: subnet.vlanId
        ? `VLAN ${subnet.vlanId}${vlanNameByVlanId.has(subnet.vlanId) ? ` (${vlanNameByVlanId.get(subnet.vlanId)})` : ""}`
        : null,
      devices: devicesBySubnetId.get(subnet.id) ?? [],
    };
    if (subnet.siteId) {
      const list = subnetGroupsBySiteId.get(subnet.siteId) ?? [];
      list.push(group);
      subnetGroupsBySiteId.set(subnet.siteId, list);
    } else {
      noSiteSubnetGroups.push(group);
    }
  }

  const siteSections: SiteSection[] = [
    ...sites.map((site) => ({
      id: site.id,
      name: site.name,
      subnetGroups: subnetGroupsBySiteId.get(site.id) ?? [],
    })),
    ...(noSiteSubnetGroups.length > 0
      ? [{ id: "no-site", name: "No Site", subnetGroups: noSiteSubnetGroups }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Topology</h1>
          <p className="text-sm text-muted-foreground">
            Auto-generated from your sites, subnets, VLANs, and device IPs —
            nothing to drag or connect manually.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/topology/manual" />}>
          Physical Connections View
        </Button>
      </div>

      <AutoTopology sites={siteSections} ungroupedDevices={ungroupedDevices} />
    </div>
  );
}
