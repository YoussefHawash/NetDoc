"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createVlan, updateVlan } from "@/lib/actions/vlans";
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

type Vlan = {
  id: string;
  vlanId: number;
  name: string;
  purpose: string | null;
  notes: string | null;
  siteId: string | null;
};

export function VlanFormDialog({
  vlan,
  sites,
  trigger,
}: {
  vlan?: Vlan;
  sites: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = vlan ? updateVlan.bind(null, vlan.id) : createVlan;
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
        toast.success(vlan ? "VLAN updated" : "VLAN created");
        setOpen(false);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, vlan]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vlan ? "Edit VLAN" : "Add VLAN"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vlanId">VLAN ID</Label>
            <Input
              id="vlanId"
              name="vlanId"
              type="number"
              min={1}
              max={4094}
              defaultValue={vlan?.vlanId}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Servers"
              defaultValue={vlan?.name}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              name="purpose"
              placeholder="Core server segment"
              defaultValue={vlan?.purpose ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteId">Site</Label>
            <Select name="siteId" defaultValue={vlan?.siteId ?? ""}>
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
            <Textarea id="notes" name="notes" defaultValue={vlan?.notes ?? ""} />
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
