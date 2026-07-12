"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createDevice, updateDevice } from "@/lib/actions/devices";
import { initialFormState } from "@/lib/actions/types";
import { findSubnetForIp } from "@/lib/subnet";
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
  vendorId: string | null;
  deviceModelId: string | null;
  serialNumber: string | null;
  status: DeviceStatus;
  owner: string | null;
  notes: string | null;
  portCount: number;
  siteId: string | null;
  subnetId: string | null;
};

const statusLabels: Record<DeviceStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
};

export function DeviceFormDialog({
  device,
  sites,
  subnets,
  vendors,
  deviceModels,
  trigger,
  defaultSubnetId,
  defaultIpAddress,
}: {
  device?: Device;
  sites: { id: string; name: string }[];
  subnets: { id: string; name: string; cidr: string }[];
  vendors: { id: string; name: string }[];
  deviceModels: { id: string; name: string }[];
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
  const [subnetId, setSubnetId] = useState(
    device?.subnetId ?? defaultSubnetId ?? "",
  );
  const subnetManuallySet = useRef(false);

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
              onChange={(e) => {
                if (subnetManuallySet.current) return;
                const match = findSubnetForIp(e.target.value.trim(), subnets);
                if (match) setSubnetId(match.id);
              }}
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
            <Label htmlFor="vendorId">Vendor</Label>
            <Select name="vendorId" defaultValue={device?.vendorId ?? ""}>
              <SelectTrigger id="vendorId" className="w-full">
                <SelectValue placeholder="No vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No vendor</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deviceModelId">Model</Label>
            <Select
              name="deviceModelId"
              defaultValue={device?.deviceModelId ?? ""}
            >
              <SelectTrigger id="deviceModelId" className="w-full">
                <SelectValue placeholder="No model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No model</SelectItem>
                {deviceModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="owner">Owner</Label>
            <Input id="owner" name="owner" defaultValue={device?.owner ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="portCount">Port Count</Label>
            <Input
              id="portCount"
              name="portCount"
              type="number"
              min={0}
              max={512}
              defaultValue={device?.portCount ?? 0}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subnetId">
              Subnet{" "}
              <span className="font-normal text-muted-foreground">
                (auto-detected from IP)
              </span>
            </Label>
            <Select
              name="subnetId"
              value={subnetId}
              onValueChange={(v) => {
                subnetManuallySet.current = true;
                setSubnetId(v ?? "");
              }}
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
