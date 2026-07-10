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
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={!canPrev} onClick={onPrev} aria-label="Halaman sebelumnya">
        <ChevronLeft size={16} />
        Prev
      </Button>
      <div className="text-brand-textMuted font-medium tabular-nums" aria-current="page">Halaman {page}</div>
      <Button variant="outline" size="sm" disabled={!canNext} onClick={onNext} aria-label="Halaman berikutnya">
        Next
        <ChevronRight size={16} />
      </Button>
    </nav>
  );
}
