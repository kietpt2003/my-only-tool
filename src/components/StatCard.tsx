import React from 'react';

import { apiDashboard } from '@/services/apiDashboard';

const StatCard: React.FC<{ label: string; id: string; endpoint: string; isVisit?: boolean }> = ({ label, id, endpoint = '', isVisit = false }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        if (isVisit) {
          const res = await apiDashboard.getVisits();
          setCount(res.data?.totalUnique || 0);
          return;
        }

        const res = await apiDashboard.getUsageStats(endpoint);
        setCount(res.data?.total || 0);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu dashboard:", error);
      }
    };

    loadData();
  }, []);

  return (
    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[100px] transition-all hover:bg-white hover:shadow-md hover:border-teal-500/30 group">
      {/* Label của Thẻ */}
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-teal-600 transition-colors">
        {label}
      </div>

      {/* Con số thống kê (Nổi bật) */}
      <div
        id={id}
        className="text-2xl font-extrabold text-slate-800 tracking-tight mt-2 font-mono"
      >
        {count.toLocaleString()}
      </div>
    </div>
  );
};

export default StatCard;
