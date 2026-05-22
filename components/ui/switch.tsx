import * as React from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative h-5 w-9 rounded-full border border-input bg-muted transition-colors',
        checked && 'bg-primary',
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )
);

Switch.displayName = 'Switch';

export { Switch };
