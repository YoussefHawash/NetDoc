"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
  type NodeProps,
} from "@xyflow/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { updateDevicePosition } from "@/lib/actions/devices";
import { createConnection } from "@/lib/actions/connections";
import { DeviceType, DeviceStatus, LinkType } from "@/generated/prisma/enums";
import { ConnectionPanel, type ConnectionData } from "@/components/topology/connection-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deviceTypeIcons, deviceTypeLabels as typeLabels } from "@/lib/device-icons";

type DeviceInput = {
  id: string;
  hostname: string;
  type: DeviceType;
  status: DeviceStatus;
  ipAddress: string | null;
  positionX: number;
  positionY: number;
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

type DeviceNodeData = {
  hostname: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  ipAddress: string | null;
};

const statusDot: Record<DeviceStatus, string> = {
  active: "bg-emerald-500",
  inactive: "bg-zinc-400",
  maintenance: "bg-amber-500",
};

function DeviceNode({ data, selected }: NodeProps<Node<DeviceNodeData>>) {
  const Icon = deviceTypeIcons[data.deviceType];
  return (
    <div
      className={`min-w-40 rounded-lg border bg-card px-3 py-2 shadow-sm ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{data.hostname}</span>
        <span className={`size-2 shrink-0 rounded-full ${statusDot[data.status]}`} />
      </div>
      <p className="text-xs text-muted-foreground">{typeLabels[data.deviceType]}</p>
      {data.ipAddress && (
        <p className="font-mono text-xs text-muted-foreground">{data.ipAddress}</p>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { device: DeviceNode };

function deviceToNode(device: DeviceInput): Node<DeviceNodeData> {
  return {
    id: device.id,
    type: "device",
    position: { x: device.positionX, y: device.positionY },
    data: {
      hostname: device.hostname,
      deviceType: device.type,
      status: device.status,
      ipAddress: device.ipAddress,
    },
  };
}

function connectionToEdge(connection: ConnectionInput): Edge {
  return {
    id: connection.id,
    source: connection.deviceAId,
    target: connection.deviceBId,
    label: connection.label
      ? `${connection.linkType} · ${connection.label}`
      : connection.linkType,
    data: {
      linkType: connection.linkType,
      label: connection.label,
      portA: connection.portA,
      portB: connection.portB,
    },
  };
}

export function TopologyCanvas({
  devices,
  connections,
}: {
  devices: DeviceInput[];
  connections: ConnectionInput[];
}) {
  const initialNodes = useMemo(() => devices.map(deviceToNode), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialEdges = useMemo(() => connections.map(connectionToEdge), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const hostnameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices) map.set(d.id, d.hostname);
    return map;
  }, [devices]);

  // Keep the node set in sync with devices added/removed elsewhere in the app,
  // without clobbering in-progress drag positions of nodes already on the canvas.
  useEffect(() => {
    setNodes((current) => {
      const currentIds = new Set(current.map((n) => n.id));
      const incomingIds = new Set(devices.map((d) => d.id));
      const kept = current.filter((n) => incomingIds.has(n.id));
      const added = devices.filter((d) => !currentIds.has(d.id)).map(deviceToNode);
      return [...kept, ...added];
    });
  }, [devices, setNodes]);

  useEffect(() => {
    setEdges((current) => {
      const currentIds = new Set(current.map((e) => e.id));
      const incomingIds = new Set(connections.map((c) => c.id));
      const kept = current.filter((e) => incomingIds.has(e.id));
      const added = connections
        .filter((c) => !currentIds.has(c.id))
        .map(connectionToEdge);
      return [...kept, ...added];
    });
  }, [connections, setEdges]);

  const handleNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      updateDevicePosition(node.id, node.position.x, node.position.y).catch(
        () => toast.error("Failed to save device position"),
      );
    },
    [],
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      if (!connection.source || !connection.target) return;
      const { source, target } = connection;
      createConnection(source, target)
        .then((created) => {
          setEdges((eds) => addEdge(connectionToEdge(created), eds));
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to connect");
        });
    },
    [setEdges],
  );

  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedNodeId(null);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable className="!bg-card" />
      </ReactFlow>

      {selectedEdge && (
        <div className="absolute top-4 right-4 z-10">
          <ConnectionPanel
            connection={selectedEdge.data as unknown as ConnectionData}
            deviceAHostname={hostnameById.get(selectedEdge.source) ?? "?"}
            deviceBHostname={hostnameById.get(selectedEdge.target) ?? "?"}
            onClose={() => setSelectedEdgeId(null)}
            onUpdated={(data) => {
              setEdges((eds) =>
                eds.map((e) =>
                  e.id === data.id
                    ? {
                        ...e,
                        label: data.label
                          ? `${data.linkType} · ${data.label}`
                          : data.linkType,
                        data,
                      }
                    : e,
                ),
              );
            }}
            onDeleted={() => {
              setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
              setSelectedEdgeId(null);
            }}
          />
        </div>
      )}

      {selectedNode && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="w-64 shadow-lg">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <p className="font-medium">
                  {(selectedNode.data as DeviceNodeData).hostname}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedNodeId(null)}
                >
                  ×
                </Button>
              </div>
              <Button variant="outline" size="sm" render={<Link href={`/devices/${selectedNode.id}`} />}>
                View details
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
