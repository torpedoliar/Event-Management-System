import { HTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass';
}

export default function Card({ className, variant: _variant, ...rest }: Props) {
  return <div className={cn('surface p-5', className)} {...rest} />;
}
