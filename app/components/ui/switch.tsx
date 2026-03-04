import type { ButtonHTMLAttributes } from 'react';
import styles from './primitives.module.css';
import { cn } from './utils';

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(styles.switch, checked && styles.switchChecked, className)}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span className={styles.switchThumb} />
    </button>
  );
}
