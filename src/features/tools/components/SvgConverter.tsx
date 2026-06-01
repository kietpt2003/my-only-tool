import React from 'react';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    ImageTracer: any;
  }
}

const SvgConverter: React.FC = () => {
  const navigate = useNavigate();

  const [inputCode, setInputCode] = React.useState<string>('');
  const [outputCode, setOutputCode] = React.useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false);
  const [isTracing, setIsTracing] = React.useState<boolean>(false);
  const [isFakeSvg, setIsFakeSvg] = React.useState<boolean>(false);
  const [copyText, setCopyText] = React.useState<string>('Copy Code');
  const [status, setStatus] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 1. HÀM CHUẨN HÓA SVG THẬT (NORMALIZE)
  const analyzeAndNormalizeSvg = (svgString: string) => {
    setIsAnalyzing(true);
    setOutputCode('');
    setStatus(null);
    setIsFakeSvg(false);

    setTimeout(() => {
      const trimmedSvg = svgString.trim();
      const detectFake = /<image\s/i.test(trimmedSvg) || /data:image\/(png|jpeg|jpg)/i.test(trimmedSvg);

      if (detectFake) {
        setIsFakeSvg(true);
        setStatus({
          message: "🚨 FAKE SVG DETECTED! This file contains static images (PNG/JPG) embedded by the designer. The `currentColor` property cannot be used. Please click 'Magical Trace' or ask the designer to redraw!",
          type: 'error'
        });
        setOutputCode(trimmedSvg);
        setIsAnalyzing(false);
        return;
      }

      let cleanSvg = trimmedSvg;
      cleanSvg = cleanSvg.replace(/<defs>[\s\S]*?<\/defs>/gi, "");
      cleanSvg = cleanSvg.replace(/<clipPath[\s\S]*?<\/clipPath>/gi, "");
      cleanSvg = cleanSvg.replace(/clip-path="url\([^)]+\)"/gi, "");
      cleanSvg = cleanSvg.replace(/<desc>[\s\S]*?<\/desc>/gi, "");

      cleanSvg = cleanSvg.replace(/fill="(?!none)(?!white)[^"]+"/gi, 'fill="currentColor"');
      cleanSvg = cleanSvg.replace(/stroke="(?!none)(?!white)[^"]+"/gi, 'stroke="currentColor"');

      if (/<svg\s/i.test(cleanSvg) && !/viewBox="/i.test(cleanSvg)) {
        setStatus({
          message: "⚠️ This SVG is missing a viewBox! react-native-svg may render at the wrong size.",
          type: 'error'
        });
      } else {
        setStatus({
          message: "✅ SVG normalization successful! Hardcoded colors have been converted to currentColor.",
          type: 'success'
        });
      }

      cleanSvg = cleanSvg.replace(/width="[^"]+"/i, 'width="100%"');
      cleanSvg = cleanSvg.replace(/height="[^"]+"/i, 'height="100%"');

      setOutputCode(cleanSvg);
      setIsAnalyzing(false);
    }, 800);
  };

  // 2. HÀM ĐỒ NÉT "PHÉP THUẬT" (MAGICAL TRACE)
  const handleMagicalTrace = () => {
    if (!inputCode.trim()) return;

    setIsTracing(true);
    setIsAnalyzing(true);

    const match = inputCode.match(/href="(data:image\/(png|jpeg|jpg);base64,[^"]+)"/i);

    if (!match || !match[1]) {
      setStatus({ message: "❌ Error: No embedded image data found for auto-focusing.", type: 'error' });
      setIsTracing(false);
      setIsAnalyzing(false);
      return;
    }

    const base64ImageUrl = match[1];

    if (!window.ImageTracer) {
      alert("ImageTracer library is not loaded yet! Please check your network connection.");
      setIsTracing(false);
      setIsAnalyzing(false);
      return;
    }

    window.ImageTracer.imageToSVG(
      base64ImageUrl,
      (tracedSvgString: string) => {
        setIsAnalyzing(false);
        setIsTracing(false);

        let finalTracedSvg = tracedSvgString;

        const wMatch = finalTracedSvg.match(/width="([\d.]+)"/i);
        const hMatch = finalTracedSvg.match(/height="([\d.]+)"/i);

        finalTracedSvg = finalTracedSvg.replace(/width="[^"]+"/gi, "");
        finalTracedSvg = finalTracedSvg.replace(/height="[^"]+"/gi, "");

        if (wMatch && hMatch) {
          finalTracedSvg = finalTracedSvg.replace(/<svg\s/i, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}" width="100%" height="100%" `);
        } else {
          finalTracedSvg = finalTracedSvg.replace(/<svg\s/i, `<svg viewBox="0 0 512 512" width="100%" height="100%" `);
        }

        finalTracedSvg = finalTracedSvg.replace(/<(path|rect)[^>]*fill="(rgb\(255,\s*255,\s*255\)|#ffffff|#fff)"[^>]*\/?>(<\/\1>)?/gi, "");
        finalTracedSvg = finalTracedSvg.replace(/\sstroke="[^"]*"/gi, "");
        finalTracedSvg = finalTracedSvg.replace(/\sstroke-width="[^"]*"/gi, "");

        finalTracedSvg = finalTracedSvg.replace(/fill="[^"]+"/gi, 'fill="currentColor"');

        setOutputCode(finalTracedSvg);
        setIsFakeSvg(false);
        setStatus({
          message: "✨ Magic successful! The fake image has been successfully vectorized and maximized to fill the viewport.",
          type: 'success'
        });
      },
      {
        ltres: 0.5,
        qtres: 0.5,
        pathomit: 4,
        colorsampling: 0,
        strokewidth: 1,
      }
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setInputCode(result);
      analyzeAndNormalizeSvg(result);
    };
    reader.readAsText(file);
  };

  const handleCopyCode = () => {
    if (!outputCode) return;
    navigator.clipboard.writeText(outputCode).then(() => {
      setCopyText('Copied! 🎉');
      setTimeout(() => setCopyText('Copy Code'), 2000);
    });
  };

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-6 space-y-6">

      {/* HEADER SECTION */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-teal-600 hover:text-white border border-slate-200 text-teal-600 rounded-xl transition-all cursor-pointer"
          title="Back to Dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Smart SVG Converter</h2>
          <p className="text-xs text-slate-500 mt-0.5">Optimizing and standardizing SVG for React Native (currentColor ready)</p>
        </div>
      </div>

      {/* STATUS BOX */}
      {status && (
        <div className={`p-4 rounded-xl text-sm font-medium border transition-all animate-[fadeIn_0.3s_ease-out]
          ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}
        >
          {status.message}
        </div>
      )}

      {/* MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[650px]">

        {/* PANEL TRÁI: INPUT CODE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">1. Input SVG Code</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-dashed border-teal-300 rounded-lg text-xs font-semibold hover:bg-teal-600 hover:text-white transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              Upload .svg File
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".svg" className="hidden" />
          </div>

          <textarea
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Paste your SVG code from Figma here..."
            className="w-full flex-1 min-h-[350px] p-4 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl font-mono text-xs text-slate-600 bg-slate-50/40 outline-none resize-none transition-all"
          />

          <div className="flex gap-3">
            <button
              onClick={() => analyzeAndNormalizeSvg(inputCode)}
              disabled={isAnalyzing || !inputCode.trim()}
              className="flex-1 py-3.5 bg-teal-600 text-white font-semibold rounded-xl text-sm shadow-md transition-all hover:bg-teal-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {isAnalyzing && !isTracing ? 'Analyzing...' : 'Analyze & Convert'}
            </button>

            <button
              onClick={handleMagicalTrace}
              disabled={!isFakeSvg || isTracing}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl text-sm shadow-md transition-all hover:brightness-105 active:scale-98 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            >
              {isTracing ? '✨ Casting Spell (Tracing)...' : '🪄 Magical Trace (Fake SVG → Vector)'}
            </button>
          </div>
        </div>

        {/* PANEL PHẢI: RESULT & PREVIEW (NỀN SÁNG TOÀN DIỆN) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Result & Preview</h3>
            <button
              onClick={handleCopyCode}
              disabled={!outputCode}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5
                ${copyText.includes('🎉') ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              {copyText}
            </button>
          </div>

          <div className="flex flex-col gap-4 flex-1">

            {/* 2A. CANVAS PREVIEW NỀN LƯỚI SÁNG CARO */}
            <div
              className="w-full border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center h-[320px] relative overflow-hidden shadow-inner group transition-all"
              style={{
                backgroundColor: '#ffffff',
                backgroundImage: 'linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0'
              }}
            >
              <span className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200/60 shadow-xs">
                Light Transparent Canvas
              </span>

              {outputCode ? (
                <div
                  className="w-72 h-72 text-teal-600 flex items-center justify-center animate-[scaleIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)] drop-shadow-xs"
                  dangerouslySetInnerHTML={{ __html: outputCode }}
                />
              ) : (
                <div className="text-center text-slate-400 space-y-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mx-auto">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <p className="text-xs font-semibold tracking-wide">SVG Canvas Preview Area</p>
                </div>
              )}
            </div>

            {/* 2B. TEXTAREA HIỂN THỊ CODE - 👉 ĐÃ CHUYỂN SANG NỀN SÁNG (bg-slate-50) DỄ ĐỌC */}
            <textarea
              readOnly
              value={outputCode}
              placeholder="React Native SVG code will appear here..."
              className="w-full p-4 border border-slate-200 focus:border-teal-500 rounded-xl font-mono text-[11px] text-slate-700 bg-slate-50 outline-none resize-none flex-1 min-h-[220px] shadow-inner"
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default SvgConverter;
