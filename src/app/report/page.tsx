import { prisma } from "@/lib/prisma";
import { parseCidr, buildAllocationTable, type IpOccupant } from "@/lib/subnet";
import { PrintButton } from "@/components/print-button";
import { StaticTopology } from "@/components/topology/static-topology";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ReportSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 break-inside-avoid">
      <h2 className="flex items-baseline gap-2 border-b pb-1.5 text-base font-semibold break-after-avoid">
        <span className="text-muted-foreground">{index}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ReportTable({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="text-xs [&_td]:whitespace-normal [&_th]:whitespace-normal">
        {children}
      </Table>
    </div>
  );
}

const reportHead = "bg-muted/60 [&_th]:h-8 [&_th]:font-semibold";
const reportBody = "[&_tr:nth-child(even)]:bg-muted/25 [&_td]:py-1.5";

const tunnelTypeLabels: Record<string, string> = {
  siteToSite: "Site-to-Site",
  remoteAccess: "Remote Access",
  other: "Other",
};

export default async function ReportPage() {
  const [devices, subnets, sites, connections, staticIps, ispIps, vlans, vpnTunnels] =
    await Promise.all([
      prisma.device.findMany({
        orderBy: { hostname: "asc" },
        include: { site: true, subnet: true, vendor: true, deviceModel: true },
      }),
      prisma.subnet.findMany({
        orderBy: { name: "asc" },
        include: { site: true, devices: true, staticIps: true },
      }),
      prisma.site.findMany({ orderBy: { name: "asc" } }),
      prisma.connection.findMany({
        include: { deviceA: true, deviceB: true },
      }),
      prisma.staticIp.findMany({
        orderBy: { ipAddress: "asc" },
        include: { site: true, subnet: true },
      }),
      prisma.ispIp.findMany({
        orderBy: { provider: "asc" },
        include: { site: true },
      }),
      prisma.vlan.findMany({
        orderBy: { vlanId: "asc" },
        include: { site: true },
      }),
      prisma.vpnTunnel.findMany({
        orderBy: { name: "asc" },
        include: { localSite: true, remoteSite: true, device: true },
      }),
    ]);

  const subnetsByVlanId = new Map<number, { name: string; cidr: string }[]>();
  for (const subnet of subnets) {
    if (subnet.vlanId == null) continue;
    const list = subnetsByVlanId.get(subnet.vlanId) ?? [];
    list.push(subnet);
    subnetsByVlanId.set(subnet.vlanId, list);
  }

  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  const subnetStats = subnets.map((subnet) => {
    const occupants: IpOccupant[] = [
      ...subnet.devices.map((d) => ({ ...d, kind: "device" as const })),
      ...subnet.staticIps.map((s) => ({
        id: s.id,
        hostname: s.hostname ?? s.ipAddress,
        ipAddress: s.ipAddress,
        kind: "staticIp" as const,
      })),
    ];
    let usableCount = 0;
    let usedCount = 0;
    let valid = true;
    try {
      const parsed = parseCidr(subnet.cidr);
      usableCount = parsed.usableCount;
      usedCount =
        usableCount <= 1024
          ? buildAllocationTable(subnet.cidr, occupants).filter((a) => a.used)
              .length
          : occupants.filter((o) => o.ipAddress).length;
    } catch {
      valid = false;
    }
    return { subnet, usableCount, usedCount, valid };
  });

  const summaryStats = [
    { label: "Sites", value: sites.length },
    { label: "Devices", value: devices.length },
    { label: "Subnets", value: subnets.length },
    { label: "Connections", value: connections.length },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 print:max-w-none">
      <header className="flex flex-col gap-4 border-b pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Network Documentation
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Network Documentation Report
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated {generatedAt}
            </p>
          </div>
          <PrintButton />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border bg-muted/30 px-3 py-2 text-center"
            >
              <p className="text-xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      <ReportSection index={1} title="Sites">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Devices</TableHead>
              <TableHead>Subnets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell className="font-medium">{site.name}</TableCell>
                <TableCell>{site.address ?? "—"}</TableCell>
                <TableCell>
                  {devices.filter((d) => d.siteId === site.id).length}
                </TableCell>
                <TableCell>
                  {subnets.filter((s) => s.siteId === site.id).length}
                </TableCell>
              </TableRow>
            ))}
            {sites.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No sites recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={2} title="Device Inventory">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>Hostname</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>MAC Address</TableHead>
              <TableHead>Vendor / Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Subnet</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell className="font-medium">{device.hostname}</TableCell>
                <TableCell>{device.type}</TableCell>
                <TableCell className="font-mono">{device.ipAddress ?? "—"}</TableCell>
                <TableCell className="font-mono">{device.macAddress ?? "—"}</TableCell>
                <TableCell>
                  {[device.vendor?.name, device.deviceModel?.name]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </TableCell>
                <TableCell>{device.status}</TableCell>
                <TableCell>{device.site?.name ?? "—"}</TableCell>
                <TableCell>{device.subnet?.name ?? "—"}</TableCell>
                <TableCell>{device.owner ?? "—"}</TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No devices recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={3} title="IP Address Management">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>Subnet</TableHead>
              <TableHead>CIDR</TableHead>
              <TableHead>VLAN</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {subnetStats.map(({ subnet, usableCount, usedCount, valid }) => (
              <TableRow key={subnet.id}>
                <TableCell className="font-medium">{subnet.name}</TableCell>
                <TableCell className="font-mono">{subnet.cidr}</TableCell>
                <TableCell>{subnet.vlanId ?? "—"}</TableCell>
                <TableCell>{subnet.site?.name ?? "—"}</TableCell>
                <TableCell>
                  {valid ? `${usedCount} / ${usableCount} used` : "Invalid CIDR"}
                </TableCell>
              </TableRow>
            ))}
            {subnets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No subnets recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={4} title="VLAN Registry">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>VLAN ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Subnets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {vlans.map((vlan) => {
              const matchingSubnets = subnetsByVlanId.get(vlan.vlanId) ?? [];
              return (
                <TableRow key={vlan.id}>
                  <TableCell className="font-mono">{vlan.vlanId}</TableCell>
                  <TableCell className="font-medium">{vlan.name}</TableCell>
                  <TableCell>{vlan.purpose ?? "—"}</TableCell>
                  <TableCell>{vlan.site?.name ?? "—"}</TableCell>
                  <TableCell>
                    {matchingSubnets.length > 0
                      ? matchingSubnets.map((s) => `${s.name} (${s.cidr})`).join(", ")
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {vlans.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No VLANs recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={5} title="Static IP Reservations">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>IP Address</TableHead>
              <TableHead>Hostname / Purpose</TableHead>
              <TableHead>MAC Address</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Subnet</TableHead>
              <TableHead>Site</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {staticIps.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono">{entry.ipAddress}</TableCell>
                <TableCell>{entry.hostname ?? "—"}</TableCell>
                <TableCell className="font-mono">{entry.macAddress ?? "—"}</TableCell>
                <TableCell>{entry.assignedTo ?? "—"}</TableCell>
                <TableCell>
                  {entry.subnet ? `${entry.subnet.name} (${entry.subnet.cidr})` : "—"}
                </TableCell>
                <TableCell>{entry.site?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
            {staticIps.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No static IP reservations recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={6} title="ISP / WAN Connections">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Public IP / Block</TableHead>
              <TableHead>Circuit ID</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>DNS</TableHead>
              <TableHead>Site</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {ispIps.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.provider}</TableCell>
                <TableCell className="font-mono">{entry.ipAddress}</TableCell>
                <TableCell>{entry.circuitId ?? "—"}</TableCell>
                <TableCell className="font-mono">{entry.gateway ?? "—"}</TableCell>
                <TableCell className="font-mono">{entry.dns ?? "—"}</TableCell>
                <TableCell>{entry.site?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
            {ispIps.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No ISP IPs recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={7} title="VPN Tunnels">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Remote</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {vpnTunnels.map((tunnel) => (
              <TableRow key={tunnel.id}>
                <TableCell className="font-medium">{tunnel.name}</TableCell>
                <TableCell>{tunnelTypeLabels[tunnel.tunnelType]}</TableCell>
                <TableCell>{tunnel.status}</TableCell>
                <TableCell>
                  {[tunnel.localSite?.name, tunnel.localEndpoint]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell>
                  {[tunnel.remoteSite?.name, tunnel.remoteEndpoint]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell>{tunnel.device?.hostname ?? "—"}</TableCell>
              </TableRow>
            ))}
            {vpnTunnels.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No VPN tunnels recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={8} title="Network Connections">
        <ReportTable>
          <TableHeader className={reportHead}>
            <TableRow>
              <TableHead>Device A</TableHead>
              <TableHead>Device B</TableHead>
              <TableHead>Link Type</TableHead>
              <TableHead>Label</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={reportBody}>
            {connections.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.deviceA.hostname}</TableCell>
                <TableCell>{c.deviceB.hostname}</TableCell>
                <TableCell>{c.linkType}</TableCell>
                <TableCell>{c.label ?? "—"}</TableCell>
              </TableRow>
            ))}
            {connections.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No connections recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReportTable>
      </ReportSection>

      <ReportSection index={9} title="Topology Diagram">
        <StaticTopology devices={devices} connections={connections} />
      </ReportSection>
    </div>
  );
}
