import { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableTaskCardProps {
  id: number;
  children: ReactNode;
}

export function DraggableTaskCard({ id, children }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
