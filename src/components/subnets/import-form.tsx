"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { importStaticIps } from "@/lib/actions/import-static-ips";
import { initialImportState } from "@/lib/actions/types";
import { selectItems } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ImportForm({
  sites,
  subnets,
}: {
  sites: { id: string; name: string }[];
  subnets: { id: string; name: string; cidr: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    importStaticIps,
    initialImportState,
  );
  const wasPending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) {
        toast.error(state.error);
      } else if (state.summary) {
        toast.success(`Import complete: ${state.summary}`);
        formRef.current?.reset();
      }
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">CSV file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          Columns: hostname, ipAddress, macAddress, vendor. Creates/updates
          Static IP entries only (matched by IP) so you can see how full a
          subnet is — it does not touch your device inventory or topology
          diagram.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subnetId">Subnet</Label>
        <Select
          name="subnetId"
          defaultValue=""
          items={selectItems([
            { value: "", label: "No subnet" },
            ...subnets.map((s) => ({ value: s.id, label: `${s.name} (${s.cidr})` })),
          ])}
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
        <Label htmlFor="siteId">Site (optional)</Label>
        <Select
          name="siteId"
          defaultValue=""
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
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Importing…" : "Import"}
      </Button>
    </form>
  );
}
