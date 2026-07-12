import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteVpnTunnel } from "@/lib/actions/vpn-tunnels";
import { IpSectionNav } from "@/components/subnets/ip-section-nav";
import { VpnTunnelFormDialog } from "@/components/vpn-tunnels/vpn-tunnel-form-dialog";
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
import { DeviceStatus } from "@/generated/prisma/enums";

const statusVariants: Record<DeviceStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "outline",
  maintenance: "secondary",
};

const tunnelTypeLabels: Record<string, string> = {
  siteToSite: "Site-to-Site",
  remoteAccess: "Remote Access",
  other: "Other",
};

export default async function VpnTunnelsPage() {
  const [tunnels, sites, devices] = await Promise.all([
    prisma.vpnTunnel.findMany({
      orderBy: { name: "asc" },
      include: { localSite: true, remoteSite: true, device: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.device.findMany({ orderBy: { hostname: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <IpSectionNav active="vpn-tunnels" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VPN Tunnels</h1>
          <p className="text-sm text-muted-foreground">
            Site-to-site and remote-access VPN connections.
          </p>
        </div>
        <VpnTunnelFormDialog
          sites={sites}
          devices={devices}
          trigger={<Button>Add VPN Tunnel</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Remote</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tunnels.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No VPN tunnels recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {tunnels.map((tunnel) => (
                <TableRow key={tunnel.id}>
                  <TableCell className="font-medium">{tunnel.name}</TableCell>
                  <TableCell>{tunnelTypeLabels[tunnel.tunnelType]}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[tunnel.status]}>
                      {tunnel.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[tunnel.localSite?.name, tunnel.localEndpoint]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[tunnel.remoteSite?.name, tunnel.remoteEndpoint]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tunnel.device ? (
                      <Link
                        href={`/devices/${tunnel.device.id}`}
                        className="hover:underline"
                      >
                        {tunnel.device.hostname}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <VpnTunnelFormDialog
                      tunnel={tunnel}
                      sites={sites}
                      devices={devices}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      action={deleteVpnTunnel.bind(null, tunnel.id)}
                      confirmMessage={`Delete VPN tunnel "${tunnel.name}"?`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
