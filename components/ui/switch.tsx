import * as React from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <input ref={ref} type="checkbox" role="switch" className={cn('h-4 w-8 rounded-full accent-primary', className)} {...props} />
));

Switch.displayName = 'Switch';

export { Switch };
