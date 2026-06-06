import React from 'react';
import { Link } from 'react-router-dom';

interface JsonNodeProps {
  value: any;
  name?: string | null;
  isLast?: boolean;
  isDarkMode?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ value, name, isLast = true, isDarkMode = false }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  const renderValue = () => {
    if (typeof value === 'string') return <span className={isDarkMode ? "text-[#4ade80]" : "text-[#059669]"}>"{value}"</span>;
    if (typeof value === 'number') return <span className="text-[#d97706]">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-[#2563eb]">{value ? 'true' : 'false'}</span>;
    if (value === null) return <span className="text-[#ef4444] font-bold">null</span>;
    if (typeof value === 'undefined') return <span className="text-[#94a3b8] italic">undefined</span>;
    return <span>{String(value)}</span>;
  };

  return (
    <div className={`block ${name ? 'pl-5' : 'pl-0'}`}>
      {isObject && (
        <span
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="cursor-pointer inline-block w-[20px] text-[#94a3b8] hover:text-[#334155] select-none"
        >
          {isCollapsed ? '▶' : '▼'}
        </span>
      )}

      {name && <span className={`font-bold ${isDarkMode ? 'text-[#fb7185]' : 'text-[#be185d]'}`}>"{name}": </span>}

      {isObject ? (
        <>
          <span>{isArray ? '[' : '{'}</span>

          {isCollapsed ? (
            <span className="text-[#94a3b8]"> ... </span>
          ) : (
            <div className="pl-5">
              {Object.keys(value).map((key, index, arr) => (
                <JsonNode
                  key={key}
                  value={value[key]}
                  name={isArray ? null : key}
                  isLast={index === arr.length - 1}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          )}

          <span>{isArray ? ']' : '}'}</span>
        </>
      ) : (
        renderValue()
      )}

      {!isLast && <span className="text-[#334155]">,</span>}
    </div>
  );
};

// ==========================================
// THUẬT TOÁN BÓC TÁCH LOG VÀ JSON (MIXED EXTRACTOR)
// ==========================================
type ParsedBlock =
  | { type: 'json'; data: any }
  | { type: 'text'; content: string };

const extractMixedContent = (str: string): ParsedBlock[] => {
  const results: ParsedBlock[] = [];

  // Giới hạn an toàn tránh treo trình duyệt nếu log quá lớn
  if (str.length > 500000) {
    results.push({ type: 'text', content: str });
    return results;
  }

  let i = 0;
  let textBuffer = "";

  while (i < str.length) {
    if (str[i] === '{' || str[i] === '[') {
      let count = 0;
      let isString = false;
      let escape = false;
      let j = i;

      for (; j < str.length; j++) {
        if (str[j] === '"' && !escape) isString = !isString;
        if (str[j] === '\\' && !escape) escape = true;
        else escape = false;

        if (!isString) {
          if (str[j] === '{' || str[j] === '[') count++;
          if (str[j] === '}' || str[j] === ']') count--;
        }

        if (count === 0) break;
      }

      // Nếu dấu ngoặc cân bằng (có khả năng là 1 JSON hoàn chỉnh)
      if (count === 0) {
        const possibleJson = str.substring(i, j + 1);
        try {
          const parsed = JSON.parse(possibleJson);
          if (textBuffer.trim()) {
            results.push({ type: 'text', content: textBuffer.trim() });
          }
          results.push({ type: 'json', data: parsed });
          textBuffer = "";
          i = j + 1;
          continue; // Bỏ qua đoạn code bên dưới, quét tiếp đoạn mới
        } catch (e) {
          // Nếu parse lỗi (ngoặc cân bằng nhưng sai cú pháp), mặc kệ cho rớt xuống textBuffer
        }
      }
    }
    textBuffer += str[i];
    i++;
  }

  // Đẩy phần chữ còn sót lại
  if (textBuffer.trim()) {
    results.push({ type: 'text', content: textBuffer.trim() });
  }

  return results;
};

// ==========================================
// COMPONENT CHÍNH
// ==========================================
type OutputMode = 'pretty' | 'minify' | 'ts' | null;

const JsonFormatter: React.FC = () => {
  const [input, setInput] = React.useState<string>('');
  const [parsedBlocks, setParsedBlocks] = React.useState<ParsedBlock[] | null>(null);
  const [tsOutput, setTsOutput] = React.useState<string>('');
  const [outputMode, setOutputMode] = React.useState<OutputMode>(null);
  const [status, setStatus] = React.useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);

  // 👉 NÂNG CẤP PARSER HỖ TRỢ MIXED LOGS
  const parseInput = (): ParsedBlock[] | null => {
    const raw = input.trim();
    if (!raw) {
      setStatus({ message: "⚠️ Paste in JSON or JS Object into left box.", type: 'error' });
      return null;
    }

    // 1. Thử parse trực tiếp 1 JSON chuẩn
    try {
      const obj = JSON.parse(raw);
      setStatus(null);
      return [{ type: 'json', data: obj }];
    } catch (jsonErr: any) {
      // 2. Thử parse dạng JS Object (Eval)
      try {
        const jsEval = new Function(`return (${raw});`);
        const obj = jsEval();
        if (obj !== null && typeof obj === 'object') {
          setStatus(null);
          return [{ type: 'json', data: obj }];
        }
        throw new Error("Eval failed");
      } catch (jsErr) {
        // 3. Nếu cả 2 đều hỏng, bóc tách Log Console
        const mixed = extractMixedContent(raw);
        const hasJson = mixed.some(b => b.type === 'json');

        if (hasJson) {
          setStatus({ message: "✅ Bóc tách JSON hợp lệ thành công từ trong đống Log/Text!", type: 'warning' });
          return mixed;
        } else {
          setStatus({ message: `❌ Cú pháp sai hoàn toàn:\n${jsonErr.message}`, type: 'error' });
          return null;
        }
      }
    }
  };

  const handleClear = () => {
    setInput('');
    setParsedBlocks(null);
    setTsOutput('');
    setOutputMode(null);
    setStatus(null);
  };

  const handleFormat = () => {
    const blocks = parseInput();
    if (blocks) {
      setParsedBlocks(blocks);
      setOutputMode('pretty');
      if (blocks.length === 1 && blocks[0].type === 'json') {
        setStatus({ message: "✅ Render JSON success!", type: 'success' });
      }
    }
  };

  const handleMinify = () => {
    const blocks = parseInput();
    if (blocks) {
      setParsedBlocks(blocks);
      setOutputMode('minify');
      if (blocks.length === 1 && blocks[0].type === 'json') {
        setStatus({ message: "✅ JSON compressed into a single line!", type: 'success' });
      }
    }
  };

  const handleTsGen = () => {
    const blocks = parseInput();
    if (!blocks) return;

    const jsonBlocks = blocks.filter(b => b.type === 'json');
    if (jsonBlocks.length === 0) return;

    let tsInterfaces = "";
    const interfaceNames = new Set<string>();

    const getType = (value: any, keyName: string): string => {
      if (value === null) return "null";
      if (typeof value === "undefined") return "undefined";
      const type = typeof value;
      if (type === "string" || type === "number" || type === "boolean") return type;
      if (Array.isArray(value)) {
        if (value.length === 0) return "any[]";
        const firstItemType = getType(value[0], keyName + "Item");
        return `${firstItemType}[]`;
      }
      if (type === "object") {
        const interfaceName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        let finalName = interfaceName;
        let counter = 1;
        while (interfaceNames.has(finalName)) {
          finalName = interfaceName + counter;
          counter++;
        }
        interfaceNames.add(finalName);

        let fields = "";
        for (const [k, v] of Object.entries(value)) {
          const fieldType = getType(v, k);
          const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;
          fields += `  ${safeKey}: ${fieldType};\n`;
        }
        const interfaceCode = `export interface ${finalName} {\n${fields}}\n\n`;
        tsInterfaces = interfaceCode + tsInterfaces;
        return finalName;
      }
      return "any";
    };

    // Tạo interface cho tất cả JSON bóc tách được
    jsonBlocks.forEach((block, index) => {
      const rootName = jsonBlocks.length > 1 ? `RootObject${index + 1}` : "RootObject";
      getType(block.data, rootName);
    });

    setTsOutput(tsInterfaces.trim());
    setOutputMode('ts');
    setStatus({ message: "🪄 I've transformed JSON into TypeScript Interfaces!", type: 'success' });
  };

  const handleCopy = () => {
    let contentToCopy = '';
    if (outputMode === 'pretty' || outputMode === 'minify') {
      if (parsedBlocks) {
        contentToCopy = parsedBlocks.map(b => {
          if (b.type === 'json') {
            return outputMode === 'pretty' ? JSON.stringify(b.data, null, 4) : JSON.stringify(b.data);
          } else {
            return b.content;
          }
        }).join('\n\n');
      }
    } else if (outputMode === 'ts') {
      contentToCopy = tsOutput;
    }

    if (!contentToCopy) {
      setStatus({ message: "⚠️ There is no data to copy!", type: 'error' });
      return;
    }
    navigator.clipboard.writeText(contentToCopy)
      .then(() => setStatus({ message: "📋 Copied to clipboard!", type: 'success' }))
      .catch((err) => setStatus({ message: "❌ Failed to copy: " + err, type: 'error' }));
  };

  return (
    <div className="bg-[#f1f5f9] text-[#334155] font-sans min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 py-10">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-[30px]">
          <Link
            to="/"
            title="Back to Dashboard"
            className="flex items-center justify-center w-10 h-10 bg-white rounded-xl text-[#0d9488] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:bg-[#0d9488] hover:text-white hover:-translate-x-0.5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h2 className="text-[24px] font-bold text-[#1e293b] leading-tight">Smart JSON Formatter & TS Gen</h2>
            <p className="text-[14px] text-[#64748b] mt-1">Format, extract mixed logs, and automatically generate TypeScript interfaces.</p>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-150px)] min-h-[700px]">

          {/* PANEL TRÁI: INPUT */}
          <div className="bg-white p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[18px] font-semibold text-[#0f172a]">1. Paste JSON / RN Logs Here</h3>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-[14px] font-semibold rounded-[10px] bg-[#fee2e2] text-[#ef4444] border border-[#fca5a5] hover:bg-red-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste pure JSON or RN Console Logs here..."
              className="w-full flex-1 p-4 border-2 border-[#e2e8f0] rounded-xl resize-none font-mono text-[13px] leading-[1.6] text-[#475569] bg-[#f8fafc] outline-none transition-all focus:border-[#0d9488] focus:bg-white focus:ring-[4px] focus:ring-[#0d9488]/10"
            />

            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={handleFormat} className="flex-1 flex justify-center items-center gap-2 py-[14px] px-[20px] bg-[#0d9488] text-white rounded-[10px] text-[14px] font-semibold shadow-[0_4px_12px_rgba(13,148,136,0.2)] hover:bg-[#0f766e] transition-all hover:-translate-y-[2px] cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H3M21 6H3M21 14H3M21 18H3" /></svg>
                Format (Pretty)
              </button>

              <button onClick={handleMinify} className="flex-1 flex justify-center items-center gap-2 py-[14px] px-[20px] bg-[#0f766e] text-white rounded-[10px] text-[14px] font-semibold shadow-[0_4px_12px_rgba(13,148,136,0.2)] hover:bg-[#0b5c56] transition-all hover:-translate-y-[2px] cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14l6-6 2 2 8-8" /></svg>
                Minify
              </button>

              <button onClick={handleTsGen} className="w-full basis-full flex justify-center items-center gap-2 py-[14px] px-[20px] bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white rounded-[10px] text-[14px] font-semibold shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:-translate-y-[2px] transition-all cursor-pointer">
                🪄 Auto-Gen TypeScript Interfaces
              </button>
            </div>
          </div>

          {/* PANEL PHẢI: OUTPUT */}
          <div className="bg-white p-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[18px] font-semibold text-[#0f172a]">2. Output</h3>
              <div className="flex gap-2 items-center">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="px-4 py-2 text-[14px] font-semibold rounded-[10px] bg-[#f0fdfa] text-[#0d9488] border border-[#99f6e4] hover:bg-[#ccfbf1] transition-colors cursor-pointer">
                  {isDarkMode ? 'Light Theme' : 'Dark Theme'}
                </button>
                <button onClick={handleCopy} className="px-4 py-2 text-[14px] font-semibold rounded-[10px] bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0] hover:bg-[#e2e8f0] hover:border-[#cbd5e1] transition-colors cursor-pointer">
                  Copy Result
                </button>
              </div>
            </div>

            {/* STATUS MESSAGE */}
            {status && (
              <div className={`px-4 py-[14px] rounded-[10px] mb-5 text-[13px] font-medium transition-all duration-300 
                ${status.type === 'success' ? 'bg-[#ecfdf5] text-[#065f46] border border-[#6ee7b7]' : ''}
                ${status.type === 'warning' ? 'bg-[#fffbeb] text-[#b45309] border border-[#fcd34d]' : ''}
                ${status.type === 'error' ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fca5a5]' : ''}`}>
                {status.message}
              </div>
            )}

            {/* RENDER ZONE */}
            <div className={`flex-1 overflow-auto border rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a] border-[#334155]' : 'bg-white border-[#e2e8f0]'}`}>
              <div className={`p-[15px] font-mono text-[14px] whitespace-pre ${isDarkMode ? 'text-[#f8fafc]' : 'text-[#334155]'}`}>

                {/* --- RENDER PRETTY --- */}
                {outputMode === 'pretty' && parsedBlocks && (
                  parsedBlocks.length === 1 && parsedBlocks[0].type === 'json' ? (
                    // Nếu là 1 JSON sạch 100%, render Tree nguyên bản
                    <JsonNode value={parsedBlocks[0].data} isDarkMode={isDarkMode} />
                  ) : (
                    // Nếu là Logs hỗn hợp, render phân khối tách biệt
                    <div className="flex flex-col gap-4">
                      {parsedBlocks.map((block, i) => (
                        block.type === 'json' ? (
                          <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50/50'} shadow-sm overflow-x-auto`}>
                            <JsonNode value={block.data} isDarkMode={isDarkMode} />
                          </div>
                        ) : (
                          <div key={i} className={`p-4 rounded-xl border font-sans text-[13px] whitespace-pre-wrap break-all leading-[1.6] ${isDarkMode ? 'border-rose-900/50 bg-rose-950/30 text-rose-400' : 'border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]'} shadow-sm`}>
                            <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-[11px] opacity-80">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                              Log Text / Invalid Syntax
                            </div>
                            {block.content}
                          </div>
                        )
                      ))}
                    </div>
                  )
                )}

                {/* --- RENDER MINIFY --- */}
                {outputMode === 'minify' && parsedBlocks && (
                  parsedBlocks.length === 1 && parsedBlocks[0].type === 'json' ? (
                    <div className={`whitespace-normal break-all leading-[1.6] ${isDarkMode ? 'text-[#4ade80]' : 'text-[#059669]'}`}>
                      {JSON.stringify(parsedBlocks[0].data)}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {parsedBlocks.map((block, i) => (
                        block.type === 'json' ? (
                          <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50/50'} whitespace-normal break-all leading-[1.6] ${isDarkMode ? 'text-[#4ade80]' : 'text-[#059669]'}`}>
                            {JSON.stringify(block.data)}
                          </div>
                        ) : (
                          <div key={i} className={`p-4 rounded-xl border font-sans text-[13px] whitespace-pre-wrap break-all leading-[1.6] ${isDarkMode ? 'border-rose-900/50 bg-rose-950/30 text-rose-400' : 'border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]'}`}>
                            <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-[11px] opacity-80">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                              Log Text / Invalid Syntax
                            </div>
                            {block.content}
                          </div>
                        )
                      ))}
                    </div>
                  )
                )}

                {/* --- RENDER TS INTERFACES --- */}
                {outputMode === 'ts' && (
                  <textarea
                    readOnly
                    value={tsOutput}
                    className={`w-full h-full min-h-[350px] bg-transparent outline-none resize-none ${isDarkMode ? 'text-[#4ade80]' : 'text-[#059669]'}`}
                  />
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default JsonFormatter;
