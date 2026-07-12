import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportForm } from "@/components/devices/import-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ImportDevicesPage() {
  const [sites, subnets] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.subnet.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/devices"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Devices
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Import Devices
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of discovered hosts (e.g. from{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            scripts/discover.py
          </code>
          ) to bulk-create or update devices.
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
