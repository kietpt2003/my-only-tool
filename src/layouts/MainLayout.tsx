import React from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import redmineLoo from '@/assets/redmine_logo.png';
import AnnouncementBar from '@/components/AnnouncementBar';
import DashboardPanel from '@/components/DashboardPanel';
import DevToolsTab from '@/features/tools/components/DevToolsTab';
import CsToolsTab from '@/features/tools/components/CsToolsTab';
import AdminTab from '@/features/tools/components/AdminTab';
import PaymentHistory from '@/features/order/PaymentHistory';
import ChatWidget from '@/features/chat-widget/ChatWidget';
import DonationModal from '@/components/DonationModal';
import PremiumSubscriptionModal from '@/components/PremiumSubscriptionModal';
import { USER_ROLE } from '@/constants/user';
import { useStore } from '@/store';
import { PREMIUM_PLAN } from '@/constants/premiumPlan';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();

  const {
    authStore: {
      user,
      fetchUserInfo,
      logout
    },
    redmineUserStore: {
      loadUserInfo,
    },
  } = useStore();

  const [activeTab, setActiveTab] = React.useState<number>(0);

  // 👉 Hàm mở Modal nâng cấp nhanh khi bấm vào Badge gói cước
  const handleOpenUpgradeModal = () => {
    if (window.showPremiumModal) {
      window.showPremiumModal(user?.premiumPlan || PREMIUM_PLAN.NONE, user?.hasUsedTrial);
    }
  };

  const checkCashStatus = (callback?: () => void) => {
    loadUserInfo(undefined, callback);
  }

  // 👉 Component Helper: Render Badge siêu bắt mắt tùy theo cấp độ gói
  const renderPremiumBadge = (plan?: string) => {
    if (!plan || plan === PREMIUM_PLAN.NONE) {
      return (
        <button
          onClick={handleOpenUpgradeModal}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider hover:bg-slate-200 transition-colors cursor-pointer"
        >
          FREE PLAN ➔
        </button>
      );
    }

    if (plan === PREMIUM_PLAN.LIFETIME || plan === PREMIUM_PLAN.YEARLY) {
      return (
        <button
          onClick={handleOpenUpgradeModal}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)] uppercase tracking-wider border border-yellow-300/50 hover:scale-105 transition-transform cursor-pointer"
        >
          <span className="animate-bounce">👑</span> {plan} VIP
        </button>
      );
    }

    if (plan === PREMIUM_PLAN.TRIAL) {
      return (
        <button
          onClick={handleOpenUpgradeModal}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-teal-400 to-emerald-500 text-white shadow-sm uppercase tracking-wider border border-teal-300/50 hover:shadow-md transition-all cursor-pointer"
        >
          ⏳ 7-DAY TRIAL
        </button>
      );
    }

    // Mặc định cho DAILY, MONTHLY
    return (
      <button
        onClick={handleOpenUpgradeModal}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm uppercase tracking-wider border border-indigo-400/50 hover:shadow-md transition-all cursor-pointer"
      >
        ✨ {plan} PRO
      </button>
    );
  };

  React.useEffect(() => {
    fetchUserInfo();
  }, [activeTab])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans block">
      <AnnouncementBar />

      <div className="max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* 👉 HEADER THÔNG TIN USER ĐƯỢC NÂNG CẤP */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {user?.picture ? (
                  <img className="w-14 h-14 rounded-full border-2 border-teal-500 object-cover shadow-sm" src={user.picture} alt="User Avatar" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-teal-500 bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-xl shadow-sm">
                    {user?.name?.charAt(0) || '?'}
                  </div>
                )}
                {/* Dấu chấm xanh online */}
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="text-lg font-bold text-slate-900 leading-tight">{user?.name || 'Loading...'}</div>

                  {/* 👉 RENDER BADGE GÓI CƯỚC TẠI ĐÂY */}
                  {renderPremiumBadge(user?.premiumPlan)}
                </div>

                <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  {user?.email}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-600 border border-slate-200 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-100 cursor-pointer text-center whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>

          <button
            onClick={() => navigate('/redmine')}
            className="relative overflow-hidden inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-white text-[#ed2c24] border-2 border-[#ed2c24] rounded-lg font-extrabold text-[14px] shadow-[0_0_10px_rgba(237,44,36,0.2)] cursor-pointer select-none transition-all duration-300 hover:bg-[#ed2c24] hover:text-white hover:scale-105 group animate-[borderPulse_2s_infinite]"
          >
            <span className="absolute top-[-50%] left-[-100%] w-[50px] h-[200%] bg-gradient-to-r from-transparent via-[rgba(237,44,36,0.3)] to-transparent rotate-[30deg] animate-[shineRed_2.5s_infinite_linear] pointer-events-none"></span>
            <img
              src={redmineLoo}
              alt="Redmine Logo"
              className="w-[22px] h-auto transition-all duration-300 group-hover:brightness-0 group-hover:invert"
            />
            <span>Redmine Premium</span>
          </button>

          {/* Khu vực Tabs */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>🔑</span> Key Generator Tool
            </h2>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
              <button
                onClick={() => setActiveTab(0)}
                className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-all border-t border-x -mb-px cursor-pointer select-none
                  ${activeTab === 0
                    ? 'bg-white text-teal-600 border-slate-200 font-bold shadow-xs'
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
              >
                For Dev
              </button>

              <button
                onClick={() => setActiveTab(1)}
                className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-all border-t border-x -mb-px cursor-pointer select-none
                  ${activeTab === 1
                    ? 'bg-white text-teal-600 border-slate-200 font-bold shadow-xs'
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
              >
                For CS
              </button>

              {/* TAB PAYMENT HISTORY */}
              <button
                onClick={() => setActiveTab(2)}
                className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-all border-t border-x -mb-px cursor-pointer select-none
                  ${activeTab === 2
                    ? 'bg-white text-teal-600 border-slate-200 font-bold shadow-xs'
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
              >
                💳 Payment History
              </button>

              {/* ADMIN TAB */}
              {user?.role === USER_ROLE.ADMIN && (
                <button
                  onClick={() => setActiveTab(3)}
                  className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all border-t border-x -mb-px cursor-pointer select-none
                    ${activeTab === 3
                      ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold shadow-xs'
                      : 'bg-rose-50/40 text-rose-600/80 border-transparent hover:bg-rose-50 hover:text-rose-700'
                    }`}
                >
                  🛡️ Admin Management
                </button>
              )}
            </div>
          </div>

          {/* Khu vực Render Nội dung Tabs */}
          <div className="transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
            {activeTab === 0 && <DevToolsTab />}
            {activeTab === 1 && <CsToolsTab />}
            {activeTab === 2 && <PaymentHistory />}
            {activeTab === 3 && <AdminTab />}
          </div>
        </div>

        {/* Cột phải: Dashboard Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1 h-full">
            <DashboardPanel />
          </div>
        </div>

      </div>

      <ChatWidget toastPosition='top-22 right-4' />

      <DonationModal />

      <PremiumSubscriptionModal checkCashStatus={checkCashStatus} />
    </div>
  );
};

export default observer(MainLayout);
