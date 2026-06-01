import React from 'react';

import { GUIDE_DATA } from '@/constants/user';

const RedmineUserGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTabIdx, setActiveTabIdx] = React.useState<number>(0);
  const [activeStepIdx, setActiveStepIdx] = React.useState<number>(0);
  const [fullScreenImg, setFullScreenImg] = React.useState<string | null>(null);

  const currentCategory = GUIDE_DATA[activeTabIdx];
  const currentStep = currentCategory.steps[activeStepIdx];
  const totalSteps = currentCategory.steps.length;

  const handleTabChange = (index: number) => {
    setActiveTabIdx(index);
    setActiveStepIdx(0);
  };

  const handlePrev = () => {
    if (activeStepIdx > 0) setActiveStepIdx(prev => prev - 1);
  };

  const handleNext = () => {
    if (activeStepIdx < totalSteps - 1) setActiveStepIdx(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-5xl w-full h-[650px] rounded-2xl border border-slate-200 shadow-2xl flex overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-1.5 select-none shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 mb-1 border-b border-slate-200">
            📚 Portal Documentation
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {GUIDE_DATA.map((tab, idx) => {
              const isActive = idx === activeTabIdx;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(idx)}
                  className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                >
                  {tab.tabName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-between relative bg-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 font-bold text-xl cursor-pointer transition-colors"
          >
            &times;
          </button>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
              {activeStepIdx + 1}. {currentStep.title}
            </h2>

            <p
              className="text-xs text-slate-500 leading-relaxed max-w-none"
              dangerouslySetInnerHTML={{ __html: currentStep.text }}
            />

            <div className="pt-2 flex justify-center">
              <img
                src={currentStep.image}
                alt={currentStep.title}
                onClick={() => setFullScreenImg(currentStep.image)}
                className="w-full aspect-[16/9] object-contain rounded-xl border border-slate-200 bg-slate-50 cursor-zoom-in hover:border-teal-500 transition-colors shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/640x360/f1f5f9/0f766e?text=${encodeURIComponent(currentStep.title)}`;
                }}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between select-none shrink-0">
            <button
              disabled={activeStepIdx === 0}
              onClick={handlePrev}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Back
            </button>

            <div className="flex gap-1.5">
              {currentCategory.steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeStepIdx ? 'w-6 bg-teal-600' : 'w-1.5 bg-slate-200'
                    }`}
                />
              ))}
            </div>

            {activeStepIdx === totalSteps - 1 ? (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/10 cursor-pointer transition-colors"
              >
                Understood ✔
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/10 cursor-pointer transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {fullScreenImg && (
        <div
          onClick={() => setFullScreenImg(null)}
          className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-[fadeIn_0.15s_ease-out]"
        >
          <img
            src={fullScreenImg}
            alt="Lightbox View"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/1200x675/1e293b/ffffff?text=Preview+Image+Not+Found`;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RedmineUserGuideModal;
