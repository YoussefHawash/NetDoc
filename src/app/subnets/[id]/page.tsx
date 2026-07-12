import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseCidr, buildAllocationTable } from "@/lib/subnet";
import { deleteSubnet } from "@/lib/actions/subnets";
import { SubnetFormDialog } from "@/components/subnets/subnet-form-dialog";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SubnetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [subnet, sites, subnets, vendors, deviceModels] = await Promise.all([
    prisma.subnet.findUnique({
      where: { id },
      include: { site: true, devices: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.deviceModel.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!subnet) notFound();

  let parsed;
  let allocations: ReturnType<typeof buildAllocationTable> = [];
  let parseError: string | null = null;
  try {
    parsed = parseCidr(subnet.cidr);
    // Enumerating every address only makes sense for reasonably sized subnets;
    // larger ones fall back to listing assigned devices directly (see below).
    if (parsed.usableCount <= 1024) {
      allocations = buildAllocationTable(subnet.cidr, subnet.devices);
    }
  } catch (err) {
    parseError = err instanceof Error ? err.message : "Invalid CIDR";
  }

  const assignedDevices = subnet.devices.filter((d) => d.ipAddress);
  const usedCount =
    parsed && parsed.usableCount <= 1024
      ? allocations.filter((a) => a.used).length
      : assignedDevices.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/subnets"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Subnets
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {subnet.name}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {subnet.cidr}
            {subnet.vlanId ? ` · VLAN ${subnet.vlanId}` : ""}
            {subnet.site ? ` · ${subnet.site.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <SubnetFormDialog
            subnet={subnet}
            sites={sites}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <DeleteButton
            action={deleteSubnet.bind(null, subnet.id)}
            confirmMessage={`Delete subnet "${subnet.name}"?`}
          />
        </div>
      </div>

      {parseError ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {parseError}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Utilization</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Network</p>
                <p className="font-mono text-sm">{parsed!.networkAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Broadcast</p>
                <p className="font-mono text-sm">{parsed!.broadcastAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Usable range</p>
                <p className="font-mono text-sm">
                  {parsed!.firstUsable} – {parsed!.lastUsable}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Used</p>
                <p className="text-sm">
                  {usedCount} / {parsed!.usableCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>IP Allocation</CardTitle>
            </CardHeader>
            {parsed!.usableCount > 1024 ? (
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  This subnet has {parsed!.usableCount} usable addresses — too
                  many to list individually. Showing assigned devices only.
                </p>
                {assignedDevices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="font-mono">{d.ipAddress}</span>
                    <Link href={`/devices/${d.id}`} className="hover:underline">
                      {d.hostname}
                    </Link>
                  </div>
                ))}
              </CardContent>
            ) : (
              <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {allocations.map((a) => (
                  <div
                    key={a.ip}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono">{a.ip}</span>
                      {a.hostname && (
                        <Link
                          href={`/devices/${a.deviceId}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {a.hostname}
                        </Link>
                      )}
                    </div>
                    {a.used ? (
                      <Badge variant="default">used</Badge>
                    ) : (
                      <DeviceFormDialog
                        sites={sites}
                        subnets={subnets}
                        vendors={vendors}
                        deviceModels={deviceModels}
                        defaultSubnetId={subnet.id}
                        defaultIpAddress={a.ip}
                        trigger={
                          <Button variant="outline" size="xs">
                            Assign
                          </Button>
                        }
                      />
                    )}
                  </div>
                ))}
                {allocations.length === 0 && (
                  <p className="col-span-full py-8 text-center text-muted-foreground">
                    This subnet has no usable host addresses.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
