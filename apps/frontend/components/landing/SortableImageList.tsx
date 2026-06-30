'use client';

import { useState, useEffect } from 'react';
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
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';

interface SortableImage {
  id: string;
  url: string;
  alt?: string | null;
  intervalMs?: number;
  caption?: string | null;
}

interface SortableImageListProps {
  images: SortableImage[];
  onReorder: (imageIds: string[]) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onUpload: (file: File, alt?: string, caption?: string) => Promise<void>;
  showCaption?: boolean;
  showInterval?: boolean;
  emptyMessage?: string;
}

function SortableItem({
  image,
  onDelete,
  showCaption,
  showInterval,
}: {
  image: SortableImage;
  onDelete: () => Promise<void>;
  showCaption?: boolean;
  showInterval?: boolean;
  onUpdate: (updates: Partial<SortableImage>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group surface p-3 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-2 cursor-grab active:cursor-grabbing text-brand-textMuted hover:text-brand-text"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="w-24 h-24 rounded-lg overflow-hidden bg-brand-surfaceBright shrink-0">
          <img src={image.url} alt={image.alt || ''} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 space-y-2">
          {showInterval && (
            <div>
              <Label className="text-xs">Interval (ms)</Label>
              <Input
                type="number"
                min={3000}
                value={image.intervalMs ?? 5000}
                className="w-24 text-sm"
              />
            </div>
          )}
          {showCaption && (
            <div>
              <Label className="text-xs">Caption</Label>
              <Input
                value={image.caption || ''}
                placeholder="Optional caption"
                className="text-sm"
              />
            </div>
          )}
        </div>

        <button
          onClick={onDelete}
          className="p-2 text-brand-textMuted hover:text-brand-danger transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SortableImageList({
  images,
  onReorder,
  onDelete,
  onUpload,
  showCaption = false,
  showInterval = false,
  emptyMessage = 'No images uploaded.',
}: SortableImageListProps) {
  const [uploading, setUploading] = useState(false);
  const [localImages, setLocalImages] = useState(images);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localImages.findIndex((img) => img.id === active.id);
    const newIndex = localImages.findIndex((img) => img.id === over.id);
    const newImages = arrayMove(localImages, oldIndex, newIndex);

    setLocalImages(newImages);
    await onReorder(newImages.map((img) => img.id));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onUpload(file);
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    await onDelete(imageId);
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return (
    <div className="space-y-4">
      {localImages.length === 0 ? (
        <p className="text-sm text-brand-textMuted text-center py-8 surface rounded-xl">
          {emptyMessage}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localImages.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localImages.map((image) => (
                <SortableItem
                  key={image.id}
                  image={image}
                  onDelete={() => handleDelete(image.id)}
                  showCaption={showCaption}
                  showInterval={showInterval}
                  onUpdate={() => {}}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl surface-interactive cursor-pointer hover:bg-brand-surfaceMuted transition-colors">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Upload Image</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {uploading && <span className="text-sm text-brand-textMuted">Uploading...</span>}
      </div>
    </div>
  );
}
