import { prisma } from "@/lib/prisma";
import { IpSectionNav } from "@/components/subnets/ip-section-nav";
import { ImportForm } from "@/components/subnets/import-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ImportStaticIpsPage() {
  const [sites, subnets] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <IpSectionNav active="subnets" />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import Discovered Hosts
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV from{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            scripts/discover.py
          </code>{" "}
          (or any CSV with the same columns) to see how full a subnet is.
          This only fills in Static IPs — it does not create devices or
          appear in the topology diagram.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportForm sites={sites} subnets={subnets} />
        </CardContent>
      </Card>
    </div>
  );
}
