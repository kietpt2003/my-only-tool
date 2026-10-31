import React from 'react';

export function isWeekendDate(value: string): boolean {
  const date = new Date(`${value}T12:00:00`);
  return date.getDay() === 0 || date.getDay() === 6;
}

export function defaultDraftDate(): string {
  const date = new Date();
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface Props {
  value: string;
  allowWeekends: boolean;
  onChange: (value: string) => void;
}

export default function QuickDraftDatePicker({ value, allowWeekends, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => (value || defaultDraftDate()).slice(0, 7));
  const container = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [year, monthNumber] = month.split('-').map(Number);
  const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, monthNumber, 0).getDate();

  React.useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const changeMonth = (direction: number) => {
    const next = new Date(year, monthNumber - 1 + direction, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div ref={container} className="relative flex-1 min-w-0">
      <button
        ref={trigger}
        type="button"
        aria-label="Draft date"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!open && value) setMonth(value.slice(0, 7));
          setOpen(!open);
        }}
        className="w-full h-full min-h-8 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-left focus:outline-none focus:border-teal-500 cursor-pointer"
      >
        {value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Choose date'}
      </button>
      {open && (
        <div role="dialog" aria-label="Choose draft date" className="absolute right-0 top-full mt-2 z-30 w-64 max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous draft month" onClick={() => changeMonth(-1)} className="p-1.5 rounded hover:bg-teal-50 cursor-pointer">‹</button>
            <input type="month" aria-label="Draft calendar month" value={month} onChange={event => { if (event.target.value) setMonth(event.target.value); }} className="min-w-0 text-xs font-semibold text-slate-700 border border-slate-200 rounded px-1 py-1.5" />
            <button type="button" aria-label="Next draft month" onClick={() => changeMonth(1)} className="p-1.5 rounded hover:bg-teal-50 cursor-pointer">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-slate-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
            {Array.from({ length: dayCount }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, '0')}`;
              const disabled = !allowWeekends && isWeekendDate(date);
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={date}
                  aria-pressed={value === date}
                  disabled={disabled}
                  title={disabled ? 'Enable Saturday & Sunday to select this date' : date}
                  onClick={() => { onChange(date); setOpen(false); trigger.current?.focus(); }}
                  className={`h-8 rounded-md text-xs cursor-pointer disabled:cursor-not-allowed disabled:text-slate-300 disabled:bg-slate-50 ${value === date ? 'bg-teal-600 text-white' : 'text-slate-700 enabled:hover:bg-teal-50'}`}
                >{index + 1}</button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500">{allowWeekends ? 'All days are available.' : 'Saturday & Sunday are disabled.'}</p>
        </div>
      )}
    </div>
  );
}
