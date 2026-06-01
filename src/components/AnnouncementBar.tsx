import React from 'react';

const AnnouncementBar: React.FC = () => (
  <div className="mt-4 mx-4 bg-slate-900 text-white py-2.5 overflow-hidden border border-slate-800 rounded-2xl shadow-sm">
    <div className="relative w-full overflow-hidden whitespace-nowrap">
      <div className="inline-block pl-[100%] animate-[marquee_15s_linear_infinite] hover:[animation-play-state:paused]">
        <span className="text-sm font-medium tracking-wide flex items-center gap-1.5 select-none pr-4">
          🚀 If the <span className="font-bold text-teal-400">My Only Tool</span> has been valuable to your workflow and saved you time, please consider supporting the developer.
          <a
            href="#"
            className="text-amber-300 font-bold underline hover:text-amber-200 transition-colors mx-1"
          >
            Buy me a Coffee
          </a>
          Your generosity is deeply appreciated! ❤️
        </span>
      </div>
    </div>
  </div>
);

export default AnnouncementBar;
