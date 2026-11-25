export function Mark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2c.7 2.8.5 4.8-.5 6.6-2-.6-3.5-.2-4.8 1.1 1.9.4 3.3 1.6 3.9 3.8 1.1-2.3 2.5-3.8 4.9-4.2-1.4-1.1-2.3-2.5-2.4-4.2-.5.9-1.1 1.5-1.1 2.1V2.2Z"
      />
      <path d="M12 13.2V21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
