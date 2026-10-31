import React from 'react';

interface Props { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }
export default function SubscriptionDialog({ title, children, onClose, busy = false }: Props) {
  const container = React.useRef<HTMLDivElement>(null);
  const close = React.useRef(onClose);
  close.current = onClose;
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    container.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = [...(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], iframe, [tabindex="0"]') || [])];
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4">
      <div ref={container} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl outline-none">
        <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="absolute top-3 right-4 text-2xl text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer">×</button>
        {children}
      </div>
    </div>
  );
}
