"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createConnection, deleteConnection } from "@/lib/actions/connections";
import { LinkType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PortConnection = {
  id: string;
  portOnThisDevice: string | null;
  peerId: string;
  peerHostname: string;
  portOnPeer: string | null;
  linkType: LinkType;
  label: string | null;
};

export function PortPanel({
  deviceId,
  portCount,
  connections,
  otherDevices,
}: {
  deviceId: string;
  portCount: number;
  connections: PortConnection[];
  otherDevices: { id: string; hostname: string }[];
}) {
  const [connectPort, setConnectPort] = useState<number | null>(null);
  const [viewingConnectionId, setViewingConnectionId] = useState<string | null>(
    null,
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [theirPort, setTheirPort] = useState("");
  const [linkType, setLinkType] = useState<LinkType>(LinkType.copper);
  const [isPending, startTransition] = useTransition();

  const byPort = new Map(
    connections
      .filter((c) => c.portOnThisDevice)
      .map((c) => [c.portOnThisDevice as string, c]),
  );

  const viewingConnection = connections.find((c) => c.id === viewingConnectionId);

  function openConnectDialog(portNumber: number) {
    setSelectedDeviceId("");
    setTheirPort("");
    setLinkType(LinkType.copper);
    setConnectPort(portNumber);
  }

  function handleConnect() {
    if (!connectPort || !selectedDeviceId) return;
    startTransition(async () => {
      try {
        await createConnection(
          deviceId,
          selectedDeviceId,
          String(connectPort),
          theirPort || null,
          linkType,
        );
        toast.success(`Port ${connectPort} connected`);
        setConnectPort(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to connect");
      }
    });
  }

  function handleDisconnect(connectionId: string) {
    startTransition(async () => {
      try {
        await deleteConnection(connectionId);
        toast.success("Port disconnected");
        setViewingConnectionId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to disconnect");
      }
    });
  }

  if (portCount <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This device has no ports configured. Set a port count from the Edit
        dialog to see a port panel here.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
        {Array.from({ length: portCount }, (_, i) => i + 1).map((n) => {
          const connection = byPort.get(String(n));
          return (
            <button
              key={n}
              type="button"
              onClick={() =>
                connection
                  ? setViewingConnectionId(connection.id)
                  : openConnectDialog(n)
              }
              title={
                connection
                  ? `Port ${n} → ${connection.peerHostname}`
                  : `Port ${n} (unused)`
              }
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md border text-xs transition-colors",
                connection
                  ? "border-primary bg-primary/10 hover:bg-primary/20"
                  : "border-dashed text-muted-foreground hover:border-solid hover:bg-muted",
              )}
            >
              <span className="font-mono font-medium">{n}</span>
            </button>
          );
        })}
      </div>

      <Dialog
        open={connectPort !== null}
        onOpenChange={(o) => !o && setConnectPort(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Port {connectPort}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Device</Label>
              <Select
                value={selectedDeviceId}
                onValueChange={(v) => setSelectedDeviceId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {otherDevices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.hostname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Their port (optional)</Label>
              <Input
                value={theirPort}
                onChange={(e) => setTheirPort(e.target.value)}
                placeholder="e.g. Gi0/1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Link type</Label>
              <Select
                value={linkType}
                onValueChange={(v) => v && setLinkType(v as LinkType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LinkType).map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {lt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConnect}
              disabled={!selectedDeviceId || isPending}
            >
              {isPending ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewingConnectionId !== null}
        onOpenChange={(o) => !o && setViewingConnectionId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Port {viewingConnection?.portOnThisDevice}
            </DialogTitle>
          </DialogHeader>
          {viewingConnection && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Connected to
                </span>
                <Link
                  href={`/devices/${viewingConnection.peerId}`}
                  className="font-medium hover:underline"
                >
                  {viewingConnection.peerHostname}
                </Link>
              </div>
              {viewingConnection.portOnPeer && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Their port
                  </span>
                  <span className="text-sm">{viewingConnection.portOnPeer}</span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Link type</span>
                <span className="text-sm">{viewingConnection.linkType}</span>
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleDisconnect(viewingConnection.id)}
                >
                  {isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
