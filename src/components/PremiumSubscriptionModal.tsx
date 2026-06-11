import React from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

import { PREMIUM_PLAN } from "@/constants/premiumPlan";
import { useStore } from "@/store";

declare global {
  interface Window {
    // 👉 Cập nhật hàm nhận thêm cờ trạng thái hasUsedTrial từ backend
    showPremiumModal?: (currentPlan: string, hasUsedTrial?: boolean) => void;
  }
}

type PlanKey = "DAILY" | "MONTHLY" | "YEARLY" | "LIFETIME";

interface PlanConfig {
  name: string;
  subName: string;
  usdPrice: number;
  badge?: string;
}

const PLANS: Record<PlanKey, PlanConfig> = {
  DAILY: { name: "Daily Pass", subName: "24-hour full access", usdPrice: 0.19 },
  MONTHLY: { name: "Monthly", subName: "Best for developers", usdPrice: 1.99, badge: "POPULAR" },
  YEARLY: { name: "Yearly Saver", subName: "Save up to 30%", usdPrice: 3.80, badge: "BEST VALUE" },
  LIFETIME: { name: "Lifetime VIP", subName: "Pay once, own forever", usdPrice: 5.70, badge: "ULTIMATE" },
};

const EXCHANGE_RATE = 25500;

interface PremiumSubscriptionModalProps {
  userId?: string;
  onClose?: () => void;
}

const PremiumSubscriptionModal: React.FC<PremiumSubscriptionModalProps> = ({ userId, onClose }) => {
  const {
    authStore: {
      handlePaymentSuccess,
      handleActivateTrial, // 👉 Lấy action kích hoạt trial từ Store ra
      isSubmittingPayment
    }
  } = useStore();

  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = React.useState<string>(PREMIUM_PLAN.NONE);
  const [hasUsedTrial, setHasUsedTrial] = React.useState<boolean>(false); // 👉 State lưu trạng thái đã dùng thử chưa
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>("MONTHLY");
  const [trialLoading, setTrialLoading] = React.useState<boolean>(false); // Loading riêng cho nút bấm trial

  React.useEffect(() => {
    window.showPremiumModal = (planFromBackend: string, trialStatus?: boolean) => {
      setCurrentPlan(planFromBackend || PREMIUM_PLAN.NONE);
      setHasUsedTrial(!!trialStatus);
      setIsOpen(true);
    };

    return () => {
      delete window.showPremiumModal;
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const activePlanInfo = PLANS[selectedPlan];
  const calculatedUsd = activePlanInfo.usdPrice.toFixed(2);

  const onPurchaseSuccess = () => {
    setIsOpen(false);
    if (onClose) onClose();
    window.location.reload();
  };

  // 👉 HÀM XỬ LÝ KHI BẤM NÚT KÍCH HOẠT TRIAL MIỄN PHÍ
  const handleTriggerFreeTrial = async () => {
    setTrialLoading(true);
    const success = await handleActivateTrial(onPurchaseSuccess);
    if (!success) {
      setTrialLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-[580px] rounded-3xl p-6 md:p-8 font-sans shadow-2xl relative max-h-[90vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]">

        <button onClick={handleClose} className="absolute top-5 right-5 text-slate-400 hover:text-rose-500 font-bold text-2xl cursor-pointer transition-colors">&times;</button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-50 rounded-full text-xl mb-2 animate-bounce">👑</div>
          <h3 className="text-2xl font-black text-slate-900">Upgrade to Premium Plan</h3>
          <p className="text-slate-500 text-xs mt-1">
            Unlock all advanced features. Current tier: <span className="font-bold text-teal-600 uppercase bg-teal-50 px-2 py-0.5 rounded-md text-[11px]">{currentPlan}</span>
          </p>
        </div>

        {/* ========================================================= */}
        {/* 👉 KHU VỰC HIỂN THỊ BANNER TRIAL (CHỈ HIỆN NẾU CHƯA DÙNG THỬ) */}
        {/* ========================================================= */}
        {!hasUsedTrial && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md animate-[fadeIn_0.3s_ease-out]">
            <div>
              <strong className="block text-base font-bold">🎁 7-Day Free Trial Available!</strong>
              <span className="text-xs text-amber-50/90 block mt-0.5">Experience full premium toolkits with zero cost. Cancel anytime.</span>
            </div>
            <button
              onClick={handleTriggerFreeTrial}
              disabled={trialLoading || isSubmittingPayment}
              className="w-full sm:w-auto px-5 py-2.5 bg-white text-orange-600 font-black text-sm rounded-xl shadow-sm hover:bg-orange-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-center"
            >
              {trialLoading ? "Activating..." : "Start Free Trial"}
            </button>
          </div>
        )}

        {/* TIÊU ĐỀ PHÂN CÁCH NẾU CÓ BANNER TRIAL */}
        {!hasUsedTrial && (
          <div className="flex items-center my-4 text-xs font-bold text-slate-400 uppercase tracking-wider before:flex-1 before:border-t before:border-slate-200 before:mr-3 after:flex-1 after:border-t after:border-slate-200 after:ml-3">
            Or Choose Paid Subscription
          </div>
        )}

        {/* Lưới Chọn Gói Dịch Vụ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const plan = PLANS[key];
            const isSelected = selectedPlan === key;
            return (
              <div
                key={key}
                onClick={() => !trialLoading && !isSubmittingPayment && setSelectedPlan(key)}
                className={`border-2 rounded-2xl p-4 cursor-pointer relative transition-all flex flex-col justify-between ${isSelected
                  ? "border-teal-500 bg-teal-50/30 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
                  } ${(trialLoading || isSubmittingPayment) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 right-3 text-[9px] px-2 py-0.5 rounded-full font-black text-white tracking-wider ${key === 'LIFETIME' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                    {plan.badge}
                  </span>
                )}
                <div>
                  <strong className={`block text-sm font-bold ${isSelected ? "text-teal-700" : "text-slate-800"}`}>{plan.name}</strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">{plan.subName}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100/70 flex items-baseline gap-0.5">
                  <span className="text-xs font-bold text-slate-500 mr-0.5">$</span>
                  <span className="text-base font-black text-slate-900">{plan.usdPrice}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">USD</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tổng kết hóa đơn thanh toán */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">PayPal Checkout Amount</span>
            <span className="text-xs text-slate-400">Direct global standard pricing</span>
          </div>
          <div className="text-right">
            <strong className="text-2xl font-black text-slate-900">${calculatedUsd}</strong>
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">USD Total</span>
          </div>
        </div>

        {/* KHU VỰC RENDER CỔNG THANH TOÁN PAYPAL */}
        <div className="space-y-3">
          {isSubmittingPayment ? (
            <div className="py-4 text-center text-sm font-semibold text-slate-600 animate-pulse">
              ⏳ Synchronizing transaction with server... Please do not close window.
            </div>
          ) : (
            <PayPalButtons
              disabled={trialLoading}
              forceReRender={[selectedPlan]}
              style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
              createOrder={(_data, actions) => {
                return actions.order.create({
                  intent: "CAPTURE",
                  purchase_units: [
                    {
                      amount: {
                        currency_code: "USD",
                        value: calculatedUsd,
                      },
                      description: `Upgrade tier to ${selectedPlan} - My Only Tool`,
                    },
                  ],
                });
              }}
              onApprove={async (_data, actions) => {
                if (actions.order) {
                  const details = await actions.order.capture();
                  await handlePaymentSuccess(details, parseFloat(calculatedUsd), selectedPlan, onPurchaseSuccess);
                }
              }}
              onError={(err) => {
                console.error("PayPal system issue:", err);
                alert("Payment interaction dropped. Please check your credit balance.");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumSubscriptionModal;
