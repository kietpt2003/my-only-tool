import React from 'react'
import { observer } from 'mobx-react-lite';

import { useStore } from '@/store';
import { RedmineDraft } from '@/services/apiRedmine'

const highlightText = (text: string, keyword: string) => {
  if (!keyword || !text) return text;

  // Escape các ký tự đặc biệt trong regex để tránh lỗi crash khi user gõ các dấu ()[]*+
  const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeKeyword})`, 'gi');

  return text.split(regex).map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
};

interface DraftItemProps {
  item: RedmineDraft;
  searchQuery: string; // 👉 Nhận thêm prop keyword để highlight
  onPress: () => void;
}

function DraftItem({ item, searchQuery, onPress }: DraftItemProps) {
  const {
    draftStore: {
      trackerMap,
      activityMap,
    },
  } = useStore();

  const trackerName = trackerMap[item?.trackerId] || 'Task';
  const activityName = activityMap[item.activityId] || 'Act';

  // Chuyển đổi định dạng ngày giống hệt logic cũ
  let displayDate = item.spentOn;
  if (displayDate && displayDate.includes("-")) {
    const [year, month, day] = displayDate.split("-");
    displayDate = `${day}/${month}/${year}`;
  }

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
      }}
      className="bg-white border border-slate-200 hover:border-teal-400 border-l-4 border-l-teal-500 rounded-xl p-3 flex justify-between items-start gap-2 shadow-xs cursor-grab active:cursor-grabbing hover:bg-slate-50/40 transition-all"
    >
      <div className="space-y-1 min-w-0">
        <div className="text-xs font-semibold text-slate-800 leading-normal break-words">
          {/* 👉 Bọc text qua hàm highlightText */}
          {highlightText(item.subject, searchQuery)}
        </div>
        <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 font-medium">
          <span>⏱ {item.hours}h</span>
          <span>🎯 {highlightText(trackerName, searchQuery)}</span>
          <span>🏷 {highlightText(activityName, searchQuery)}</span>
          <span>📅 {highlightText(displayDate, searchQuery)}</span>
        </div>
      </div>
      <button
        onClick={onPress}
        className="text-slate-300 hover:text-rose-500 text-sm font-bold transition-colors px-1 cursor-pointer"
      >
        &times;
      </button>
    </div>
  )
}

export default observer(DraftItem);
