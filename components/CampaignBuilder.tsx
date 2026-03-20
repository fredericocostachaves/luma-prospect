import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';

// Initial Nodes representing the "Waalaxy" style flow described
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Início: Importar Audiência' },
    position: { x: 250, y: 0 },
    style: { background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px', padding: '10px', fontWeight: 'bold', color: '#0c4a6e' },
  },
  {
    id: '2',
    data: { label: 'Ação: Visitar Perfil & Curtir Post' },
    position: { x: 250, y: 100 },
    style: { background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '3',
    data: { label: 'Ação: Enviar Conexão' },
    position: { x: 250, y: 200 },
    style: { background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '4',
    type: 'default',
    data: { label: 'Espera: Conectou?' },
    position: { x: 250, y: 300 },
    style: { background: '#fff7ed', border: '1px solid #f97316', borderRadius: '20px', padding: '10px', fontWeight: '600' },
  },
  {
    id: '5',
    data: { label: 'Delay: Esperar 1 Dia' },
    position: { x: 100, y: 400 }, // Left branch (Yes)
    style: { background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '6',
    data: { label: 'Fim: Sair da Campanha' },
    position: { x: 400, y: 400 }, // Right branch (No)
    style: { background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '7',
    data: { label: 'Ação: Enviar Mensagem #1' },
    position: { x: 100, y: 500 },
    style: { background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: '2', target: '3', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: '3', target: '4', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-5', source: '4', target: '5', label: 'Sim (Aceitou)', animated: true, style: { stroke: '#22c55e' } },
  { id: 'e4-6', source: '4', target: '6', label: 'Não (Timeout)', style: { stroke: '#ef4444' } },
  { id: 'e5-7', source: '5', target: '7', markerEnd: { type: MarkerType.ArrowClosed } },
];

const CampaignBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="h-[600px] w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded-lg shadow-sm border border-gray-100 backdrop-blur-sm">
        <h3 className="font-bold text-gray-800">Construtor de Sequência</h3>
        <p className="text-xs text-gray-500">Arraste os nós para organizar. Clique com botão direito para configurar.</p>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#f1f5f9" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default CampaignBuilder;