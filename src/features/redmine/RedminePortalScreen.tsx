import React from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { useStore } from '@/store';

import RedmineCalendarTab from './components/RedmineCalendarTab';
import RedmineExplorerTab from './components/RedmineExplorerTab';
import RedmineCreateTaskTab from './components/RedmineCreateTaskTab';
import RedmineReportTab from './components/RedmineReportTab';
import RedmineUserGuideModal from './components/RedmineUserGuideModal';
import QuickDrafts from './components/QuickDrafts';
import ChatWidget from '../chat-widget/ChatWidget';

type TabMode = 'calendar' | 'explorer' | 'create' | 'report';

const RedminePortalScreen: React.FC = observer(() => {
  const navigate = useNavigate();

  const {
    redmineUserStore: {
      loadUserInfo,
      handleRedmineLogin,
      userDisplayName,
      redmineUrl,
      redmineUsername,
      redminePassword,
      setRedmineUrl,
      setRedmineUsername,
      setRedminePassword,
      isLoggingIn,
      showLoginModal,
      setShowLoginModal,
    }
  } = useStore();

  const [activeTab, setActiveTab] = React.useState<TabMode>('calendar');
  const [isGuideOpen, setIsGuideOpen] = React.useState<boolean>(false);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  // 👉 STATE CỤC BỘ ĐỂ KIỂM SOÁT QUYỀN ĐÓNG MODAL
  const [isForceLogin, setIsForceLogin] = React.useState<boolean>(false);

  const handleRedmineLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRedmineLogin(() => {
      setIsForceLogin(false); // Đăng nhập thành công thì gỡ cờ bắt buộc xuống
      setShowLoginModal(false);
    });
  };

  React.useEffect(() => {
    // Nếu loadUserInfo kích hoạt callback nghĩa là DB chưa có cấu hình RedmineUrl -> Bắt buộc login
    loadUserInfo(() => {
      setIsForceLogin(true);
      setShowLoginModal(true);
    });

    // Khi lỗi token Redmine (session chết) quăng ra từ Interceptor -> Bắt buộc login
    (window as any).showRedmineLoginModal = (errorMessage: string) => {
      setIsForceLogin(true);
      setShowLoginModal(true, errorMessage);
    };

    return () => {
      delete (window as any).showRedmineLoginModal;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased pb-12">
      <header className="max-w-[1600px] mx-auto bg-white border border-slate-200 shadow-xs rounded-2xl px-6 py-4 mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-teal-600 hover:text-white border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Redmine Automation Portal</h1>
        </div>

        <div className="flex items-center gap-3">
          {userDisplayName && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              {/* Nút bấm giả định để người dùng click update info nếu muốn */}
              <button
                onClick={() => { setIsForceLogin(false); setShowLoginModal(true); }}
                className="hover:underline text-left cursor-pointer"
                title="Click to update credentials"
              >
                {userDisplayName} ⚙️
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 mt-6 grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <QuickDrafts />

        <main className="xl:col-span-3 space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
            {([
              { id: 'calendar', label: '📅 Calendar' },
              { id: 'explorer', label: '🌳 Project Explorer' },
              { id: 'create', label: '🆕 Task Creation' },
              { id: 'report', label: '📊 Spent Time Report' }
            ] as const).map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-xs font-bold rounded-t-xl border-t border-x -mb-px cursor-pointer select-none transition-all
                    ${isActive
                      ? 'bg-white text-teal-600 border-slate-200 shadow-xs'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[500px]">
            {activeTab === 'calendar' && <RedmineCalendarTab />}
            {activeTab === 'explorer' && <RedmineExplorerTab />}
            {activeTab === 'create' && <RedmineCreateTaskTab />}
            {activeTab === 'report' && <RedmineReportTab />}
          </div>
        </main>
      </div>

      <button
        onClick={() => setIsGuideOpen(true)}
        className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-xl hover:bg-teal-600 hover:-translate-y-0.5 transition-all cursor-pointer z-50 flex items-center gap-1.5"
      >
        <span>📖</span> User Guide
      </button>

      {isGuideOpen && <RedmineUserGuideModal onClose={() => setIsGuideOpen(false)} />}

      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleRedmineLoginSubmit}
            className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4 animate-[scaleIn_0.2s_ease-out]"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">🔒 Connect to Redmine</h3>

              {/* 👉 NÚT ĐÓNG CHỈ XUẤT HIỆN KHI KHÔNG BỊ ÉP BUỘC ĐĂNG NHẬP (isForceLogin === false) */}
              {!isForceLogin && (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Redmine Connection URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://redmine.company.com"
                  value={redmineUrl}
                  onChange={e => setRedmineUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Your account username"
                  value={redmineUsername}
                  onChange={e => setRedmineUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={redminePassword}
                    onChange={e => setRedminePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer select-none p-1 transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
            >
              {isLoggingIn ? 'Connecting...' : 'Secure Auth Integration'}
            </button>
          </form>
        </div>
      )}

      {!showLoginModal && <ChatWidget position='bottom-20 right-6' toastPosition='top-8 right-4' />}
    </div>
  );
});

export default RedminePortalScreen;
