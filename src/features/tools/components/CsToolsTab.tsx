import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/store';
import FormMergeExcel from './FormMergeExcel';
import FormGenerateLocales from './FormGenerateLocales';
import FormDiffExcel from './FormDiffExcel';
import FormTranslateExcel from './FormTranslateExcel';

type CsMode = 'merge' | 'locales' | 'diff' | 'translate';

const CsToolsTab: React.FC = () => {
  const {
    languagesStore: { fetchLanguages }
  } = useStore();

  const navigate = useNavigate();

  const [activeMode, setActiveMode] = React.useState<CsMode>('merge');

  React.useEffect(() => {
    fetchLanguages();
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">

      {/* TITLE */}
      <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
        <span>🏢</span> CS Tools Dashboard
      </h3>

      {/* KHU VỰC 1: QUICK LINK EXCEL EDITOR */}
      <div className="flex flex-wrap gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <button
          onClick={() => navigate('/excel-editor')}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold transition-all hover:bg-teal-100 hover:-translate-y-0.5 cursor-pointer"
        >
          📊 Excel Editor Online
        </button>
      </div>

      {/* KHU VỰC 2: TABS CHUYỂN CHẾ ĐỘ CỦA CS TOOLS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {(['merge', 'locales', 'diff', 'translate'] as CsMode[]).map((mode) => {
          const isActive = activeMode === mode;

          // Định nghĩa nhãn text động tương ứng với từng tab mode
          const labels: Record<CsMode, string> = {
            'merge': 'Merge 2 files',
            'locales': 'Generate Locales',
            'diff': 'Diff Checker (Excel)',
            'translate': 'Auto Translate 🌍'
          };

          return (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
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

      {/* KHU VỰC 3: NỘI DUNG FORM ĐƯỢC RENDER */}
      <div className="transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
        {activeMode === 'merge' && <FormMergeExcel />}
        {activeMode === 'locales' && <FormGenerateLocales />}
        {activeMode === 'diff' && <FormDiffExcel />}
        {activeMode === 'translate' && <FormTranslateExcel />}
      </div>

    </div>
  );
};

export default CsToolsTab;
