import { HTMLAttributes } from 'react';
import { cn } from './utils';

export default function FormRow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)} {...rest} />;
}
