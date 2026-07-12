import { prisma } from "@/lib/prisma";
import { deleteVlan } from "@/lib/actions/vlans";
import { IpSectionNav } from "@/components/subnets/ip-section-nav";
import { VlanFormDialog } from "@/components/vlans/vlan-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function VlansPage() {
  const [vlans, sites, subnets] = await Promise.all([
    prisma.vlan.findMany({
      orderBy: { vlanId: "asc" },
      include: { site: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ select: { id: true, name: true, cidr: true, vlanId: true } }),
  ]);

  const subnetsByVlanId = new Map<number, { id: string; name: string; cidr: string }[]>();
  for (const subnet of subnets) {
    if (subnet.vlanId == null) continue;
    const list = subnetsByVlanId.get(subnet.vlanId) ?? [];
    list.push(subnet);
    subnetsByVlanId.set(subnet.vlanId, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <IpSectionNav active="vlans" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VLANs</h1>
          <p className="text-sm text-muted-foreground">
            Registry of VLANs across your network, independent of any single
            subnet.
          </p>
        </div>
        <VlanFormDialog sites={sites} trigger={<Button>Add VLAN</Button>} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VLAN ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Subnets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vlans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No VLANs recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {vlans.map((vlan) => {
                const matchingSubnets = subnetsByVlanId.get(vlan.vlanId) ?? [];
                return (
                  <TableRow key={vlan.id}>
                    <TableCell className="font-mono text-sm">{vlan.vlanId}</TableCell>
                    <TableCell className="font-medium">{vlan.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {vlan.purpose ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vlan.site?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {matchingSubnets.length > 0
                        ? matchingSubnets.map((s) => `${s.name} (${s.cidr})`).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <VlanFormDialog
                        vlan={vlan}
                        sites={sites}
                        trigger={
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteButton
                        action={deleteVlan.bind(null, vlan.id)}
                        confirmMessage={`Delete VLAN ${vlan.vlanId} "${vlan.name}"?`}
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
