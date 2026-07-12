import { prisma } from "@/lib/prisma";
import { deleteStaticIp } from "@/lib/actions/static-ips";
import { IpSectionNav } from "@/components/subnets/ip-section-nav";
import { StaticIpFormDialog } from "@/components/static-ips/static-ip-form-dialog";
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

export default async function StaticIpsPage() {
  const [staticIps, sites, subnets] = await Promise.all([
    prisma.staticIp.findMany({
      orderBy: { ipAddress: "asc" },
      include: { site: true, subnet: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <IpSectionNav active="static-ips" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Static IPs</h1>
          <p className="text-sm text-muted-foreground">
            Reserved or statically assigned addresses that aren&apos;t tied to
            a full device record.
          </p>
        </div>
        <StaticIpFormDialog
          sites={sites}
          subnets={subnets}
          trigger={<Button>Add Static IP</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Hostname / Purpose</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Subnet</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staticIps.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No static IPs recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {staticIps.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {entry.ipAddress}
                  </TableCell>
                  <TableCell>{entry.hostname ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.macAddress ?? "—"}
                  </TableCell>
                  <TableCell>{entry.assignedTo ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.subnet ? `${entry.subnet.name} (${entry.subnet.cidr})` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.site?.name ?? "—"}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <StaticIpFormDialog
                      staticIp={entry}
                      sites={sites}
                      subnets={subnets}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      action={deleteStaticIp.bind(null, entry.id)}
                      confirmMessage={`Delete static IP "${entry.ipAddress}"?`}
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
