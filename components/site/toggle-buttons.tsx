'use client';

import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** The app's FormToggleBtns: one choice of several, the picked one filled. Styles in app/global.css. */
export function ToggleButtons<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  ...rest
}: {
  label: string;
  /** null picks none. */
  value: T | null;
  options: { value: T; text: string }[];
  onChange: (value: T) => void;
} & Omit<ComponentProps<'div'>, 'onChange'>) {
  const name = useId();

  return (
    <div role="radiogroup" aria-label={label} className={cn('op-toggle-btns', className)} {...rest}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn('op-toggle-btn', value === option.value && 'is--selected')}
          data-value={option.value}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="op-toggle-btn__content">{option.text}</span>
        </label>
      ))}
    </div>
  );
}
