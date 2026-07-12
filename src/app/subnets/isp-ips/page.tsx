import { prisma } from "@/lib/prisma";
import { deleteIspIp } from "@/lib/actions/isp-ips";
import { IpSectionNav } from "@/components/subnets/ip-section-nav";
import { IspIpFormDialog } from "@/components/isp-ips/isp-ip-form-dialog";
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

export default async function IspIpsPage() {
  const [ispIps, sites] = await Promise.all([
    prisma.ispIp.findMany({
      orderBy: { provider: "asc" },
      include: { site: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <IpSectionNav active="isp-ips" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ISP IPs</h1>
          <p className="text-sm text-muted-foreground">
            Public IP addresses and circuit details assigned by your internet
            providers.
          </p>
        </div>
        <IspIpFormDialog sites={sites} trigger={<Button>Add ISP IP</Button>} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Public IP / Block</TableHead>
                <TableHead>Circuit ID</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>DNS</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ispIps.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No ISP IPs recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {ispIps.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.provider}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.ipAddress}
                  </TableCell>
                  <TableCell>{entry.circuitId ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.gateway ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.dns ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.site?.name ?? "—"}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <IspIpFormDialog
                      ispIp={entry}
                      sites={sites}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      action={deleteIspIp.bind(null, entry.id)}
                      confirmMessage={`Delete ISP IP for "${entry.provider}"?`}
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
