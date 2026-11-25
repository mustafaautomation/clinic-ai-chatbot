export function Mark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#1f4d3a" />
      <path
        d="M24 8c2 6 2 10 0 16-4-2-7-1-10 2 4 1 7 4 8 8 2-5 5-8 10-9-3-2-5-5-5-9-1 2-2 3-3 4V8Z"
        fill="#f3eee4"
      />
      <path d="M24 24v16" stroke="#c46b4a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
