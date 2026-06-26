import { ReactNode } from 'react';
import Card from './Card';

interface Props {
  title: string;
  children: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export default function FormSection({ title, description, action, children }: Props) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="space-y-1">
          <h3 className="text-heading-3 text-brand-text">{title}</h3>
          {description && <p className="text-body-sm">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </Card>
  );
}
