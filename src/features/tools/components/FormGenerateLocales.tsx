import React from 'react';

import { apiTools } from '@/services/apiTools';
import { uploadFileToVercel } from '@/services/uploadService';

const FormGenerateLocales: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResultUrl(null);
    try {
      const form = e.currentTarget;
      const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];

      const workSheetKey = Number((form.elements.namedItem('workSheetKey') as HTMLInputElement).value || 1);
      const keyColumn = Number((form.elements.namedItem('keyColumn') as HTMLInputElement).value || 1);
      const workSheetValue = Number((form.elements.namedItem('workSheetValue') as HTMLInputElement).value || 1);

      const rawValueColumns = (form.elements.namedItem('valueColumns') as HTMLInputElement).value;

      if (!file) {
        alert("Please select an Excel file!");
        setIsLoading(false);
        return;
      }

      // Xử lý chuỗi "2,3,4" thành mảng [2, 3, 4]
      const valueColumns = rawValueColumns.split(",").map(v => Number(v.trim()));
      const invalidColumns = valueColumns.filter(v => isNaN(v) || v <= 0);

      if (invalidColumns.length > 0) {
        alert(`Invalid valueColumns: ${invalidColumns.join(", ")}. Must be numbers > 0`);
        setIsLoading(false);
        return;
      }

      const fileUrl = await uploadFileToVercel(file);
      const response = await apiTools.generateLocales({
        fileUrl,
        workSheetKey,
        keyColumn,
        workSheetValue,
        valueColumns
      });

      setResultUrl(response.data?.url);
    } catch (error: any) {
      alert(error.message || "Failed to generate locales");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
      <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span>📦</span> Generate Locales
      </h4>

      <form onSubmit={handleGenerate} className="space-y-5">
        {/* FILE INPUT BOX */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">Excel File</label>
            <a
              href="/templates/cs/template_generate_locales.xlsx"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample Template
            </a>
          </div>
          <input
            type="file"
            name="file"
            accept=".xlsx, .xls, .csv, .ods"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />
        </div>

        {/* CẤU HÌNH CỘT / WORKSHEET */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Worksheet Key (contain keys)</label>
            <input
              type="text"
              name="workSheetKey"
              placeholder="Default: 1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Key Column (specify key)</label>
            <input
              type="text"
              name="keyColumn"
              placeholder="Default: 1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Worksheet Value (contain values)</label>
            <input
              type="text"
              name="workSheetValue"
              placeholder="Default: 1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>
        </div>

        {/* VALUE COLUMNS INPUT (Nổi bật) */}
        <div className="flex flex-col gap-1.5 bg-teal-50/40 p-4 rounded-xl border border-teal-100">
          <label className="text-sm font-semibold text-teal-800 flex items-center gap-1">
            Value Columns <span className="text-xs font-normal text-teal-600">(Separated by ",", e.g: 2,3,4)</span>
          </label>
          <input
            type="text"
            name="valueColumns"
            placeholder="e.g: 2,3,4"
            required
            className="w-full px-4 py-2.5 border border-teal-200 rounded-lg text-sm font-medium text-teal-900 placeholder-teal-400/70 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
          />
        </div>

        {/* BUTTON SUBMIT */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl shadow-md transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? 'Processing...' : 'Generate ZIP'}
        </button>
      </form>

      {/* TRẠNG THÁI LOADING */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center mt-6 space-y-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500">Processing files, please wait...</div>
        </div>
      )}

      {/* HIỂN THỊ KẾT QUẢ */}
      {resultUrl && !isLoading && (
        <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <p className="text-sm text-emerald-800 mb-2 font-semibold">Success!</p>
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 font-bold text-sm rounded-lg border border-emerald-300 shadow-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
          >
            📥 Click here to download ZIP
          </a>
        </div>
      )}
    </div>
  );
};

export default FormGenerateLocales;
