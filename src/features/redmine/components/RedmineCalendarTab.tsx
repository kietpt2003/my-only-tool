import React from 'react';
import { apiRedmine, MonthlyStatusPayload } from '@/services/apiRedmine';

const RedmineCalendarTab: React.FC = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState<number>(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>(today.getFullYear());

  const [monthData, setMonthData] = React.useState<Record<string, MonthlyStatusPayload>>({});
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const monthNamesList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const baseYear = today.getFullYear();
  const yearsList = Array.from({ length: 7 }, (_, i) => baseYear - 2 + i); // Từ năm ngoái -2 đến năm tới +4

  const [tooltipInfo, setTooltipInfo] = React.useState<{ x: number; y: number; log: any } | null>(null);

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

  const handleMouseEnterLog = (e: React.MouseEvent, log: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipInfo({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      log
    });
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

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
    const fetchCalendarData = async () => {
      setIsLoading(true);
      try {
        const response = await apiRedmine.getMonthlyStatus(currentMonth, currentYear);
        if (isMounted && response.data && Object.keys(response.data).length > 0) {
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
    <div className="space-y-6">

      {/* CALENDAR CONTROLS & PROGRESS */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={handlePrevMonth} className="px-3 py-1 text-xs font-bold bg-white rounded-lg border border-slate-200 cursor-pointer shadow-xs hover:bg-slate-50">❮</button>
          <span className="px-4 text-sm font-bold text-slate-700 min-w-[140px] text-center">{monthName}, {currentYear}</span>
          <button onClick={handleNextMonth} className="px-3 py-1 text-xs font-bold bg-white rounded-lg border border-slate-200 cursor-pointer shadow-xs hover:bg-slate-50">❯</button>
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

        <div className="flex items-center gap-2">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer shadow-xs transition-colors hover:border-slate-300"
          >
            {monthNamesList.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
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

      <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50 rounded-xl py-2">
        {weekdays.map(day => (
          <div key={day} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</div>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-1.5 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200/80 min-h-[400px]">

        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="text-sm font-bold text-slate-500 animate-pulse">Loading calendar data...</div>
          </div>
        )}

        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-36 bg-slate-50/50 border border-transparent rounded-xl"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayData = monthData[dateString];

          const hasLogs = dayData?.logs && dayData.logs.length > 0;
          const redmineBaseUrl = dayData?.redmineUrl ? `${dayData.redmineUrl}/issues` : '#';

          return (
            <div
              key={dateString}
              className={`h-36 border rounded-xl p-2 flex flex-col justify-between transition-all group relative overflow-hidden
                ${dayData
                  ? (dayData.isFull ? 'bg-emerald-50/60 border-emerald-200 hover:shadow-md' : 'bg-rose-50/40 border-rose-200 hover:shadow-md')
                  : 'bg-white border-slate-100 hover:border-teal-300'
                }
                ${!dayData?.isFull ? 'hover:bg-teal-50/30' : ''}`}
            >
              <div className="flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-700">{dayNum}</span>
                {dayData && (
                  <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-md shadow-xs
                    ${dayData.isFull ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}
                  >
                    {(Math.floor(Number(dayData.totalHours) * 10) / 10).toFixed(1)}h
                  </span>
                )}
              </div>

              <div className="flex-1 mt-2 overflow-y-auto min-h-0 space-y-1 pr-1 custom-scrollbar">
                {hasLogs && dayData.logs.map((log: any) => {
                  const safeComment = log.comments || 'No comment';

                  return (
                    <div
                      key={log.id}
                      onMouseEnter={(e) => handleMouseEnterLog(e, log)}
                      onMouseLeave={() => setTooltipInfo(null)}
                      className="p-1.5 bg-white border border-slate-200/80 rounded-md text-[10px] space-y-1 cursor-help shadow-2xs border-l-2 border-l-teal-500 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between font-bold text-slate-700 truncate gap-1">
                        <span className="truncate">{log.project}</span>
                        <span className="text-teal-600 font-mono shrink-0">{log.hours}h</span>
                      </div>
                      <div className="text-slate-500 font-medium text-[9px] flex items-center gap-1 truncate">
                        <a
                          href={`${redmineBaseUrl}/${log.issueId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-700 font-bold hover:text-teal-600 hover:underline shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          #{log.issueId}
                        </a>
                        <span className="truncate">{safeComment}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {tooltipInfo && (
        <div
          className="fixed z-[99999] w-56 bg-slate-800 text-white p-2.5 rounded-lg shadow-2xl text-xs font-medium leading-relaxed pointer-events-none break-words whitespace-normal -translate-x-1/2 -translate-y-full animate-[fadeIn_0.15s_ease-out]"
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default RedmineCalendarTab;
