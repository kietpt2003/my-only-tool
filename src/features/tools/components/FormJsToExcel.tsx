import React from 'react';

import { apiTools } from '@/services/apiTools';
import { uploadFileToVercel } from '@/services/uploadService';

function FormJsToExcel() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const handleJsToExcel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResultUrl(null);
    try {
      const form = e.currentTarget;
      const fileInput = form.elements.namedItem('file') as HTMLInputElement;
      const file = fileInput.files?.[0];

      if (!file) {
        alert("Please select a file!");
        setIsLoading(false);
        return;
      }

      const uploadedFileUrl = await uploadFileToVercel(file);
      const response = await apiTools.convertJsToExcel(uploadedFileUrl);

      setResultUrl(response.data.url);
    } catch (error: any) {
      alert(error.message || "Failed to convert JS to Excel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
      <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span>⚙️</span> Convert JS to Excel
      </h4>

      <form onSubmit={handleJsToExcel}>
        {/* FILE UPLOAD BOX */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">Upload JS File</label>
            <a
              href="/templates/dev/template_js.js"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample Template
            </a>
          </div>

          <input
            type="file"
            name="file"
            accept=".js"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl shadow-md transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? 'Uploading...' : 'Convert JS → Excel'}
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
}

export default FormJsToExcel;
