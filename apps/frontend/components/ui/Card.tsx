import { HTMLAttributes } from 'react';
import { cn } from './utils';

type Variant = 'solid' | 'glass' | 'elevated';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  solid: 'surface',
  glass: 'surface-glass',
  elevated: 'surface-elevated',
};

export default function Card({ className, variant = 'solid', ...rest }: Props) {
  return <div className={cn(variants[variant], 'p-5 md:p-6', className)} {...rest} />;
}
