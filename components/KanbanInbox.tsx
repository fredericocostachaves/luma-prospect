import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanItem, KanbanColumnId } from '../types';
import { CheckCircle, XCircle, DollarSign, Briefcase } from 'lucide-react';

// --- MOCK DATA ---
const initialItems: Record<string, KanbanItem[]> = {
  [KanbanColumnId.QUALIFIED]: [
    { id: '1', content: "Interesse em demo. Agendar para terça.", leadName: 'Alice Souza', leadCompany: 'TechSoft', timeReceived: '2h', value: 'R$ 5k' },
    { id: '2', content: "Pediu apresentação institucional.", leadName: 'Roberto Lima', leadCompany: 'NuvemInc', timeReceived: '5h', value: 'R$ 8k' },
  ],
  [KanbanColumnId.NEGOTIATION]: [
    { id: '3', content: "Proposta enviada. Aguardando diretor.", leadName: 'Carlos Dias', leadCompany: 'StartupIO', timeReceived: '1d', value: 'R$ 12k' },
  ],
  [KanbanColumnId.CLOSED]: [
    { id: '4', content: "Contrato assinado!", leadName: 'Maria Silva', leadCompany: 'BigCorp', timeReceived: '3d', value: 'R$ 25k' },
  ],
};

// --- SORTABLE ITEM COMPONENT ---
const SortableItem: React.FC<{ item: KanbanItem }> = ({ item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 mb-3 rounded-lg border border-gray-200 shadow-sm cursor-grab hover:shadow-md transition-shadow group"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800 text-sm">{item.leadName}</h4>
        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">{item.value}</span>
      </div>
      <p className="text-xs text-brand-600 font-medium mb-3 flex items-center gap-1">
        <Briefcase className="w-3 h-3" />
        {item.leadCompany}
      </p>
      <div className="bg-gray-50 p-2.5 rounded text-xs text-gray-600 italic border-l-2 border-brand-300">
        "{item.content}"
      </div>
    </div>
  );
};

// --- COLUMN COMPONENT ---
interface ColumnProps {
  id: string;
  items: KanbanItem[];
  title: string;
  icon: any;
  color: string;
  bgHeader: string;
}

const Column: React.FC<ColumnProps> = ({ id, items, title, icon: Icon, color, bgHeader }) => {
  const totalValue = items.length > 0 ? "R$ " + items.reduce((acc, i) => acc + parseInt(i.value?.replace(/\D/g, '') || '0'), 0) + "k" : "R$ 0";

  return (
    <div className="flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 flex flex-col h-full border border-gray-200/60">
      <div className={`flex flex-col gap-1 mb-4 pb-3 border-b border-gray-200 ${color}`}>
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${bgHeader}`}>
                <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
            <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200">
            {items.length}
            </span>
        </div>
        <div className="text-xs text-gray-400 font-medium ml-1">
            Pipeline: {totalValue}
        </div>
      </div>
      
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto custom-scroll pr-2">
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
          {items.length === 0 && (
             <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
               <span className="opacity-50">Nenhum deal nesta etapa</span>
             </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// --- MAIN KANBAN COMPONENT ---
const PipelineBoard: React.FC = () => {
  const [items, setItems] = useState(initialItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Find source container
    const activeContainer = Object.keys(items).find(key => 
      items[key].find(item => item.id === active.id)
    );
    
    // Find target container
    let overContainer = Object.keys(items).find(key => 
       key === over.id || items[key].find(item => item.id === over.id)
    );

    if (!overContainer && Object.keys(items).includes(over.id as string)) {
        overContainer = over.id as string;
    }

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const itemToMove = items[activeContainer].find(i => i.id === active.id);
    if (itemToMove) {
        setItems(prev => ({
            ...prev,
            [activeContainer]: prev[activeContainer].filter(i => i.id !== active.id),
            [overContainer!]: [...prev[overContainer!], itemToMove]
        }));
    }
  };

  return (
    <div className="h-[600px] flex gap-6 overflow-x-auto pb-4">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <Column 
          id={KanbanColumnId.QUALIFIED} 
          items={items[KanbanColumnId.QUALIFIED]} 
          title="Qualificados" 
          icon={CheckCircle}
          color="text-blue-600"
          bgHeader="bg-blue-100"
        />
        <Column 
          id={KanbanColumnId.NEGOTIATION} 
          items={items[KanbanColumnId.NEGOTIATION]} 
          title="Em Negociação" 
          icon={DollarSign}
          color="text-yellow-600"
          bgHeader="bg-yellow-100"
        />
        <Column 
          id={KanbanColumnId.CLOSED} 
          items={items[KanbanColumnId.CLOSED]} 
          title="Fechados (Won)" 
          icon={CheckCircle}
          color="text-green-600"
          bgHeader="bg-green-100"
        />
      </DndContext>
    </div>
  );
};

export default PipelineBoard;