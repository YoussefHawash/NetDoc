"use client";

import { useState } from "react";
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
  onSave,
  onDelete,
}: {
  connection: ConnectionData;
  deviceAHostname: string;
  deviceBHostname: string;
  onClose: () => void;
  onSave: (data: ConnectionData) => void;
  onDelete: () => void;
}) {
  const [linkType, setLinkType] = useState<LinkType>(connection.linkType);
  const [portA, setPortA] = useState(connection.portA ?? "");
  const [portB, setPortB] = useState(connection.portB ?? "");
  const [label, setLabel] = useState(connection.label ?? "");

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
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              id: connection.id,
              linkType,
              label: label || null,
              portA: portA || null,
              portB: portB || null,
            });
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="linkType">Link type</Label>
            <Select
              name="linkType"
              value={linkType}
              onValueChange={(v) => v && setLinkType(v as LinkType)}
            >
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
              <Input
                id="portA"
                value={portA}
                onChange={(e) => setPortA(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="portB">{deviceBHostname} port</Label>
              <Input
                id="portB"
                value={portB}
                onChange={(e) => setPortB(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!window.confirm("Remove this connection?")) return;
                onDelete();
              }}
            >
              Remove
            </Button>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
