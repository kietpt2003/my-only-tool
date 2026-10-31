import React from 'react';
import { apiRedmine, MonthlyStatusPayload } from '@/services/apiRedmine';

type CalendarLog = MonthlyStatusPayload['logs'][number];

const RedmineCalendarTab: React.FC = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState<number>(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>(today.getFullYear());

  const [monthData, setMonthData] = React.useState<Record<string, MonthlyStatusPayload>>({});
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const monthNamesList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const baseYear = today.getFullYear();
  const yearsList = Array.from({ length: 7 }, (_, i) => baseYear - 2 + i); // Từ năm ngoái -2 đến năm tới +4

  const [tooltipInfo, setTooltipInfo] = React.useState<{ x: number; y: number; below: boolean; log: CalendarLog } | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  const handleMouseEnterLog = (e: React.MouseEvent | React.FocusEvent, log: CalendarLog) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipInfo({
      x: Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2)),
      y: rect.top < 240 ? rect.bottom + 8 : rect.top - 8,
      below: rect.top < 240,
      log
    });
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const weekCount = Math.ceil((startOffset + daysInMonth) / 7);

  const calculateMaxWorkingHours = () => {
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(currentYear, currentMonth - 1, day).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return workingDays * 8;
  };

  const maxHours = calculateMaxWorkingHours();
  const totalLogged = Object.values(monthData).reduce((sum, day) => sum + Number(day.totalHours || 0), 0);
  const progressPercentage = Math.min((totalLogged / maxHours) * 100, 100);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('en-US', { month: 'long' });

  React.useEffect(() => {
    let isMounted = true;
    setTooltipInfo(null);
    const fetchCalendarData = async () => {
      setIsLoading(true);
      try {
        const response = await apiRedmine.getMonthlyStatus(currentMonth, currentYear);
        if (!isMounted) return;
        if (response.data && Object.keys(response.data).length > 0) {
          setMonthData(response.data);
        } else {
          setMonthData({});
        }
      } catch (error) {
        if (isMounted) setMonthData({});
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchCalendarData();
    return () => { isMounted = false; };
  }, [currentMonth, currentYear]);

  React.useEffect(() => {
    const handleScroll = () => setTooltipInfo(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <div className="space-y-3">

      {/* CALENDAR CONTROLS & PROGRESS */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button aria-label="Previous month" onClick={handlePrevMonth} className="px-3 py-1 text-xs font-bold bg-white rounded-lg border border-slate-200 cursor-pointer shadow-xs hover:bg-slate-50">❮</button>
          <span className="px-4 text-sm font-bold text-slate-700 min-w-[140px] text-center">{monthName}, {currentYear}</span>
          <button aria-label="Next month" onClick={handleNextMonth} className="px-3 py-1 text-xs font-bold bg-white rounded-lg border border-slate-200 cursor-pointer shadow-xs hover:bg-slate-50">❯</button>
        </div>

        <div className="flex-1 max-w-md w-full space-y-1.5 px-4 hidden md:block">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Monthly Progress:</span>
            <span className="text-slate-800 font-mono">{totalLogged.toFixed(1)} / {maxHours}h</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressPercentage >= 100 ? 'bg-emerald-500' : progressPercentage > 50 ? 'bg-teal-500' : 'bg-amber-400'}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <select
            aria-label="Calendar month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-xs transition-colors hover:border-slate-300"
          >
            {monthNamesList.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            aria-label="Calendar year"
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-xs transition-colors hover:border-slate-300"
          >
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button onClick={handleToday} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors">
            Today
          </button>
        </div>
      </div>

      <p className="xl:hidden text-[11px] text-slate-500">Scroll horizontally to view the full week. Hover over an entry for full details and comments.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200" role="region" aria-label="Monthly time log calendar" tabIndex={0}>
      <div className="min-w-[980px]">
      <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50 py-2">
        {weekdays.map(day => (
          <div key={day} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</div>
        ))}
      </div>

      <div
        className="relative grid grid-cols-7 gap-px bg-slate-200 h-[clamp(360px,calc(100dvh-330px),720px)]"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >

        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="text-sm font-bold text-slate-500 animate-pulse">Loading calendar data...</div>
          </div>
        )}

        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} aria-hidden="true" className="min-h-0 bg-slate-50"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayData = monthData[dateString];

          const isToday = dayNum === today.getDate() && currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear();
          const isWeekend = new Date(currentYear, currentMonth - 1, dayNum).getDay() % 6 === 0;
          const hasLogs = dayData?.logs && dayData.logs.length > 0;
          const redmineBaseUrl = dayData?.redmineUrl ? `${dayData.redmineUrl}/issues` : '#';

          return (
            <div
              key={dateString}
              aria-label={`${monthName} ${dayNum}, ${currentYear}`}
              aria-current={isToday ? 'date' : undefined}
              className={`min-h-0 min-w-0 p-1.5 flex flex-col gap-1 overflow-hidden transition-colors relative
                ${isToday ? 'ring-2 ring-inset ring-teal-500' : ''}
                ${dayData
                  ? (dayData.isFull ? 'bg-emerald-50/60 border-emerald-200 hover:shadow-md' : 'bg-rose-50/40 border-rose-200 hover:shadow-md')
                  : isWeekend ? 'bg-slate-50' : 'bg-white'
                }
                ${!dayData?.isFull ? 'hover:bg-teal-50/30' : ''}`}
            >
              <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-teal-600 text-white' : 'text-slate-700'}`}>{dayNum}</span>
                  {isToday && <span className="text-[10px] font-bold text-teal-700">Today</span>}
                </div>
                {dayData && (
                  <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-md shadow-xs
                    ${dayData.isFull ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}
                  >
                    {(Math.floor(Number(dayData.totalHours) * 10) / 10).toFixed(1)}h
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 min-w-0 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                {hasLogs && dayData.logs.map((log) => {
                  return (
                    <div
                      key={log.id}
                      onMouseEnter={(e) => handleMouseEnterLog(e, log)}
                      onMouseLeave={() => setTooltipInfo(null)}
                      onFocus={(e) => handleMouseEnterLog(e, log)}
                      onBlur={() => setTooltipInfo(null)}
                      data-calendar-log={log.id}
                      className="min-w-0 p-1 bg-white border border-slate-200/80 rounded-md shadow-xs border-l-2 border-l-teal-500 hover:border-teal-300 hover:shadow-sm transition-colors [overflow-wrap:anywhere]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="min-w-0 truncate text-[10px] leading-3 font-semibold text-slate-500">{log.project}</span>
                        <span className="shrink-0 rounded bg-teal-50 px-1 text-[10px] leading-3 font-bold tabular-nums text-teal-700">{log.hours}h</span>
                      </div>
                      <a
                        href={`${redmineBaseUrl}/${log.issueId}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`${weekCount > 5 ? 'line-clamp-1' : 'line-clamp-2'} text-[11px] leading-[14px] font-semibold text-slate-800 hover:text-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-teal-600 rounded`}
                        onClick={e => e.stopPropagation()}
                      >
                        <span className="text-teal-700 font-mono">#{log.issueId}</span>
                        {log.issueName && <span> · {log.issueName}</span>}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      </div>
      </div>

      {tooltipInfo && (
        <div
          role="tooltip"
          className={`fixed z-[99999] w-72 max-w-[calc(100vw-32px)] bg-slate-800 text-white p-2.5 rounded-lg shadow-2xl text-xs font-medium leading-relaxed pointer-events-none break-words whitespace-pre-wrap -translate-x-1/2 ${tooltipInfo.below ? '' : '-translate-y-full'} animate-[fadeIn_0.15s_ease-out]`}
          style={{ left: tooltipInfo.x, top: tooltipInfo.y }}
        >
          <div className="text-teal-400 font-bold">{tooltipInfo.log.project}</div>
          <hr className="my-1.5 border-slate-600" />

          {tooltipInfo.log.issueName && (
            <div className="text-white font-semibold mb-1 text-[13px]">{tooltipInfo.log.issueName}</div>
          )}

          <div className="text-slate-300">Task #{tooltipInfo.log.issueId} - {tooltipInfo.log.comments || 'No comment'}</div>
        </div>
      )}

    </div>
  );
};

export default RedmineCalendarTab;
