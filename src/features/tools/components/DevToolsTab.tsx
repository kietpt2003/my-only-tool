import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/store';
import FormJsToExcel from './FormJsToExcel';
import FormExcelToJs from './FormExcelToJs';
import FormDiffJs from './FormDiffJs';
import FormTranslateJs from './FormTranslateJs';

type DevMode = 'js-to-excel' | 'excel-to-js' | 'diff-js' | 'translate-js';

const DevToolsTab: React.FC = () => {
  const {
    languagesStore: { fetchLanguages }
  } = useStore();

  const navigate = useNavigate();
  const [activeMode, setActiveMode] = React.useState<DevMode>('js-to-excel');

  const handleSwitchMode = (mode: DevMode) => {
    setActiveMode(mode);
  };

  React.useEffect(() => {
    fetchLanguages();
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
        <span>🛠️</span> Dev Tools Dashboard
      </h3>

      <div className="flex flex-wrap gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <button
          onClick={() => navigate('/svg-converter')}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold transition-all hover:bg-teal-100 hover:-translate-y-0.5 cursor-pointer"
        >
          🪄 Smart SVG Converter
        </button>
        <button
          onClick={() => navigate('/json-formatter')}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold transition-all hover:bg-teal-100 hover:-translate-y-0.5 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10H3M21 6H3M21 14H3M21 18H3" />
          </svg>
          JSON Formatter & TS Gen
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {(['js-to-excel', 'excel-to-js', 'diff-js', 'translate-js'] as DevMode[]).map((mode) => {
          const isActive = activeMode === mode;

          // Định nghĩa label & icon động cho từng tab
          const labels: Record<DevMode, string> = {
            'js-to-excel': 'JS → Excel',
            'excel-to-js': 'Excel → JS',
            'diff-js': '🔍 Compare JS',
            'translate-js': '🌍 Auto Translate JS'
          };

          return (
            <button
              key={mode}
              onClick={() => handleSwitchMode(mode)}
              className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-all border-t border-x -mb-px cursor-pointer select-none
                ${isActive
                  ? 'bg-white text-teal-600 border-slate-200 font-bold shadow-xs'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50'
                }`}
            >
              {labels[mode]}
            </button>
          );
        })}
      </div>

      {/* KHU VỰC 3: RENDER FORM NỘI DUNG */}
      <div className="transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
        {activeMode === 'js-to-excel' && <FormJsToExcel />}
        {activeMode === 'excel-to-js' && <FormExcelToJs />}
        {activeMode === 'diff-js' && <FormDiffJs />}
        {activeMode === 'translate-js' && <FormTranslateJs />}
      </div>

    </div>
  );
};

export default DevToolsTab;
