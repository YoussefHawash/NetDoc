"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createStaticIp, updateStaticIp } from "@/lib/actions/static-ips";
import { initialFormState } from "@/lib/actions/types";
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

type StaticIp = {
  id: string;
  ipAddress: string;
  hostname: string | null;
  macAddress: string | null;
  assignedTo: string | null;
  notes: string | null;
  siteId: string | null;
  subnetId: string | null;
};

export function StaticIpFormDialog({
  staticIp,
  sites,
  subnets,
  trigger,
}: {
  staticIp?: StaticIp;
  sites: { id: string; name: string }[];
  subnets: { id: string; name: string; cidr: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = staticIp
    ? updateStaticIp.bind(null, staticIp.id)
    : createStaticIp;
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
        toast.success(staticIp ? "Static IP updated" : "Static IP created");
        setOpen(false);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, staticIp]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staticIp ? "Edit Static IP" : "Add Static IP"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ipAddress">IP Address</Label>
            <Input
              id="ipAddress"
              name="ipAddress"
              placeholder="10.0.0.50"
              defaultValue={staticIp?.ipAddress}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hostname">Hostname / Purpose</Label>
            <Input
              id="hostname"
              name="hostname"
              placeholder="Reserved for HA firewall pair"
              defaultValue={staticIp?.hostname ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="macAddress">MAC Address</Label>
            <Input
              id="macAddress"
              name="macAddress"
              defaultValue={staticIp?.macAddress ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              name="assignedTo"
              placeholder="Person, team, or system"
              defaultValue={staticIp?.assignedTo ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subnetId">Subnet</Label>
            <Select
              name="subnetId"
              defaultValue={staticIp?.subnetId ?? ""}
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
            <Select name="siteId" defaultValue={staticIp?.siteId ?? ""}>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={staticIp?.notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
