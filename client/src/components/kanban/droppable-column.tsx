import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  id: string;
  children: ReactNode;
}

export function DroppableColumn({ id, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'bg-primary/5 rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
}
