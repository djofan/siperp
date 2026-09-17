export function SectionEmptyState({ message }: { message: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-sip-primary-200 bg-sip-primary-50/40 px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sip-primary-400 ring-1 ring-sip-primary-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 3v3M16 3v3" />
        </svg>
      </span>
      <p className="text-sm text-sip-primary-800/55">{message}</p>
    </div>
  );
}
