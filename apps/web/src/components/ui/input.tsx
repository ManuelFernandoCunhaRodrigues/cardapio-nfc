import { useId, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  wrapperClassName?: string;
};

export function Input({
  id,
  label,
  error,
  className = '',
  wrapperClassName = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      <label className="block text-sm font-bold text-ink" htmlFor={inputId}>
        {label}
      </label>
      <input
        className={`min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink placeholder:text-placeholder focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10 ${className}`}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p className="text-sm text-danger" id={`${inputId}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
