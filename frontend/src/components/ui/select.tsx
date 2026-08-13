import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Native <select>, styled to match the design system — no extra dependency. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative inline-block">
    <select
      ref={ref}
      className={cn(
        'appearance-none rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
  </div>
));
Select.displayName = 'Select';
