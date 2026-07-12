"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updateConnection, deleteConnection } from "@/lib/actions/connections";
import { initialFormState } from "@/lib/actions/types";
import { LinkType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ConnectionData = {
  id: string;
  linkType: LinkType;
  label: string | null;
  portA: string | null;
  portB: string | null;
};

export function ConnectionPanel({
  connection,
  deviceAHostname,
  deviceBHostname,
  onClose,
  onUpdated,
  onDeleted,
}: {
  connection: ConnectionData;
  deviceAHostname: string;
  deviceBHostname: string;
  onClose: () => void;
  onUpdated: (data: ConnectionData) => void;
  onDeleted: () => void;
}) {
  const boundAction = updateConnection.bind(null, connection.id);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState,
  );
  const wasPending = useRef(false);
  const pendingValues = useRef<ConnectionData>(connection);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) {
        toast.error(state.error);
      } else {
        toast.success("Connection updated");
        onUpdated(pendingValues.current);
      }
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  return (
    <Card className="w-72 shadow-lg">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">
          {deviceAHostname} ↔ {deviceBHostname}
        </CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          ×
        </Button>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          onSubmit={(e) => {
            const form = e.currentTarget;
            const data = new FormData(form);
            pendingValues.current = {
              id: connection.id,
              linkType: (data.get("linkType") as LinkType) ?? LinkType.copper,
              label: (data.get("label") as string) || null,
              portA: (data.get("portA") as string) || null,
              portB: (data.get("portB") as string) || null,
            };
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="linkType">Link type</Label>
            <Select name="linkType" defaultValue={connection.linkType}>
              <SelectTrigger id="linkType" className="w-full">
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
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="portA">{deviceAHostname} port</Label>
              <Input id="portA" name="portA" defaultValue={connection.portA ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="portB">{deviceBHostname} port</Label>
              <Input id="portB" name="portB" defaultValue={connection.portB ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" defaultValue={connection.label ?? ""} />
          </div>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm("Delete this connection?")) return;
                setDeleting(true);
                try {
                  await deleteConnection(connection.id);
                  toast.success("Connection deleted");
                  onDeleted();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Failed to delete",
                  );
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
