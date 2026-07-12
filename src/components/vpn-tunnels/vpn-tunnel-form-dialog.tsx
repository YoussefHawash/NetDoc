"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createVpnTunnel, updateVpnTunnel } from "@/lib/actions/vpn-tunnels";
import { initialFormState } from "@/lib/actions/types";
import { VpnTunnelType, DeviceStatus } from "@/generated/prisma/enums";
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

type VpnTunnel = {
  id: string;
  name: string;
  tunnelType: VpnTunnelType;
  status: DeviceStatus;
  localEndpoint: string | null;
  remoteEndpoint: string | null;
  encryption: string | null;
  notes: string | null;
  localSiteId: string | null;
  remoteSiteId: string | null;
  deviceId: string | null;
};

const tunnelTypeLabels: Record<VpnTunnelType, string> = {
  siteToSite: "Site-to-Site",
  remoteAccess: "Remote Access",
  other: "Other",
};

export function VpnTunnelFormDialog({
  tunnel,
  sites,
  devices,
  trigger,
}: {
  tunnel?: VpnTunnel;
  sites: { id: string; name: string }[];
  devices: { id: string; hostname: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = tunnel ? updateVpnTunnel.bind(null, tunnel.id) : createVpnTunnel;
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
        toast.success(tunnel ? "VPN tunnel updated" : "VPN tunnel created");
        setOpen(false);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, tunnel]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tunnel ? "Edit VPN Tunnel" : "Add VPN Tunnel"}</DialogTitle>
        </DialogHeader>
        <form
          id="vpn-tunnel-form"
          action={formAction}
          className="grid max-h-[70vh] grid-cols-2 gap-4 overflow-y-auto px-1"
        >
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="HQ-Branch Site-to-Site"
              defaultValue={tunnel?.name}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tunnelType">Type</Label>
            <Select
              name="tunnelType"
              defaultValue={tunnel?.tunnelType ?? VpnTunnelType.siteToSite}
            >
              <SelectTrigger id="tunnelType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VpnTunnelType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {tunnelTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={tunnel?.status ?? DeviceStatus.active}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DeviceStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="localEndpoint">Local Endpoint</Label>
            <Input
              id="localEndpoint"
              name="localEndpoint"
              placeholder="203.0.113.1"
              defaultValue={tunnel?.localEndpoint ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remoteEndpoint">Remote Endpoint</Label>
            <Input
              id="remoteEndpoint"
              name="remoteEndpoint"
              placeholder="198.51.100.1"
              defaultValue={tunnel?.remoteEndpoint ?? ""}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="encryption">Encryption</Label>
            <Input
              id="encryption"
              name="encryption"
              placeholder="IKEv2, AES256-SHA256"
              defaultValue={tunnel?.encryption ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="localSiteId">Local Site</Label>
            <Select name="localSiteId" defaultValue={tunnel?.localSiteId ?? ""}>
              <SelectTrigger id="localSiteId" className="w-full">
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
            <Label htmlFor="remoteSiteId">Remote Site</Label>
            <Select name="remoteSiteId" defaultValue={tunnel?.remoteSiteId ?? ""}>
              <SelectTrigger id="remoteSiteId" className="w-full">
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
            <Label htmlFor="deviceId">Terminating Device</Label>
            <Select name="deviceId" defaultValue={tunnel?.deviceId ?? ""}>
              <SelectTrigger id="deviceId" className="w-full">
                <SelectValue placeholder="No device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No device</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={tunnel?.notes ?? ""} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="vpn-tunnel-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
