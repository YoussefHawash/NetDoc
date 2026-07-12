"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createDevice, updateDevice } from "@/lib/actions/devices";
import { initialFormState } from "@/lib/actions/types";
import { DeviceType, DeviceStatus } from "@/generated/prisma/enums";
import { deviceTypeIcons, deviceTypeLabels as typeLabels } from "@/lib/device-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Device = {
  id: string;
  hostname: string;
  ipAddress: string | null;
  macAddress: string | null;
  type: DeviceType;
  vendor: string | null;
  model: string | null;
  serialNumber: string | null;
  os: string | null;
  status: DeviceStatus;
  owner: string | null;
  notes: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  siteId: string | null;
  subnetId: string | null;
};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

const statusLabels: Record<DeviceStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
};

export function DeviceFormDialog({
  device,
  sites,
  subnets,
  trigger,
  defaultSubnetId,
  defaultIpAddress,
}: {
  device?: Device;
  sites: { id: string; name: string }[];
  subnets: { id: string; name: string; cidr: string }[];
  trigger: React.ReactNode;
  defaultSubnetId?: string;
  defaultIpAddress?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = device ? updateDevice.bind(null, device.id) : createDevice;
  const [state, formAction, isPending] = useActionState(
    action,
    initialFormState,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) {
        toast.error(state.error);
      } else {
        toast.success(device ? "Device updated" : "Device created");
        setOpen(false);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, device]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{device ? "Edit Device" : "Add Device"}</DialogTitle>
        </DialogHeader>
        <form
          id="device-form"
          action={formAction}
          className="grid max-h-[70vh] grid-cols-2 gap-4 overflow-y-auto px-1"
        >
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              name="hostname"
              defaultValue={device?.hostname}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ipAddress">IP Address</Label>
            <Input
              id="ipAddress"
              name="ipAddress"
              placeholder="10.0.0.1"
              defaultValue={device?.ipAddress ?? defaultIpAddress ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="macAddress">MAC Address</Label>
            <Input
              id="macAddress"
              name="macAddress"
              placeholder="00:1A:2B:3C:4D:5E"
              defaultValue={device?.macAddress ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={device?.type ?? DeviceType.other}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DeviceType).map((type) => {
                  const TypeIcon = deviceTypeIcons[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <TypeIcon className="size-4 text-muted-foreground" />
                      {typeLabels[type]}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              defaultValue={device?.status ?? DeviceStatus.active}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DeviceStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" name="vendor" defaultValue={device?.vendor ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" defaultValue={device?.model ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              defaultValue={device?.serialNumber ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="os">OS</Label>
            <Input id="os" name="os" defaultValue={device?.os ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner">Owner</Label>
            <Input id="owner" name="owner" defaultValue={device?.owner ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subnetId">Subnet</Label>
            <Select
              name="subnetId"
              defaultValue={device?.subnetId ?? defaultSubnetId ?? ""}
            >
              <SelectTrigger id="subnetId" className="w-full">
                <SelectValue placeholder="No subnet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No subnet</SelectItem>
                {subnets.map((subnet) => (
                  <SelectItem key={subnet.id} value={subnet.id}>
                    {subnet.name} ({subnet.cidr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteId">Site</Label>
            <Select name="siteId" defaultValue={device?.siteId ?? ""}>
              <SelectTrigger id="siteId" className="w-full">
                <SelectValue placeholder="No site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No site</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              defaultValue={toDateInputValue(device?.purchaseDate ?? null)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
            <Input
              id="warrantyExpiry"
              name="warrantyExpiry"
              type="date"
              defaultValue={toDateInputValue(device?.warrantyExpiry ?? null)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={device?.notes ?? ""} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="device-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
