import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-strong text-white shadow-brand hover:bg-positive',
  secondary: 'bg-ink text-cream hover:bg-body',
  neutral: 'border border-border bg-transparent text-ink hover:bg-surface-inner',
  danger: 'border border-danger bg-transparent text-danger hover:bg-danger hover:text-white',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className = '', variant = 'primary', type = 'button', ...props }, ref) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      ref={ref}
      type={type}
      {...props}
    />
  );
});
