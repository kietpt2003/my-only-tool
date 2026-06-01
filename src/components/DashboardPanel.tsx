import React from 'react';

import StatCard from './StatCard';

const DashboardPanel: React.FC = () => {
  return (
    <div className="p-5 bg-white rounded-2xl space-y-6">
      <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 pb-3 border-b border-slate-100">
        <span>📊</span> Analytics Dashboard
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="👨🏻‍💻 Total Access" id="total-access" endpoint="/" />
        <StatCard label="🙋🏼‍♂️ Total Visitors" id="visit-count" endpoint="" isVisit={true} />
        <StatCard label="📄 Upload JS → Excel" id="upload-count" endpoint="/api/convert-key/upload" />
        <StatCard label="📚 Excel → JS" id="upload-excel-count" endpoint="/api/convert-key/v2/upload-excel" />
        <StatCard label="📑 Merge Files" id="merge-count" endpoint="/api/convert-key/upload-excel-merge-zip" />
        <StatCard label="🌎 Generate Locales" id="generate-locales" endpoint="/api/convert-key/v2/generate-excels-for-each-locales" />
        <StatCard label="🔍 Diff JS" id="diff-js-count" endpoint="/api/convert-key/diff-js" />
        <StatCard label="📊 Diff Excel" id="diff-excel-count" endpoint="/api/convert-key/diff-excel" />
        <StatCard label="🌍 Auto Translate" id="translate-excel-count" endpoint="/api/convert-key/translate-excel" />
        <StatCard label="🌍 Translate JS" id="translate-js-count" endpoint="/api/convert-key/translate-js" />
      </div>
    </div>
  );
};

export default DashboardPanel;
