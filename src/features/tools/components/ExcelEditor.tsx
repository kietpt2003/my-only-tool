import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

// Định nghĩa cấu trúc dữ liệu cho mỗi hàng Excel
interface ExcelRowData {
  id: string; // Khóa định danh duy nhất cho React loop rendering
  key: string;
  old: string;
  new: string;
  status: 'Unchanged' | 'Modified' | 'Added' | 'Removed';
  hasError?: boolean;
}

const ExcelEditor: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);

  // States quản lý dữ liệu bảng chính
  const [rows, setRows] = React.useState<ExcelRowData[]>([]);
  const [insertIndex, setInsertIndex] = React.useState<string>('');

  // States quản lý hệ thống hover chèn dòng động
  const [floatingBtn, setFloatingBtn] = React.useState<{ show: boolean; top: number; left: number; index: number }>({
    show: false,
    top: 0,
    left: 0,
    index: -1,
  });

  // 1. CHÈN MỘT DÒNG MỚI (TẠO ID NGẪU NHIÊN CHỐNG XUNG ĐỘT STATE)
  const generateNewRow = (overrides?: Partial<ExcelRowData>): ExcelRowData => ({
    id: Math.random().toString(36).substring(2, 9),
    key: '',
    old: '',
    new: '',
    status: 'Unchanged',
    hasError: false,
    ...overrides,
  });

  // 2. LOGIC ĐỒNG BỘ TRẠNG THÁI MÀU SẮC DỰA TRÊN NỘI DUNG MỚI/CŨ
  const handleInputChange = (id: string, field: 'key' | 'new', value: string) => {
    setRows((prevRows) => {
      const updatedRows = prevRows.map((row) => {
        if (row.id !== id) return row;

        const newRow = { ...row, [field]: value };

        // Nếu đang ở trạng thái Unchanged/Modified thì tự so sánh để gán nhãn
        if (newRow.status === 'Unchanged' || newRow.status === 'Modified') {
          newRow.status = newRow.new !== newRow.old ? 'Modified' : 'Unchanged';
        }
        return newRow;
      });

      // Kiểm tra trùng lặp Key trên toàn mảng dữ liệu vừa cập nhật
      return updatedRows.map((row) => {
        if (!row.key.trim()) return { ...row, hasError: false };
        const isDuplicate = updatedRows.some((r) => r.id !== row.id && r.key.trim() === row.key.trim());
        return { ...row, hasError: isDuplicate };
      });
    });
  };

  // 3. THAY ĐỔI TRẠNG THÁI STATUS CHỦ ĐỘNG QUA SELECT BOX
  const handleStatusChange = (id: string, status: ExcelRowData['status']) => {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, status } : row))
    );
  };

  // 4. XỬ LÝ IMPORT FILE EXCEL (DÙNG SHEETJS)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<any>(sheet);

        const importedRows = rawData.map((item) => {
          const key = item['Key'] || item['key'] || '';
          const oldVal = item['Old Value'] || item['old'] || '';
          const newVal = item['New Value'] || item['new'] || '';
          const status = item['Status'] || item['status'] || 'Unchanged';

          return generateNewRow({ key, old: oldVal, new: newVal, status });
        });

        // Kiểm tra trùng khóa sau khi nạp mảng
        const validatedRows = importedRows.map((row) => {
          if (!row.key.trim()) return row;
          const isDuplicate = importedRows.some((r) => r.id !== row.id && r.key.trim() === row.key.trim());
          return { ...row, hasError: isDuplicate };
        });

        setRows(validatedRows);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        alert('An error occurred while reading the Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 5. CHÈN DÒNG CHỦ ĐỘNG QUA Ô NHẬP INDEX CỐ ĐỊNH
  const handleInsertByInputIndex = () => {
    const idx = parseInt(insertIndex, 10);
    const newRow = generateNewRow({ status: 'Added' });

    setRows((prev) => {
      const copy = [...prev];
      if (!isNaN(idx) && idx >= 0 && idx <= copy.length) {
        copy.splice(idx, 0, newRow);
      } else {
        copy.push(newRow);
      }
      return copy;
    });
    setInsertIndex('');
  };

  // 6. XUẤT FILE FILE EXCEL CHỨA KEY CUỐI CÙNG
  const handleExportFinalExcel = () => {
    const validData = rows
      .filter((row) => row.status !== 'Removed')
      .map((row) => [row.key, row.new]);

    if (validData.length === 0) {
      alert('No data available to export!');
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet(validData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Final');
    XLSX.writeFile(wb, 'Final_Data.xlsx');
  };

  // 7. THUẬT TOÁN HOVER TÍNH TOÁN VỊ TRÍ ĐƯỜNG KẺ VÀ NÚT CHÈN ➕ CHÍNH XÁC CAO
  const handleMouseMoveTable = (e: React.MouseEvent<HTMLTableSectionElement>) => {
    if (!tbodyRef.current || rows.length === 0) return;

    const trElements = Array.from(tbodyRef.current.querySelectorAll('tr'));
    const containerRect = tbodyRef.current.closest('.editor-scrollbar')?.getBoundingClientRect();
    if (!containerRect) return;

    let found = false;

    for (let i = 0; i < trElements.length; i++) {
      const rect = trElements[i].getBoundingClientRect();
      // Bắt tọa độ lệch tâm 10px quanh lề biên giữa các hàng
      if (e.clientY > rect.top - 10 && e.clientY < rect.top + 10) {
        const relativeTop = rect.top - containerRect.top + tbodyRef.current.closest('.editor-scrollbar')!.scrollTop;
        setFloatingBtn({ show: true, top: relativeTop, left: 16, index: i });
        found = true;
        break;
      }
    }

    // Nếu không nằm giữa các hàng, kiểm tra xem có nằm sát mép dưới hàng cuối cùng không
    if (!found && trElements.length > 0) {
      const lastRect = trElements[trElements.length - 1].getBoundingClientRect();
      if (e.clientY > lastRect.bottom - 10 && e.clientY < lastRect.bottom + 10) {
        const relativeTop = lastRect.bottom - containerRect.top + tbodyRef.current.closest('.editor-scrollbar')!.scrollTop;
        setFloatingBtn({ show: true, top: relativeTop, left: 16, index: trElements.length });
        found = true;
      }
    }

    if (!found) {
      setFloatingBtn((prev) => ({ ...prev, show: false }));
    }
  };

  // 8. CHÈN DÒNG BẰNG HỆ THỐNG FLOATING BUTTON
  const handleFloatingClick = () => {
    if (floatingBtn.index < 0) return;
    const newRow = generateNewRow({ status: 'Added' });
    setRows((prev) => {
      const copy = [...prev];
      copy.splice(floatingBtn.index, 0, newRow);
      return copy;
    });
    setFloatingBtn((prev) => ({ ...prev, show: false }));
  };

  // Hàm bổ trợ tự giãn độ cao cho ô Textarea theo React lifecycle
  const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  return (
    <div className="w-[98%] max-w-[1800px] mx-auto p-4 md:p-6 space-y-6 select-none">

      {/* HEADER BAR */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-teal-600 hover:text-white border border-slate-200 text-teal-600 rounded-xl transition-all cursor-pointer"
          title="Go Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Excel Status Smart Editor</h2>
          <p className="text-xs text-slate-500 mt-0.5">Key Management, compare value and export final Key File</p>
        </div>
      </div>

      {/* CONTROL ACTIONS TOOLBAR */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportExcel}
          accept=".xlsx, .xls"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-all cursor-pointer"
        >
          📂 Import Excel
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Index (0...)"
            value={insertIndex}
            onChange={(e) => setInsertIndex(e.target.value)}
            className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500"
          />
          <button
            onClick={handleInsertByInputIndex}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-sm transition-all cursor-pointer"
          >
            ➕ Insert New Row
          </button>
        </div>

        <button
          onClick={handleExportFinalExcel}
          className="sm:ml-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-all cursor-pointer shadow-sm"
        >
          💾 Download Final Key
        </button>
      </div>

      {/* MAIN TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 items-flex-start">

        {/* PANEL TRÁI: RAW DATA EDITOR */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-200 font-bold text-xs tracking-wider text-slate-500 uppercase">
            🛠️ RAW DATA EDITOR
          </div>

          {/* KHUNG CUỘN CHỨA CƠ CHẾ BẮT TỌA ĐỘ HOVER CHÈN DÒNG */}
          <div className="editor-scrollbar relative max-h-[70vh] overflow-y-auto">

            {/* FLOATING HOVER INDICATOR CONTROLS */}
            {floatingBtn.show && (
              <>
                <button
                  onClick={handleFloatingClick}
                  className="absolute z-40 w-7 h-7 bg-amber-500 hover:scale-110 text-white border-2 border-white rounded-full flex items-center justify-center text-xs shadow-md cursor-pointer transition-transform -translate-y-1/2"
                  style={{ top: floatingBtn.top, left: `${floatingBtn.left}px` }}
                >
                  ➕
                </button>
                <div
                  className="absolute left-0 right-0 h-0.5 bg-amber-400 z-30 pointer-events-none"
                  style={{ top: floatingBtn.top }}
                />
              </>
            )}

            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <th className="p-3 w-[30%]">Key</th>
                  <th className="p-3 w-[25%]">Old</th>
                  <th className="p-3 w-[25%]">New</th>
                  <th className="p-3 w-[20%]">Status</th>
                </tr>
              </thead>
              <tbody
                ref={tbodyRef}
                onMouseMove={handleMouseMoveTable}
                onMouseLeave={() => setFloatingBtn((prev) => ({ ...prev, show: false }))}
                className="divide-y divide-slate-100"
              >
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                      No data loaded. Please import an Excel file or insert rows to start editing.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    // Cấu hình màu nền động theo trạng thái của dòng
                    const statusClassMap = {
                      Unchanged: 'bg-white border-l-4 border-l-transparent text-slate-700',
                      Modified: 'bg-yellow-50/60 border-l-4 border-l-amber-500 text-amber-900',
                      Added: 'bg-emerald-50/50 border-l-4 border-l-emerald-500 text-emerald-900',
                      Removed: 'bg-rose-50/60 border-l-4 border-l-rose-500 text-rose-900/60 line-through opacity-70',
                    };

                    return (
                      <tr key={row.id} className={`transition-colors ${statusClassMap[row.status]}`}>
                        <td className="p-2 align-top">
                          <textarea
                            value={row.key}
                            rows={1}
                            onInput={handleTextareaResize}
                            onChange={(e) => handleInputChange(row.id, 'key', e.target.value)}
                            placeholder="Key value..."
                            title={row.hasError ? 'Warning: Key already exists in this sheet!' : ''}
                            className={`w-full p-2 text-xs font-mono bg-transparent border rounded-md outline-none focus:bg-white resize-none transition-all
                              ${row.hasError
                                ? 'border-rose-500 shadow-[inset_0_0_0_1px_#ef4444] animate-[shake_0.3s_ease-in-out]'
                                : 'border-transparent focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10'}`}
                          />
                        </td>
                        <td className="p-2 align-top">
                          <textarea
                            value={row.old}
                            rows={1}
                            readOnly
                            disabled
                            className="w-full p-2 text-xs font-sans bg-transparent border border-transparent rounded-md outline-none resize-none cursor-not-allowed opacity-60"
                          />
                        </td>
                        <td className="p-2 align-top">
                          <textarea
                            value={row.new}
                            rows={1}
                            onInput={handleTextareaResize}
                            onChange={(e) => handleInputChange(row.id, 'new', e.target.value)}
                            placeholder="New translation..."
                            className="w-full p-2 text-xs font-sans bg-transparent border border-transparent focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rounded-md outline-none focus:bg-white resize-none transition-all"
                          />
                        </td>
                        <td className="p-2 align-top">
                          <select
                            value={row.status}
                            onChange={(e) => handleStatusChange(row.id, e.target.value as any)}
                            className="w-full p-2 text-xs bg-transparent border border-transparent focus:border-teal-500 rounded-md outline-none focus:bg-white cursor-pointer transition-all"
                          >
                            <option value="Unchanged">Unchanged</option>
                            <option value="Modified">Modified</option>
                            <option value="Added">Added</option>
                            <option value="Removed">Removed</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL PHẢI: FINAL PREVIEW BRICK CONTAINER */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-200 font-bold text-xs tracking-wider text-slate-500 uppercase">
            ✨ FINAL PREVIEW (KEY & VALUE)
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-1">
            <table className="w-full table-fixed border-collapse text-left">
              <tbody className="divide-y divide-slate-100">
                {rows.filter((r) => r.status !== 'Removed').length === 0 ? (
                  <tr>
                    <td className="text-center py-16 text-sm text-slate-400 italic">
                      No final key data to preview.
                    </td>
                  </tr>
                ) : (
                  rows
                    .filter((row) => row.status !== 'Removed')
                    .map((row) => (
                      <tr key={`preview-${row.id}`} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3 w-[35%] font-mono text-[11px] font-semibold text-teal-600 truncate">
                          {row.key || 'N/A'}
                        </td>
                        <td className="p-3 w-[65%] text-xs text-slate-500 whitespace-pre-wrap break-all leading-relaxed">
                          {row.new}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* NHÚNG THÊM ANIMATION SHAKE TRỰC TIẾP QUA INLINE TAILWIND HOẶC CSS CHO LỖI TRÙNG KHÓA */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>

    </div>
  );
};

export default ExcelEditor;
