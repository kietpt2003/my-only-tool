import React from 'react';

import { apiTools } from '@/services/apiTools';
import { uploadFileToVercel } from '@/services/uploadService';

const FormDiffExcel: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const handleDiff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResultUrl(null);
    try {
      const form = e.currentTarget;

      const fileOld = (form.elements.namedItem('fileOld') as HTMLInputElement).files?.[0];
      const fileNew = (form.elements.namedItem('fileNew') as HTMLInputElement).files?.[0];

      const keyColumnOld = (form.elements.namedItem('keyColumnOld') as HTMLInputElement).value || 1;
      const valueColumnOld = (form.elements.namedItem('valueColumnOld') as HTMLInputElement).value || 2;
      const keyColumnNew = (form.elements.namedItem('keyColumnNew') as HTMLInputElement).value || 1;
      const valueColumnNew = (form.elements.namedItem('valueColumnNew') as HTMLInputElement).value || 2;

      if (!fileOld || !fileNew) {
        alert("Please select both Old and New Excel files!");
        setIsLoading(false);
        return;
      }

      const [oldFileUrl, newFileUrl] = await Promise.all([
        uploadFileToVercel(fileOld),
        uploadFileToVercel(fileNew)
      ]);

      const response = await apiTools.diffExcel({
        oldFileUrl,
        newFileUrl,
        keyColumnOld,
        valueColumnOld,
        keyColumnNew,
        valueColumnNew
      });

      setResultUrl(response.data?.url);
    } catch (error: any) {
      alert(error.message || "Failed to compare Excel files");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
      <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span>⚖️</span> Compare 2 Excel Files
      </h4>

      <form onSubmit={handleDiff}>

        {/* BỘ FILE OLD */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">Old Excel File</label>
            <a
              href="/templates/cs/template_diff_old.xlsx"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample old file
            </a>
          </div>

          <input
            type="file"
            name="fileOld"
            accept=".xlsx, .xls, .csv, .ods"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />

          <div className="flex gap-3 mt-4">
            <input
              type="text"
              name="keyColumnOld"
              placeholder="Key Col (default 1)"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
            <input
              type="text"
              name="valueColumnOld"
              placeholder="Value Col (default 2)"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
          </div>
        </div>

        {/* BỘ FILE NEW */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">New Excel File</label>
            <a
              href="/templates/cs/template_diff_new.xlsx"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample new file
            </a>
          </div>

          <input
            type="file"
            name="fileNew"
            accept=".xlsx, .xls, .csv, .ods"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />

          <div className="flex gap-3 mt-4">
            <input
              type="text"
              name="keyColumnNew"
              placeholder="Key Col (default 1)"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
            <input
              type="text"
              name="valueColumnNew"
              placeholder="Value Col (default 2)"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
          </div>
        </div>

        {/* NÚT SUBMIT */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl shadow-md transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? 'Comparing...' : 'Check Differences'}
        </button>
      </form>

      {/* TRẠNG THÁI LOADING (SPINNER) */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center mt-6 space-y-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500">Processing files, please wait...</div>
        </div>
      )}

      {/* KẾT QUẢ THÀNH CÔNG */}
      {resultUrl && !isLoading && (
        <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-sm text-emerald-800 mb-2 font-medium">Comparison completed successfully!</p>
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 font-bold text-sm rounded-lg border border-emerald-300 shadow-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
          >
            📥 Download Diff Report
          </a>
        </div>
      )}
    </div>
  );
};

export default FormDiffExcel;
