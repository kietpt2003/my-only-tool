import React from 'react';
import { apiRedmine } from '@/services/apiRedmine';

const OP_LABELS: Record<string, string> = {
  "=": "is",
  "!": "is not",
  "><": "between",
  "*": "any",
  "!*": "none",
  "~": "contains",
  "!~": "doesn't contain",
};

const OP_BY_TYPE: Record<string, string[]> = {
  list: ["=", "!", "*", "!*"],
  list_optional: ["=", "!", "*", "!*"],
  date: ["=", "><", "*"],
  date_past: ["=", "><", "*"],
  string: ["~", "=", "!", "*", "!*"],
  text: ["~", "!~", "*", "!*"],
};

interface FilterConfig {
  type: string;
  name: string;
  values?: Array<[string, string]>;
  remote?: boolean;
}

interface ActiveFilter {
  id: string;
  fieldKey: string;
  config: FilterConfig;
  operator: string;
  values: string[];
  remoteOptions: Array<[string, string]>;
  isLoadingOptions: boolean;
}

const RedmineReportTab: React.FC = () => {
  const [columnsSelect, setColumnsSelect] = React.useState('month');
  const [groupBySelect, setGroupBySelect] = React.useState('project');
  const [globalFiltersConfig, setGlobalFiltersConfig] = React.useState<Record<string, FilterConfig>>({});
  const [availableColumns, setAvailableColumns] = React.useState<any[]>([]);
  const [availableCriterias, setAvailableCriterias] = React.useState<any[]>([]);
  const [activeFilters, setActiveFilters] = React.useState<ActiveFilter[]>([]);
  const [reportData, setReportData] = React.useState<{ headers: string[]; rows: any[]; totals: (string | number)[] } | null>(null);
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState<boolean>(true);
  const [shouldAutoGenerate, setShouldAutoGenerate] = React.useState<boolean>(false);

  const setupDefaultFilters = (filters: Record<string, FilterConfig>) => {
    const defaultFilters: ActiveFilter[] = [];

    if (filters['spent_on']) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };

      defaultFilters.push(createNewActiveFilter('spent_on', filters['spent_on'], '><', [formatDate(firstDay), formatDate(lastDay)]));
    }

    if (filters['user_id']) {
      defaultFilters.push(createNewActiveFilter('user_id', filters['user_id'], '=', ['me']));
    }

    setActiveFilters(defaultFilters);
    // Thay vì dùng setTimeout, bật cờ để useEffect tự kích hoạt
    setShouldAutoGenerate(true);
  };

  const createNewActiveFilter = (fieldKey: string, config: FilterConfig, defaultOp?: string, defaultVals: string[] = []): ActiveFilter => {
    const availableOps = OP_BY_TYPE[config.type] || ["=", "!", "*"];
    const op = defaultOp && availableOps.includes(defaultOp) ? defaultOp : availableOps[0];

    const filterId = Math.random().toString(36).substring(2, 9);

    const newFilter: ActiveFilter = {
      id: filterId,
      fieldKey,
      config,
      operator: op,
      values: defaultVals.length > 0 ? defaultVals : [''],
      remoteOptions: [],
      isLoadingOptions: !!config.remote
    };

    if (config.remote) {
      apiRedmine.getRemoteFilterOptions(fieldKey).then(res => {
        if (res.data?.success) {
          setActiveFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, remoteOptions: res.data.data, isLoadingOptions: false, values: defaultVals.length > 0 ? defaultVals : (res.data.data.length > 0 ? [res.data.data[0][1]] : ['']) } : f
          ));
        }
      });
    } else if (config.values && config.values.length > 0 && defaultVals.length === 0) {
      newFilter.values = [config.values[0][1]];
    }

    return newFilter;
  };

  const handleAddFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fieldKey = e.target.value;
    if (!fieldKey || !globalFiltersConfig[fieldKey]) return;

    if (activeFilters.some(f => f.fieldKey === fieldKey)) {
      e.target.value = '';
      return;
    }

    const newFilter = createNewActiveFilter(fieldKey, globalFiltersConfig[fieldKey]);
    setActiveFilters([...activeFilters, newFilter]);
    e.target.value = '';
  };

  const updateFilter = (id: string, updates: Partial<ActiveFilter>) => {
    setActiveFilters(activeFilters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  const handleClearFilters = () => {
    setupDefaultFilters(globalFiltersConfig);
    setReportData(null);
  };

  const fetchReport = async () => {
    if (isGenerating) return;

    const params = new URLSearchParams();
    params.append("set_filter", "1");
    params.append("sort", "spent_on:desc");
    params.append("columns", columnsSelect);
    if (groupBySelect) params.append("criteria[]", groupBySelect);

    activeFilters.forEach(f => {
      params.append("f[]", f.fieldKey);
      params.append(`op[${f.fieldKey}]`, f.operator);

      if (f.operator !== "*" && f.operator !== "!*") {
        if (f.values[0]) params.append(`v[${f.fieldKey}][]`, f.values[0]);
        if (f.operator === "><" && f.values[1]) {
          params.append(`v[${f.fieldKey}][]`, f.values[1]);
        }
      }
    });
    params.append("f[]", "");

    setIsGenerating(true);
    setReportData(null);

    try {
      const res = await apiRedmine.generateReport(params.toString());
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Failed to generate report. Please check your filters.");
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    if (shouldAutoGenerate && !isGenerating) {
      fetchReport();
      setShouldAutoGenerate(false); // Tắt cờ đi để tránh loop
    }
  }, [shouldAutoGenerate, activeFilters]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchFilters = async () => {
      try {
        const res = await apiRedmine.getReportFilters();
        if (isMounted && res.data?.success) {
          const { filters, columns, criterias } = res.data.data;
          setGlobalFiltersConfig(filters || {});
          setAvailableColumns(columns || []);
          setAvailableCriterias(criterias || []);

          if (columns?.find((c: any) => c.id === 'month')) setColumnsSelect('month');
          if (criterias?.find((c: any) => c.id === 'project')) setGroupBySelect('project');

          setupDefaultFilters(filters);
        }
      } catch (error) {
        console.error("Failed to load report config:", error);
      } finally {
        if (isMounted) setIsInitialLoading(false);
      }
    };
    fetchFilters();
    return () => { isMounted = false; };
  }, []);

  if (isInitialLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading report engine...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-100">
        📊 Spent Time Report
      </h3>

      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">Columns Details</label>
            <select value={columnsSelect} onChange={e => setColumnsSelect(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500">
              {availableColumns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">Group By (Criteria)</label>
            <select value={groupBySelect} onChange={e => setGroupBySelect(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500">
              <option value="">-- None --</option>
              {availableCriterias.map(cri => <option key={cri.id} value={cri.id}>{cri.name}</option>)}
            </select>
          </div>
        </div>

        <hr className="border-slate-200" />

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-600 block">🔍 Active Filters</label>
          <div className="space-y-2">
            {activeFilters.map(filter => {
              const availableOps = OP_BY_TYPE[filter.config.type] || ["=", "!", "*"];
              const hideValues = filter.operator === "*" || filter.operator === "!*";

              return (
                <div key={filter.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="min-w-[140px] font-bold text-sm text-slate-700 truncate">{filter.config.name}</span>
                  <select
                    value={filter.operator}
                    onChange={e => updateFilter(filter.id, { operator: e.target.value })}
                    className="w-32 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 outline-none focus:border-teal-500"
                  >
                    {availableOps.map(op => <option key={op} value={op}>{OP_LABELS[op] || op}</option>)}
                  </select>
                  <div className="flex-1 flex gap-2">
                    {!hideValues && (
                      <>
                        {(filter.config.type.includes('list')) ? (
                          filter.isLoadingOptions ? (
                            <span className="text-xs text-slate-400 italic py-1.5">Loading...</span>
                          ) : (
                            <select
                              value={filter.values[0] || ''}
                              onChange={e => updateFilter(filter.id, { values: [e.target.value, filter.values[1]] })}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-teal-500"
                            >
                              {(filter.remoteOptions.length > 0 ? filter.remoteOptions : (filter.config.values || [])).map(v => (
                                <option key={v[1]} value={v[1]}>{v[0]}</option>
                              ))}
                            </select>
                          )
                        ) : filter.config.type.includes('date') ? (
                          <>
                            <input
                              type="date"
                              value={filter.values[0] || ''}
                              onChange={e => updateFilter(filter.id, { values: [e.target.value, filter.values[1]] })}
                              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-teal-500"
                            />
                            {filter.operator === '><' && (
                              <>
                                <span className="text-slate-400">-</span>
                                <input
                                  type="date"
                                  value={filter.values[1] || ''}
                                  onChange={e => updateFilter(filter.id, { values: [filter.values[0], e.target.value] })}
                                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-teal-500"
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            value={filter.values[0] || ''}
                            onChange={e => updateFilter(filter.id, { values: [e.target.value] })}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-teal-500"
                          />
                        )}
                      </>
                    )}
                  </div>
                  <button onClick={() => removeFilter(filter.id)} className="text-slate-300 hover:text-rose-500 text-lg font-bold px-2 cursor-pointer transition-colors">&times;</button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">➕ Add filter</span>
            <select onChange={handleAddFilter} value="" className="w-48 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-teal-500 cursor-pointer">
              <option value="">-- Select filter to add --</option>
              {Object.entries(globalFiltersConfig).map(([key, config]) => (
                <option key={key} value={key} disabled={activeFilters.some(f => f.fieldKey === key)}>{config.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {/* Nút bấm không cần gán id cho DOM manipulation nữa */}
          <button onClick={fetchReport} disabled={isGenerating} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2">
            {isGenerating ? <span className="animate-pulse">Generating...</span> : 'Apply & Generate'}
          </button>
          <button onClick={handleClearFilters} disabled={isGenerating} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50">
            🔄 Reset
          </button>
        </div>
      </div>

      {reportData && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs mt-4 animate-[fadeIn_0.2s_ease-out]">
          <table className="w-full border-collapse text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold text-xs uppercase tracking-wider">
                {reportData.headers.map((h, i) => <th key={i} className="p-3.5 border-r border-slate-100 last:border-r-0">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} className="p-8 text-center text-slate-400 italic">No time logs match your filters.</td>
                </tr>
              ) : (
                reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-700 border-r border-slate-100">{row.name}</td>
                    {row.hours.map((h: any, i: number) => {
                      const isTotalCol = i === row.hours.length - 1;
                      return (
                        <td key={i} className={`p-3.5 border-r border-slate-100 last:border-r-0 ${isTotalCol ? 'font-bold text-teal-600' : 'text-slate-500'}`}>
                          {h || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
              {reportData.totals && reportData.totals.length > 0 && (
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                  <td className="p-3.5 text-slate-800 uppercase text-xs tracking-wider border-r border-slate-100">Total Time</td>
                  {reportData.totals.map((t, i) => (
                    <td key={i} className="p-3.5 text-teal-700 border-r border-slate-100 last:border-r-0">{t}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RedmineReportTab;
