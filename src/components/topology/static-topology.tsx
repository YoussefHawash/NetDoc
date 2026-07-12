import { DeviceType, LinkType } from "@/generated/prisma/enums";

type DeviceInput = {
  id: string;
  hostname: string;
  type: DeviceType;
  positionX: number;
  positionY: number;
};

type ConnectionInput = {
  id: string;
  deviceAId: string;
  deviceBId: string;
  linkType: LinkType;
  label: string | null;
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 46;
const PADDING = 40;

export function StaticTopology({
  devices,
  connections,
}: {
  devices: DeviceInput[];
  connections: ConnectionInput[];
}) {
  if (devices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No devices to display. Add devices and arrange them in the topology
        view.
      </p>
    );
  }

  const minX = Math.min(...devices.map((d) => d.positionX));
  const minY = Math.min(...devices.map((d) => d.positionY));
  const maxX = Math.max(...devices.map((d) => d.positionX + NODE_WIDTH));
  const maxY = Math.max(...devices.map((d) => d.positionY + NODE_HEIGHT));

  const width = maxX - minX + PADDING * 2;
  const height = maxY - minY + PADDING * 2;

  const byId = new Map(devices.map((d) => [d.id, d]));
  const center = (d: DeviceInput) => ({
    x: d.positionX - minX + PADDING + NODE_WIDTH / 2,
    y: d.positionY - minY + PADDING + NODE_HEIGHT / 2,
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxHeight: 600 }}
      className="rounded-md border bg-white"
    >
      {connections.map((c) => {
        const a = byId.get(c.deviceAId);
        const b = byId.get(c.deviceBId);
        if (!a || !b) return null;
        const pa = center(a);
        const pb = center(b);
        return (
          <g key={c.id}>
            <line
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="#94a3b8"
              strokeWidth={1.5}
            />
            <text
              x={(pa.x + pb.x) / 2}
              y={(pa.y + pb.y) / 2 - 4}
              fontSize={10}
              fill="#64748b"
              textAnchor="middle"
            >
              {c.linkType}
              {c.label ? ` · ${c.label}` : ""}
            </text>
          </g>
        );
      })}
      {devices.map((d) => (
        <g key={d.id}>
          <rect
            x={d.positionX - minX + PADDING}
            y={d.positionY - minY + PADDING}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            rx={8}
            fill="#f8fafc"
            stroke="#cbd5e1"
          />
          <text
            x={d.positionX - minX + PADDING + NODE_WIDTH / 2}
            y={d.positionY - minY + PADDING + NODE_HEIGHT / 2 - 4}
            fontSize={12}
            fontWeight={600}
            fill="#0f172a"
            textAnchor="middle"
          >
            {d.hostname}
          </text>
          <text
            x={d.positionX - minX + PADDING + NODE_WIDTH / 2}
            y={d.positionY - minY + PADDING + NODE_HEIGHT / 2 + 12}
            fontSize={10}
            fill="#64748b"
            textAnchor="middle"
          >
            {d.type}
          </text>
        </g>
      ))}
    </svg>
  );
}
