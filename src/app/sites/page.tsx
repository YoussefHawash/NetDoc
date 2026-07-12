import { prisma } from "@/lib/prisma";
import { deleteSite } from "@/lib/actions/sites";
import { SiteFormDialog } from "@/components/sites/site-form-dialog";
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

export default async function SitesPage() {
  const sites = await prisma.site.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { devices: true, subnets: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
          <p className="text-sm text-muted-foreground">
            Physical or logical locations used to group devices and subnets.
          </p>
        </div>
        <SiteFormDialog trigger={<Button>Add Site</Button>} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Subnets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No sites yet. Add one to start organizing devices.
                  </TableCell>
                </TableRow>
              )}
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {site.address ?? "—"}
                  </TableCell>
                  <TableCell>{site._count.devices}</TableCell>
                  <TableCell>{site._count.subnets}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <SiteFormDialog
                      site={site}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      action={deleteSite.bind(null, site.id)}
                      confirmMessage={`Delete site "${site.name}"? Devices and subnets keep their data but lose this site link.`}
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
