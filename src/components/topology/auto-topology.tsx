import Link from "next/link";
import { DeviceStatus } from "@/generated/prisma/enums";

export type DeviceInfo = {
  id: string;
  hostname: string;
  ipAddress: string | null;
  status: DeviceStatus;
};

export type SubnetGroup = {
  id: string;
  name: string;
  cidr: string;
  vlanLabel: string | null;
  devices: DeviceInfo[];
};

export type SiteSection = {
  id: string;
  name: string;
  subnetGroups: SubnetGroup[];
};

const statusColor: Record<DeviceStatus, string> = {
  active: "#10b981",
  inactive: "#a1a1aa",
  maintenance: "#f59e0b",
};

const NODE_WIDTH = 130;
const NODE_HEIGHT = 44;
const GAP_X = 18;
const GAP_Y = 34;
const HUB_RADIUS = 26;
const PER_ROW = 5;

function SubnetDiagram({ group }: { group: SubnetGroup }) {
  const count = group.devices.length;
  const cols = Math.max(1, Math.min(PER_ROW, count));
  const rows = Math.max(1, Math.ceil(count / PER_ROW));

  const width = Math.max(cols * (NODE_WIDTH + GAP_X) - GAP_X, NODE_WIDTH);
  const hubX = width / 2;
  const hubY = HUB_RADIUS + 4;
  const gridStartY = hubY + HUB_RADIUS + GAP_Y;
  const height = gridStartY + rows * (NODE_HEIGHT + GAP_Y);

  const positions = group.devices.map((device, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowCount = Math.min(cols, count - row * cols);
    const rowWidth = rowCount * (NODE_WIDTH + GAP_X) - GAP_X;
    const rowStartX = (width - rowWidth) / 2;
    return {
      device,
      x: rowStartX + col * (NODE_WIDTH + GAP_X),
      y: gridStartY + row * (NODE_HEIGHT + GAP_Y),
    };
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium">{group.name}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {group.cidr}
          {group.vlanLabel ? ` · ${group.vlanLabel}` : ""}
        </p>
      </div>
      {count === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No devices in this subnet.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ maxHeight: 340 }}
        >
          {positions.map(({ device, x, y }) => (
            <line
              key={device.id}
              x1={hubX}
              y1={hubY + HUB_RADIUS}
              x2={x + NODE_WIDTH / 2}
              y2={y}
              className="stroke-border"
              strokeWidth={1.5}
            />
          ))}
          <circle
            cx={hubX}
            cy={hubY}
            r={HUB_RADIUS}
            className="fill-primary/10 stroke-primary"
            strokeWidth={1.5}
          />
          <text
            x={hubX}
            y={hubY + 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            className="fill-foreground"
          >
            {group.cidr.split("/")[1] ? `/${group.cidr.split("/")[1]}` : ""}
          </text>
          {positions.map(({ device, x, y }) => (
            <g key={device.id}>
              <rect
                x={x}
                y={y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={6}
                className="fill-background stroke-border"
                strokeWidth={1}
              />
              <circle
                cx={x + 10}
                cy={y + NODE_HEIGHT / 2}
                r={4}
                fill={statusColor[device.status]}
              />
              <text
                x={x + 20}
                y={y + NODE_HEIGHT / 2 - 3}
                fontSize={11}
                fontWeight={500}
                className="fill-foreground"
              >
                {device.hostname.length > 14
                  ? `${device.hostname.slice(0, 13)}…`
                  : device.hostname}
              </text>
              <text
                x={x + 20}
                y={y + NODE_HEIGHT / 2 + 11}
                fontSize={10}
                className="fill-muted-foreground"
              >
                {device.ipAddress ?? "no IP"}
              </text>
            </g>
          ))}
        </svg>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t pt-2">
        {group.devices.map((d) => (
          <Link
            key={d.id}
            href={`/devices/${d.id}`}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {d.hostname}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AutoTopology({
  sites,
  ungroupedDevices,
}: {
  sites: SiteSection[];
  ungroupedDevices: DeviceInfo[];
}) {
  const hasAnything =
    sites.some((s) => s.subnetGroups.length > 0) || ungroupedDevices.length > 0;

  if (!hasAnything) {
    return (
      <p className="text-sm text-muted-foreground">
        No devices or subnets yet. Add some devices and assign them to
        subnets to see the diagram.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {sites.map(
        (site) =>
          site.subnetGroups.length > 0 && (
            <div key={site.id} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {site.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {site.subnetGroups.map((group) => (
                  <SubnetDiagram key={group.id} group={group} />
                ))}
              </div>
            </div>
          ),
      )}

      {ungroupedDevices.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            No subnet assigned
          </h2>
          <div className="flex flex-wrap gap-2">
            {ungroupedDevices.map((d) => (
              <Link
                key={d.id}
                href={`/devices/${d.id}`}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs hover:bg-muted/50"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: statusColor[d.status] }}
                />
                <span className="font-medium">{d.hostname}</span>
                <span className="font-mono text-muted-foreground">
                  {d.ipAddress ?? "no IP"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
