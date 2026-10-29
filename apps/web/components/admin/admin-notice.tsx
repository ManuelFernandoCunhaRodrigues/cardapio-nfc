export function AdminNotice({
  message,
  kind = 'success',
  className = '',
}: Readonly<{ message?: string; kind?: 'success' | 'error' | 'info'; className?: string }>) {
  if (!message) return null;
  const colors =
    kind === 'error'
      ? 'border-danger/25 bg-danger-soft text-danger'
      : kind === 'success'
        ? 'border-green/20 bg-green-soft text-green'
        : 'border-border bg-surface-inner text-body';
  return (
    <p
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${colors} ${className}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {message}
    </p>
  );
}
