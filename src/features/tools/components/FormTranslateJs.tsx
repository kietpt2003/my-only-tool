import React from 'react';
import { observer } from 'mobx-react-lite';

import { apiTools } from '@/services/apiTools';
import { uploadFileToVercel } from '@/services/uploadService';
import { useStore } from '@/store';

// 👉 Bọc observer để component tự vẽ lại khi MobX languagesStore thay đổi
const FormTranslateJs: React.FC = observer(() => {
  const {
    languagesStore: { languages }
  } = useStore();

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const handleTranslateJs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResultUrl(null);

    try {
      const form = e.currentTarget;
      const fileInput = form.elements.namedItem('fileOriginal') as HTMLInputElement;
      const file = fileInput.files?.[0];

      if (!file) {
        alert("Please select a file!");
        setIsLoading(false);
        return;
      }

      const checkboxes = form.querySelectorAll('input[name="targetLangs"]:checked');
      const targetLangs = Array.from(checkboxes).map((cb) => (cb as HTMLInputElement).value);

      if (targetLangs.length === 0) {
        alert("⚠️ Please select at least one target language.");
        setIsLoading(false);
        return;
      }

      const uploadedFileUrl = await uploadFileToVercel(file);

      const response = await apiTools.translateJs({
        fileUrl: uploadedFileUrl,
        targetLangs: targetLangs
      });

      setResultUrl(response.data.url);

    } catch (error: any) {
      alert(error.message || "Có lỗi xảy ra trong quá trình dịch tự động!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
      {/* HEADER BLOCK */}
      <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <span>🌍</span> Auto Translate JS File
      </h4>
      <p className="text-xs text-slate-500 mt-1 mb-6">
        Powered by Google Translate. Automatically translates your JS language object values into target languages.
      </p>

      <form onSubmit={handleTranslateJs} className="space-y-5">
        {/* ORIGINAL FILE INPUT BOX */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <label className="font-semibold text-slate-700 text-sm">Original JS File</label>
            <a
              href="/templates/dev/template_js.js"
              download
              className="text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-1 transition-colors"
            >
              📥 Sample Template
            </a>
          </div>
          <input
            type="file"
            name="fileOriginal"
            accept=".js"
            required
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all cursor-pointer"
          />
        </div>

        {/* TARGET LANGUAGES CONTAINER */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Target Languages <span className="font-normal text-xs text-slate-500">(Select one or more)</span></label>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {languages.length === 0 ? (
              <span className="text-sm text-slate-400 italic col-span-full">
                Loading languages or no languages configured in Admin tab...
              </span>
            ) : (
              languages.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center gap-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer select-none shadow-xs hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    name="targetLangs"
                    value={lang.code}
                    className="w-4 h-4 text-violet-600 border-slate-300 rounded-sm focus:ring-violet-500 accent-violet-600"
                  />
                  <span>
                    {lang.name} <span className="text-xs text-slate-400 uppercase">({lang.code})</span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* BUTTON SUBMIT */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-violet-600 text-white font-semibold rounded-xl shadow-md shadow-violet-600/10 transition-all hover:bg-violet-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? 'Translating...' : 'Translate JS File'}
        </button>
      </form>

      {/* TRẠNG THÁI LOADING */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center mt-6 space-y-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500 text-center">Processing... This may take a while.</div>
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
});

export default FormTranslateJs;
