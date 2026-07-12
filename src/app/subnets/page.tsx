import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteSubnet } from "@/lib/actions/subnets";
import { parseCidr, buildAllocationTable, type IpOccupant } from "@/lib/subnet";
import { SubnetFormDialog } from "@/components/subnets/subnet-form-dialog";
import { IpSectionNav } from "@/components/subnets/ip-section-nav";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function SubnetsPage() {
  const [subnets, sites] = await Promise.all([
    prisma.subnet.findMany({
      orderBy: { name: "asc" },
      include: {
        site: true,
        devices: { select: { id: true, hostname: true, ipAddress: true } },
        staticIps: { select: { id: true, hostname: true, ipAddress: true } },
      },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <IpSectionNav active="subnets" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subnets</h1>
          <p className="text-sm text-muted-foreground">
            {subnets.length} subnet{subnets.length === 1 ? "" : "s"}
          </p>
        </div>
        <SubnetFormDialog sites={sites} trigger={<Button>Add Subnet</Button>} />
      </div>

      {subnets.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No subnets yet. Add one to start tracking IP allocation.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {subnets.map((subnet) => {
          const occupants: IpOccupant[] = [
            ...subnet.devices.map((d) => ({ ...d, kind: "device" as const })),
            ...subnet.staticIps.map((s) => ({
              id: s.id,
              hostname: s.hostname ?? s.ipAddress,
              ipAddress: s.ipAddress,
              kind: "staticIp" as const,
            })),
          ];
          let usedCount = 0;
          let usableCount = 0;
          let parseError = false;
          try {
            const parsed = parseCidr(subnet.cidr);
            usableCount = parsed.usableCount;
            // Enumerating every address is only cheap for reasonably sized subnets.
            usedCount =
              usableCount <= 1024
                ? buildAllocationTable(subnet.cidr, occupants).filter((a) => a.used)
                    .length
                : occupants.filter((o) => o.ipAddress).length;
          } catch {
            parseError = true;
          }
          const pct = usableCount > 0 ? Math.round((usedCount / usableCount) * 100) : 0;

          return (
            <Card key={subnet.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <Link href={`/subnets/${subnet.id}`} className="hover:underline">
                    <p className="font-medium">{subnet.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {subnet.cidr}
                      {subnet.vlanId ? ` · VLAN ${subnet.vlanId}` : ""}
                    </p>
                  </Link>
                  <div className="flex gap-2">
                    <SubnetFormDialog
                      subnet={subnet}
                      sites={sites}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      action={deleteSubnet.bind(null, subnet.id)}
                      confirmMessage={`Delete subnet "${subnet.name}"? Devices keep their data but lose this subnet link.`}
                    />
                  </div>
                </div>

                {parseError ? (
                  <p className="text-sm text-destructive">Invalid CIDR</p>
                ) : (
                  <Link href={`/subnets/${subnet.id}`} className="flex flex-col gap-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {usedCount} / {usableCount} addresses used ({pct}%)
                      {subnet.site ? ` · ${subnet.site.name}` : ""}
                    </p>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
