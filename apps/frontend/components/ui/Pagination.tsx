import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pagination({ page, canPrev, canNext, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={!canPrev} onClick={onPrev}>
        <ChevronLeft size={16} />
        Prev
      </Button>
      <div className="text-brand-textMuted font-medium tabular-nums">Halaman {page}</div>
      <Button variant="outline" size="sm" disabled={!canNext} onClick={onNext}>
        Next
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
