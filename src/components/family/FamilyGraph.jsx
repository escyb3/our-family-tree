import React, { useEffect, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";

export default function FamilyGraph({ data }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const nodeMap = new Map();
    const edgeList = [];
    const createNode = (person, x, y) => {
      const id = person.id.toString();
      if (nodeMap.has(id)) return;
      nodeMap.set(
        id,
        {
          id,
          data: { label: person.name },
          position: { x, y },
        }
      );
    };

    let x = 0;
    let y = 0;
    for (const person of data) {
      createNode(person, x, y);
      y += 150;
      if (person.children) {
        for (const child of person.children) {
          createNode(child, x + 250, y);
          edgeList.push({ id: `${person.id}-${child.id}`, source: person.id.toString(), target: child.id.toString() });
          y += 150;
        }
      }
    }

    setNodes(Array.from(nodeMap.values()));
    setEdges(edgeList);
  }, [data]);

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
