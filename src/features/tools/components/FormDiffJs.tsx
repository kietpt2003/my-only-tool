import React from 'react';

import { apiTools } from '@/services/apiTools';
import { uploadFileToVercel } from '@/services/uploadService';

function FormDiffJs() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const handleDiffJs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResultUrl(null);

    try {
      const form = e.currentTarget;

      const fileOldInput = form.elements.namedItem('fileOld') as HTMLInputElement;
      const fileNewInput = form.elements.namedItem('fileNew') as HTMLInputElement;

      const fileOld = fileOldInput.files?.[0];
      const fileNew = fileNewInput.files?.[0];

      if (!fileOld || !fileNew) {
        alert("Please select both files (Old and New).!");
        setIsLoading(false);
        return;
      }

      const [oldFileUrl, newFileUrl] = await Promise.all([
        uploadFileToVercel(fileOld),
        uploadFileToVercel(fileNew)
      ]);

      const response = await apiTools.diffJs({
        oldFileUrl: oldFileUrl,
        newFileUrl: newFileUrl
      });

      setResultUrl(response.data.url);

    } catch (error: any) {
      alert(error.message || "Failed to compare JS files");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
      <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span>🔍</span> Compare 2 JS Files
      </h4>

      <form onSubmit={handleDiffJs}>
        {/* OLD JS FILE */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-[20px]">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">Old JS File</label>
            <a
              href="/templates/dev/template_compare_old_file.js"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample Old File
            </a>
          </div>
          <input
            type="file"
            name="fileOld"
            accept=".js"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />
        </div>

        {/* NEW JS FILE */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">New JS File</label>
            <a
              href="/templates/dev/template_compare_new_file.js"
              download
              className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample New File
            </a>
          </div>
          <input
            type="file"
            name="fileNew"
            accept=".js"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
          />
        </div>

        {/* BUTTON SUBMIT */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl shadow-md transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? 'Comparing...' : 'Compare JS Files'}
        </button>
      </form>

      {/* TRẠNG THÁI LOADING */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center mt-6 space-y-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500">Processing... This may take a while.</div>
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
            📥 Click here to download your file
          </a>
        </div>
      )}
    </div>
  );
}

export default FormDiffJs;
