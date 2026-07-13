"use client";

import "@xyflow/react/dist/style.css";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  NodeResizer,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useInternalNode,
  getStraightPath,
  type Node,
  type Edge,
  type InternalNode,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { saveTopology } from "@/lib/actions/topology";
import { DeviceType, DeviceStatus, LinkType, TopologyShapeType } from "@/generated/prisma/enums";
import {
  ConnectionPanel,
  type ConnectionData,
} from "@/components/topology/connection-panel";
import { PortPanel } from "@/components/ports/port-panel";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deviceTypeIcons, deviceTypeLabels as typeLabels } from "@/lib/device-icons";

type DeviceInput = {
  id: string;
  hostname: string;
  displayName: string | null;
  type: DeviceType;
  status: DeviceStatus;
  ipAddress: string | null;
  portCount: number;
  positionX: number;
  positionY: number;
  onCanvas: boolean;
};

type ConnectionInput = {
  id: string;
  deviceAId: string;
  deviceBId: string;
  linkType: LinkType;
  label: string | null;
  portA: string | null;
  portB: string | null;
};

type ShapeInput = {
  id: string;
  type: TopologyShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string | null;
  color: string;
};

type DeviceNodeData = {
  hostname: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  ipAddress: string | null;
};

type EdgeData = {
  linkType: LinkType;
  label: string | null;
  portA: string | null;
  portB: string | null;
};

type ShapeNodeData = { text: string; color: string };

const statusDot: Record<DeviceStatus, string> = {
  active: "bg-emerald-500",
  inactive: "bg-zinc-400",
  maintenance: "bg-amber-500",
};

function newId() {
  return `new-${crypto.randomUUID()}`;
}

function edgeLabel(data: EdgeData): string {
  const ports =
    data.portA || data.portB ? `${data.portA ?? "?"} ↔ ${data.portB ?? "?"}` : null;
  if (ports && data.label) return `${ports} · ${data.label}`;
  if (ports) return ports;
  if (data.label) return data.label;
  return data.linkType;
}

// Computes where the line between two node centers crosses each node's
// border, so wires meet devices from whichever side they're actually
// facing instead of always leaving from a fixed left/right handle.
function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode) {
  const w = (intersectionNode.measured.width ?? 0) / 2;
  const h = (intersectionNode.measured.height ?? 0) / 2;
  const x2 = intersectionNode.internals.positionAbsolute.x + w;
  const y2 = intersectionNode.internals.positionAbsolute.y + h;
  const x1 = targetNode.internals.positionAbsolute.x + (targetNode.measured.width ?? 0) / 2;
  const y1 = targetNode.internals.positionAbsolute.y + (targetNode.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

function getEdgeParams(source: InternalNode, target: InternalNode) {
  const sourceIntersection = getNodeIntersection(source, target);
  const targetIntersection = getNodeIntersection(target, source);
  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
  };
}

function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={16}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            className={`nodrag nopan rounded border bg-card px-1.5 py-0.5 text-[10px] whitespace-nowrap text-foreground shadow-sm ${
              selected ? "border-primary" : "border-border"
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { floating: FloatingEdge };

function DeviceNode({ data, selected }: NodeProps<Node<DeviceNodeData>>) {
  const Icon = deviceTypeIcons[data.deviceType];
  return (
    <div
      className={`flex w-20 cursor-pointer flex-col items-center gap-0.5 rounded-md p-1.5 ${
        selected ? "outline-2 outline-dashed outline-primary" : ""
      }`}
      title={data.hostname}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!opacity-0"
      />
      <div className="relative">
        <Icon className="size-11 text-foreground" strokeWidth={1.25} />
        <span
          className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${statusDot[data.status]}`}
        />
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
        {data.hostname}
      </span>
      {data.ipAddress && (
        <span className="w-full truncate text-center font-mono text-[9px] text-muted-foreground">
          {data.ipAddress}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!opacity-0"
      />
    </div>
  );
}

const ShapeActionsContext = createContext<{
  onTextChange: (id: string, text: string) => void;
  onColorChange: (id: string, color: string) => void;
  onRemove: (id: string) => void;
} | null>(null);

function useShapeActions() {
  const ctx = useContext(ShapeActionsContext);
  if (!ctx) throw new Error("Shape node rendered outside ShapeActionsContext");
  return ctx;
}

function CircleShapeNode({ id, data, selected }: NodeProps<Node<ShapeNodeData>>) {
  const { onTextChange, onColorChange, onRemove } = useShapeActions();
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={100}
        color={data.color}
        handleClassName="!size-2.5 !rounded-full !border-2"
      />
      <div
        className="relative flex h-full w-full flex-col items-center justify-start gap-2 rounded-full border-2 border-dashed p-3"
        style={{ borderColor: data.color, backgroundColor: `${data.color}1a` }}
      >
        {selected && (
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="nodrag absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border bg-background text-xs shadow-sm hover:bg-muted"
          >
            ×
          </button>
        )}
        <input
          value={data.text}
          onChange={(e) => onTextChange(id, e.target.value)}
          placeholder="Subnet label"
          className="nodrag w-4/5 rounded bg-transparent text-center text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground"
        />
        <input
          type="color"
          value={data.color}
          onChange={(e) => onColorChange(id, e.target.value)}
          title="Circle color"
          className="nodrag size-5 cursor-pointer rounded border-none bg-transparent p-0"
        />
      </div>
    </>
  );
}

function LabelShapeNode({ id, data, selected }: NodeProps<Node<ShapeNodeData>>) {
  const { onTextChange, onRemove } = useShapeActions();
  return (
    <div className="relative">
      {selected && (
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="nodrag absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border bg-background text-xs shadow-sm hover:bg-muted"
        >
          ×
        </button>
      )}
      <input
        value={data.text}
        onChange={(e) => onTextChange(id, e.target.value)}
        placeholder="Label text"
        className="nodrag min-w-32 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-foreground outline-none hover:border-border focus:border-border focus:bg-card"
      />
    </div>
  );
}

const nodeTypes = {
  device: DeviceNode,
  circleShape: CircleShapeNode,
  labelShape: LabelShapeNode,
};

function deviceLabel(device: DeviceInput): string {
  return device.displayName || device.hostname;
}

function deviceToNode(device: DeviceInput): Node<DeviceNodeData> {
  return {
    id: device.id,
    type: "device",
    position: { x: device.positionX, y: device.positionY },
    data: {
      hostname: deviceLabel(device),
      deviceType: device.type,
      status: device.status,
      ipAddress: device.ipAddress,
    },
  };
}

function shapeToNode(shape: ShapeInput): Node<ShapeNodeData> {
  const isCircle = shape.type === TopologyShapeType.circle;
  return {
    id: shape.id,
    type: isCircle ? "circleShape" : "labelShape",
    position: { x: shape.x, y: shape.y },
    ...(isCircle ? { width: shape.width, height: shape.height } : {}),
    zIndex: isCircle ? -1 : 0,
    data: { text: shape.text ?? "", color: shape.color },
  };
}

function connectionToEdge(connection: ConnectionInput): Edge<EdgeData> {
  const data: EdgeData = {
    linkType: connection.linkType,
    label: connection.label,
    portA: connection.portA,
    portB: connection.portB,
  };
  return {
    id: connection.id,
    type: "floating",
    source: connection.deviceAId,
    target: connection.deviceBId,
    label: edgeLabel(data),
    data,
  };
}

function PaletteItem({ device }: { device: DeviceInput }) {
  const Icon = deviceTypeIcons[device.type];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-netdoc-device", device.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      title={`Drag ${deviceLabel(device)} onto the canvas`}
      className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs active:cursor-grabbing hover:bg-muted/50"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{deviceLabel(device)}</span>
    </div>
  );
}

function TopologyCanvasInner({
  devices,
  connections,
  shapes,
  sites,
  subnets,
  vendors,
  deviceModels,
}: {
  devices: DeviceInput[];
  connections: ConnectionInput[];
  shapes: ShapeInput[];
  sites: { id: string; name: string }[];
  subnets: { id: string; name: string; cidr: string }[];
  vendors: { id: string; name: string }[];
  deviceModels: { id: string; name: string }[];
}) {
  const initialNodes = useMemo<Node[]>(
    () => [
      ...devices.filter((d) => d.onCanvas).map(deviceToNode),
      ...shapes.map(shapeToNode),
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const initialEdges = useMemo<Edge[]>(
    () => connections.map(connectionToEdge),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState(initialEdges);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { resolvedTheme } = useTheme();
  const { screenToFlowPosition } = useReactFlow();

  const initialOnCanvasIds = useMemo(
    () => new Set(devices.filter((d) => d.onCanvas).map((d) => d.id)),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const initialConnectionIds = useMemo(
    () => new Set(connections.map((c) => c.id)),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const initialShapeIds = useMemo(
    () => new Set(shapes.map((s) => s.id)),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const hostnameById = useMemo(
    () => new Map(devices.map((d) => [d.id, deviceLabel(d)])),
    [devices],
  );

  const canvasDeviceIds = useMemo(
    () => new Set(nodes.filter((n) => n.type === "device").map((n) => n.id)),
    [nodes],
  );
  const paletteDevices = useMemo(
    () => devices.filter((d) => !canvasDeviceIds.has(d.id)),
    [devices, canvasDeviceIds],
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRaw(changes);
      setDirty(true);
    },
    [onNodesChangeRaw],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRaw(changes);
      setDirty(true);
    },
    [onEdgesChangeRaw],
  );

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdges((eds) =>
        eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)),
      );
      setSelectedDeviceId((cur) => (cur && deletedIds.has(cur) ? null : cur));
      setDirty(true);
    },
    [setEdges],
  );

  const updateShapeText = useCallback(
    (id: string, text: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text } } : n)),
      );
      setDirty(true);
    },
    [setNodes],
  );

  const updateShapeColor = useCallback(
    (id: string, color: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, color } } : n)),
      );
      setDirty(true);
    },
    [setNodes],
  );

  const removeShapeNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setDirty(true);
    },
    [setNodes],
  );

  const shapeActions = useMemo(
    () => ({
      onTextChange: updateShapeText,
      onColorChange: updateShapeColor,
      onRemove: removeShapeNode,
    }),
    [updateShapeText, updateShapeColor, removeShapeNode],
  );

  const removeDeviceFromCanvas = useCallback(
    (deviceId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== deviceId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== deviceId && e.target !== deviceId),
      );
      setDirty(true);
      setSelectedDeviceId(null);
    },
    [setNodes, setEdges],
  );

  const connectViaPortPanel = useCallback(
    (
      deviceId: string,
      input: {
        portOnThisDevice: string;
        targetDeviceId: string;
        portOnPeer: string | null;
        linkType: LinkType;
      },
    ) => {
      setEdges((eds) => {
        const existingIdx = eds.findIndex(
          (e) =>
            (e.source === deviceId && e.target === input.targetDeviceId) ||
            (e.source === input.targetDeviceId && e.target === deviceId),
        );

        if (existingIdx >= 0) {
          const existing = eds[existingIdx];
          const data = existing.data as EdgeData;
          const iAmSource = existing.source === deviceId;
          const mySideEmpty = iAmSource ? !data.portA : !data.portB;

          if (mySideEmpty) {
            const newData: EdgeData = iAmSource
              ? {
                  ...data,
                  portA: input.portOnThisDevice || data.portA,
                  portB: input.portOnPeer || data.portB,
                  linkType: input.linkType,
                }
              : {
                  ...data,
                  portB: input.portOnThisDevice || data.portB,
                  portA: input.portOnPeer || data.portA,
                  linkType: input.linkType,
                };
            const updated: Edge<EdgeData> = {
              ...existing,
              data: newData,
              label: edgeLabel(newData),
            };
            return eds.map((e, i) => (i === existingIdx ? updated : e));
          }
        }

        const data: EdgeData = {
          linkType: input.linkType,
          label: null,
          portA: input.portOnThisDevice,
          portB: input.portOnPeer,
        };
        const edge: Edge<EdgeData> = {
          id: newId(),
          type: "floating",
          source: deviceId,
          target: input.targetDeviceId,
          label: edgeLabel(data),
          data,
        };
        return [...eds, edge];
      });
      setDirty(true);
    },
    [setEdges],
  );

  const disconnectViaPortPanel = useCallback(
    (connectionId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== connectionId));
      setDirty(true);
    },
    [setEdges],
  );

  const connectionsForDevice = useCallback(
    (deviceId: string) =>
      edges
        .filter((e) => e.source === deviceId || e.target === deviceId)
        .map((e) => {
          const data = e.data as EdgeData;
          const isSource = e.source === deviceId;
          const peerId = isSource ? e.target : e.source;
          return {
            id: e.id,
            portOnThisDevice: isSource ? data.portA : data.portB,
            peerId,
            peerHostname: hostnameById.get(peerId) ?? "?",
            portOnPeer: isSource ? data.portB : data.portA,
            linkType: data.linkType,
            label: data.label,
          };
        }),
    [edges, hostnameById],
  );

  const otherCanvasDevices = useCallback(
    (deviceId: string) =>
      nodes
        .filter((n) => n.type === "device" && n.id !== deviceId)
        .map((n) => ({ id: n.id, hostname: (n.data as DeviceNodeData).hostname })),
    [nodes],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const deviceId = event.dataTransfer.getData("application/x-netdoc-device");
      if (!deviceId) return;
      const device = deviceById.get(deviceId);
      if (!device) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((nds) => [
        ...nds,
        deviceToNode({ ...device, positionX: position.x, positionY: position.y }),
      ]);
      setDirty(true);
    },
    [deviceById, screenToFlowPosition, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  function addCircle() {
    setNodes((nds) => [
      ...nds,
      {
        id: newId(),
        type: "circleShape",
        position: { x: 120 + Math.random() * 40, y: 120 + Math.random() * 40 },
        width: 220,
        height: 220,
        zIndex: -1,
        data: { text: "", color: "#6366f1" },
      },
    ]);
    setDirty(true);
  }

  function addLabel() {
    setNodes((nds) => [
      ...nds,
      {
        id: newId(),
        type: "labelShape",
        position: { x: 120 + Math.random() * 40, y: 120 + Math.random() * 40 },
        data: { text: "New label", color: "#6366f1" },
      },
    ]);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const deviceNodes = nodes.filter((n) => n.type === "device");
      const shapeNodes = nodes.filter(
        (n) => n.type === "circleShape" || n.type === "labelShape",
      );

      const currentDeviceIds = new Set(deviceNodes.map((n) => n.id));
      const removedDeviceIds = [...initialOnCanvasIds].filter(
        (id) => !currentDeviceIds.has(id),
      );

      const currentConnectionIds = new Set(edges.map((e) => e.id));
      const deletedConnectionIds = [...initialConnectionIds].filter(
        (id) => !currentConnectionIds.has(id),
      );

      const currentShapeIds = new Set(shapeNodes.map((n) => n.id));
      const deletedShapeIds = [...initialShapeIds].filter(
        (id) => !currentShapeIds.has(id),
      );

      await saveTopology({
        placed: deviceNodes.map((n) => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
        })),
        removedDeviceIds,
        connections: edges.map((e) => {
          const data = e.data as EdgeData;
          return {
            id: e.id.startsWith("new-") ? null : e.id,
            deviceAId: e.source,
            deviceBId: e.target,
            portA: data.portA,
            portB: data.portB,
            linkType: data.linkType,
            label: data.label,
          };
        }),
        deletedConnectionIds,
        shapes: shapeNodes.map((n) => {
          const data = n.data as ShapeNodeData;
          const isCircle = n.type === "circleShape";
          return {
            id: n.id.startsWith("new-") ? null : n.id,
            type: isCircle ? TopologyShapeType.circle : TopologyShapeType.label,
            x: n.position.x,
            y: n.position.y,
            width: isCircle ? (n.width ?? n.measured?.width ?? 220) : 160,
            height: isCircle ? (n.height ?? n.measured?.height ?? 220) : 40,
            text: data.text || null,
            color: data.color,
          };
        }),
        deletedShapeIds,
      });
      toast.success("Topology saved");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save topology");
      setSaving(false);
    }
  }

  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const selectedDeviceNode = nodes.find(
    (n) => n.id === selectedDeviceId && n.type === "device",
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addCircle}>
            + Circle
          </Button>
          <Button variant="outline" size="sm" onClick={addLabel}>
            + Label
          </Button>
          <DeviceFormDialog
            sites={sites}
            subnets={subnets}
            vendors={vendors}
            deviceModels={deviceModels}
            trigger={
              <Button variant="outline" size="sm">
                + Device
              </Button>
            }
          />
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {paletteOpen && (
          <div className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Devices
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPaletteOpen(false)}
              >
                ‹
              </Button>
            </div>
            {paletteDevices.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                All devices are placed on the canvas.
              </p>
            ) : (
              paletteDevices.map((d) => <PaletteItem key={d.id} device={d} />)
            )}
          </div>
        )}

        <div className="relative min-h-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          {!paletteOpen && (
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-2 left-2 z-10"
              onClick={() => setPaletteOpen(true)}
            >
              ›
            </Button>
          )}

          <ShapeActionsContext.Provider value={shapeActions}>
            <ReactFlow
              colorMode={resolvedTheme === "dark" ? "dark" : "light"}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesConnectable={false}
              deleteKeyCode={["Backspace", "Delete"]}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodesDelete={handleNodesDelete}
              onNodeClick={(_, node) => {
                if (node.type !== "device") return;
                setSelectedDeviceId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedDeviceId(null);
              }}
              onPaneClick={() => {
                setSelectedDeviceId(null);
                setSelectedEdgeId(null);
              }}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </ShapeActionsContext.Provider>

          {selectedEdge && (
            <div className="absolute top-4 right-4 z-10">
              <ConnectionPanel
                connection={{
                  id: selectedEdge.id,
                  linkType: (selectedEdge.data as EdgeData).linkType,
                  label: (selectedEdge.data as EdgeData).label,
                  portA: (selectedEdge.data as EdgeData).portA,
                  portB: (selectedEdge.data as EdgeData).portB,
                }}
                deviceAHostname={hostnameById.get(selectedEdge.source) ?? "?"}
                deviceBHostname={hostnameById.get(selectedEdge.target) ?? "?"}
                onClose={() => setSelectedEdgeId(null)}
                onSave={(data: ConnectionData) => {
                  setEdges((eds) =>
                    eds.map((e) =>
                      e.id === data.id
                        ? {
                            ...e,
                            label: edgeLabel({
                              linkType: data.linkType,
                              label: data.label,
                              portA: data.portA,
                              portB: data.portB,
                            }),
                            data: {
                              linkType: data.linkType,
                              label: data.label,
                              portA: data.portA,
                              portB: data.portB,
                            },
                          }
                        : e,
                    ),
                  );
                  setDirty(true);
                }}
                onDelete={() => {
                  setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                  setDirty(true);
                  setSelectedEdgeId(null);
                }}
              />
            </div>
          )}

          {selectedDeviceNode && selectedDeviceId && (
            <div className="absolute top-4 right-4 z-10 w-80">
              <Card className="shadow-lg">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-sm">
                      {(selectedDeviceNode.data as DeviceNodeData).hostname}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[(selectedDeviceNode.data as DeviceNodeData).deviceType]}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedDeviceId(null)}
                  >
                    ×
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/devices/${selectedDeviceId}`} />}
                    >
                      View details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDeviceFromCanvas(selectedDeviceId)}
                    >
                      Remove from canvas
                    </Button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    <PortPanel
                      portCount={deviceById.get(selectedDeviceId)?.portCount ?? 0}
                      connections={connectionsForDevice(selectedDeviceId)}
                      otherDevices={otherCanvasDevices(selectedDeviceId)}
                      onConnect={(input) =>
                        connectViaPortPanel(selectedDeviceId, input)
                      }
                      onDisconnect={disconnectViaPortPanel}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TopologyCanvas(props: {
  devices: DeviceInput[];
  connections: ConnectionInput[];
  shapes: ShapeInput[];
  sites: { id: string; name: string }[];
  subnets: { id: string; name: string; cidr: string }[];
  vendors: { id: string; name: string }[];
  deviceModels: { id: string; name: string }[];
}) {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
