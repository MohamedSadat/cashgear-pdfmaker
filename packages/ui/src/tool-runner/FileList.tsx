'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, FileText, GripVertical, X } from 'lucide-react';
import { Button } from '../components/button';
import { formatMegabytes } from '../lib/format';
import { useLocale, useTranslations } from '../lib/i18n';
import { cn } from '../lib/utils';
import type { FileEntry } from './useToolRunner';

interface FileListProps {
  files: readonly FileEntry[];
  ordered: boolean;
  disabled?: boolean;
  /** Id of a file to mark as the cause of the current error. */
  highlightId?: string | undefined;
  onMove: (id: string, delta: -1 | 1) => void;
  onReorder: (activeId: string, overId: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Vertical list of selected files. Order can be changed by dragging (pointer or keyboard) or with
 * the Move up / Move down buttons, which also give screen-reader and test users a simple path.
 */
export function FileList({ files, ordered, disabled, highlightId, ...handlers }: FileListProps) {
  const t = useTranslations('ui');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) handlers.onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <ol aria-label={t('fileList.label')} className="flex flex-col gap-2">
          {files.map((entry, index) => (
            <FileRow
              key={entry.id}
              entry={entry}
              index={index}
              count={files.length}
              ordered={ordered}
              disabled={disabled ?? false}
              highlighted={entry.id === highlightId}
              {...handlers}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

interface FileRowProps extends Omit<FileListProps, 'files' | 'highlightId' | 'onReorder'> {
  entry: FileEntry;
  index: number;
  count: number;
  disabled: boolean;
  highlighted: boolean;
}

function FileRow({
  entry,
  index,
  count,
  ordered,
  disabled,
  highlighted,
  onMove,
  onRemove,
}: FileRowProps) {
  const t = useTranslations('ui');
  const locale = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: disabled || !ordered,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid="file-row"
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3',
        isDragging && 'z-10 shadow-lg',
        highlighted && 'border-destructive bg-destructive/5',
      )}
    >
      {ordered && (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground disabled:cursor-default"
          aria-label={t('fileList.dragHandle')}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
      <FileText aria-hidden className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          <bdi>{entry.file.name}</bdi>
        </p>
        <p className="text-xs text-muted-foreground">{formatMegabytes(entry.file.size, locale)}</p>
      </div>
      {ordered && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('fileList.moveUp')}
            disabled={disabled || index === 0}
            onClick={() => onMove(entry.id, -1)}
          >
            <ChevronUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('fileList.moveDown')}
            disabled={disabled || index === count - 1}
            onClick={() => onMove(entry.id, 1)}
          >
            <ChevronDown aria-hidden />
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('fileList.remove')}
        disabled={disabled}
        onClick={() => onRemove(entry.id)}
      >
        <X aria-hidden />
      </Button>
    </li>
  );
}
