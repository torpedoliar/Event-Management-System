import Button from './Button';

export default function Pagination({ page, canPrev, canNext, onPrev, onNext }: { page: number; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={!canPrev} onClick={onPrev}>Prev</Button>
      <div className="text-brand-textMuted">Hal {page}</div>
      <Button variant="outline" size="sm" disabled={!canNext} onClick={onNext}>Next</Button>
    </div>
  );
}