"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createSubnet, updateSubnet } from "@/lib/actions/subnets";
import { initialFormState } from "@/lib/actions/types";
import { selectItems } from "@/lib/utils";
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

type Subnet = {
  id: string;
  name: string;
  cidr: string;
  vlanId: number | null;
  description: string | null;
  siteId: string | null;
};

export function SubnetFormDialog({
  subnet,
  sites,
  trigger,
}: {
  subnet?: Subnet;
  sites: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = subnet ? updateSubnet.bind(null, subnet.id) : createSubnet;
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
        toast.success(subnet ? "Subnet updated" : "Subnet created");
        setOpen(false);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, subnet]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subnet ? "Edit Subnet" : "Add Subnet"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={subnet?.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cidr">CIDR</Label>
            <Input
              id="cidr"
              name="cidr"
              placeholder="192.168.1.0/24"
              defaultValue={subnet?.cidr}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vlanId">VLAN ID</Label>
            <Input
              id="vlanId"
              name="vlanId"
              type="number"
              min={1}
              defaultValue={subnet?.vlanId ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteId">Site</Label>
            <Select
              name="siteId"
              defaultValue={subnet?.siteId ?? ""}
              items={selectItems([
                { value: "", label: "No site" },
                ...sites.map((s) => ({ value: s.id, label: s.name })),
              ])}
            >
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={subnet?.description ?? ""}
            />
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
