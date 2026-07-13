"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createIspIp, updateIspIp } from "@/lib/actions/isp-ips";
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

type IspIp = {
  id: string;
  provider: string;
  circuitId: string | null;
  ipAddress: string;
  gateway: string | null;
  dns: string | null;
  notes: string | null;
  siteId: string | null;
};

export function IspIpFormDialog({
  ispIp,
  sites,
  trigger,
}: {
  ispIp?: IspIp;
  sites: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = ispIp ? updateIspIp.bind(null, ispIp.id) : createIspIp;
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
        toast.success(ispIp ? "ISP IP updated" : "ISP IP created");
        setOpen(false);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, ispIp]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ispIp ? "Edit ISP IP" : "Add ISP IP"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              name="provider"
              placeholder="Comcast Business"
              defaultValue={ispIp?.provider}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ipAddress">Public IP / Block</Label>
            <Input
              id="ipAddress"
              name="ipAddress"
              placeholder="203.0.113.0/29"
              defaultValue={ispIp?.ipAddress}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="circuitId">Circuit / Account ID</Label>
            <Input
              id="circuitId"
              name="circuitId"
              defaultValue={ispIp?.circuitId ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gateway">Gateway</Label>
            <Input id="gateway" name="gateway" defaultValue={ispIp?.gateway ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dns">DNS Servers</Label>
            <Input
              id="dns"
              name="dns"
              placeholder="8.8.8.8, 8.8.4.4"
              defaultValue={ispIp?.dns ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteId">Site</Label>
            <Select
              name="siteId"
              defaultValue={ispIp?.siteId ?? ""}
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={ispIp?.notes ?? ""} />
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
