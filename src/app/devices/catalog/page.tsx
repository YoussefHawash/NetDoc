import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteVendor } from "@/lib/actions/vendors";
import { deleteDeviceModel } from "@/lib/actions/device-models";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { DeviceModelFormDialog } from "@/components/device-models/device-model-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DeviceCatalogPage() {
  const [vendors, deviceModels] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { devices: true } } },
    }),
    prisma.deviceModel.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { devices: true } } },
    }),
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
          Vendor &amp; Model Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the vendor and model options available when adding a device.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Vendors</CardTitle>
            <VendorFormDialog trigger={<Button size="sm">Add Vendor</Button>} />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {vendors.length === 0 && (
              <p className="text-sm text-muted-foreground">No vendors yet.</p>
            )}
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{vendor.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {vendor._count.devices} device
                    {vendor._count.devices === 1 ? "" : "s"}
                  </span>
                  <DeleteButton
                    action={deleteVendor.bind(null, vendor.id)}
                    confirmMessage={`Delete vendor "${vendor.name}"? Devices using it keep their data but lose this vendor link.`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Models</CardTitle>
            <DeviceModelFormDialog trigger={<Button size="sm">Add Model</Button>} />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {deviceModels.length === 0 && (
              <p className="text-sm text-muted-foreground">No models yet.</p>
            )}
            {deviceModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{model.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {model._count.devices} device
                    {model._count.devices === 1 ? "" : "s"}
                  </span>
                  <DeleteButton
                    action={deleteDeviceModel.bind(null, model.id)}
                    confirmMessage={`Delete model "${model.name}"? Devices using it keep their data but lose this model link.`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
