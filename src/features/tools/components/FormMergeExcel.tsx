import React from 'react';

import { apiTools } from '@/services/apiTools';
import { uploadFileToVercel } from '@/services/uploadService';

const FormMergeExcel: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const handleMergeExcel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResultUrl(null);
    try {
      const form = e.currentTarget;

      const file1 = (form.elements.namedItem('file1') as HTMLInputElement).files?.[0];
      const file2 = (form.elements.namedItem('file2') as HTMLInputElement).files?.[0];

      const keyColumnFile1 = (form.elements.namedItem('keyColumnFile1') as HTMLInputElement).value || 1;
      const valueColumnFile1 = (form.elements.namedItem('valueColumnFile1') as HTMLInputElement).value || 2;
      const keyColumnFile2 = (form.elements.namedItem('keyColumnFile2') as HTMLInputElement).value || 1;
      const valueColumnFile2 = (form.elements.namedItem('valueColumnFile2') as HTMLInputElement).value || 2;

      if (!file1 || !file2) {
        alert("Please select both Excel files!");
        setIsLoading(false);
        return;
      }

      // Upload song song 2 file lên Vercel
      const [file1Url, file2Url] = await Promise.all([
        uploadFileToVercel(file1),
        uploadFileToVercel(file2)
      ]);

      const response = await apiTools.mergeExcelFiles({
        file1Url,
        file2Url,
        keyColumnFile1,
        valueColumnFile1,
        keyColumnFile2,
        valueColumnFile2
      });

      setResultUrl(response.data?.url);
    } catch (error: any) {
      alert(error.message || "Failed to merge Excel files");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
      <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span>🥞</span> Merge 2 Excel Files
      </h4>

      <form onSubmit={handleMergeExcel} className="space-y-6">
        {/* FILE THỨ NHẤT */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">First Excel File</label>
            <a
              href="/templates/cs/template_merge_1.xlsx"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample File 1
            </a>
          </div>

          <input
            type="file"
            name="file1"
            accept=".xlsx, .xls, .csv, .ods"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-3 mt-4">
            <input
              type="text"
              name="keyColumnFile1"
              placeholder="Key Column File 1 (default 1)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
            <input
              type="text"
              name="valueColumnFile1"
              placeholder="Value Column File 1 (default 2)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
          </div>
        </div>

        {/* FILE THỨ HAI */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">Second Excel File</label>
            <a
              href="/templates/cs/template_merge_2.xlsx"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample File 2
            </a>
          </div>

          <input
            type="file"
            name="file2"
            accept=".xlsx, .xls, .csv, .ods"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-3 mt-4">
            <input
              type="text"
              name="keyColumnFile2"
              placeholder="Key Column File 2 (default 1)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
            <input
              type="text"
              name="valueColumnFile2"
              placeholder="Value Column File 2 (default 2)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 bg-white"
            />
          </div>
        </div>

        {/* NÚT SUBMIT */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl shadow-md transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? 'Processing...' : 'Merge Files'}
        </button>
      </form>

      {/* TRẠNG THÁI LOADING */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center mt-6 space-y-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500">Processing... This may take a while.</div>
        </div>
      )}

      {/* HIỂN THỊ KẾT QUẢ THÀNH CÔNG */}
      {resultUrl && !isLoading && (
        <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-sm text-emerald-800 mb-2 font-semibold">Success!</p>
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 font-bold text-sm rounded-lg border border-emerald-300 shadow-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
          >
            📥 Click here to download your file
          </a>
        </div>
      )}
    </div>
  );
};

export default FormMergeExcel;
