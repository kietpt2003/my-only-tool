import React from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

import { PREMIUM_PLAN } from "@/constants/premiumPlan";
import { useStore } from "@/store";
import { apiPremiumPlan } from "@/services/apiPremiumPlan";

declare global {
  interface Window {
    showPremiumModal?: (currentPlan: string, hasUsedTrial?: boolean) => void;
  }
}

type PlanKey = "DAILY" | "MONTHLY" | "YEARLY" | "LIFETIME";

interface PlanConfig {
  name: string;
  subName: string;
  usdPrice: number;
  vndPrice: number;
  badge?: string;
}

// Cấu hình giá tiền
const PLANS: Record<PlanKey, PlanConfig> = {
  DAILY: { name: "Daily Pass", subName: "24-hour full access", usdPrice: 4.99, vndPrice: 5000 },
  MONTHLY: { name: "Monthly", subName: "Best for starter", usdPrice: 5.55, vndPrice: 50000, badge: "POPULAR" },
  YEARLY: { name: "Yearly Saver", subName: "1 year full access", usdPrice: 7.25, vndPrice: 150000, badge: "BEST VALUE" },
  LIFETIME: { name: "Lifetime VIP", subName: "Pay once, own forever", usdPrice: 9.99, vndPrice: 200000, badge: "ULTIMATE" },
};

interface PremiumSubscriptionModalProps {
  onClose?: () => void;
  checkCashStatus?: (callback?: () => void) => void;
}

const PremiumSubscriptionModal: React.FC<PremiumSubscriptionModalProps> = ({ onClose, checkCashStatus }) => {
  const {
    authStore: {
      handlePaymentSuccess,
      handleActivateTrial,
      isSubmittingPayment,
      checkAndSetToken
    }
  } = useStore();

  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = React.useState<string>(PREMIUM_PLAN.NONE);
  const [hasUsedTrial, setHasUsedTrial] = React.useState<boolean>(false);

  // 👉 BỔ SUNG THÊM TRẠNG THÁI "CASH" VÀO PAYMENT METHOD
  const [paymentMethod, setPaymentMethod] = React.useState<"VIETQR" | "PAYPAL" | "CASH">("VIETQR");
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>("MONTHLY");
  const [trialLoading, setTrialLoading] = React.useState<boolean>(false);

  // 👉 Các State quản lý luồng VietQR / SePay
  const [qrData, setQrData] = React.useState<{ qrUrl: string, memo: string, orderCode: string, isExisting: boolean } | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = React.useState(false);
  const [paymentDone, setPaymentDone] = React.useState(false);

  React.useEffect(() => {
    window.showPremiumModal = (planFromBackend: string, trialStatus?: boolean) => {
      setCurrentPlan(planFromBackend || PREMIUM_PLAN.NONE);
      setHasUsedTrial(!!trialStatus);
      setIsOpen(true);
    };
    return () => { delete window.showPremiumModal; };
  }, []);

  // Xóa mã QR cũ nếu khách đổi phương thức thanh toán hoặc đổi gói khác
  React.useEffect(() => {
    setQrData(null);
    setPaymentDone(false);
  }, [selectedPlan, paymentMethod]);

  // 👉 POLLING 1: DÀNH CHO VIETQR SEPAY
  React.useEffect(() => {
    if (!qrData?.orderCode || paymentDone || paymentMethod !== "VIETQR") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await apiPremiumPlan.checkOrderStatus(qrData.orderCode);
        if (res.status === "COMPLETED" && res.newToken) {
          clearInterval(intervalId);
          setPaymentDone(true);

          checkAndSetToken(res.newToken);
          alert("🎉 Hệ thống đã nhận được tiền! Tài khoản của bạn đã được nâng cấp Premium.");
          onPurchaseSuccess();
        }
      } catch (err) {
        console.error("Lỗi khi check trạng thái hóa đơn:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [qrData, paymentDone, paymentMethod]);

  React.useEffect(() => {
    if (paymentMethod !== "CASH" || !isOpen) return;

    const intervalId = setInterval(async () => {
      try {
        checkCashStatus?.(() => {
          clearInterval(intervalId);
          onPurchaseSuccess();
        })
      } catch (err) {
        console.error("Lỗi khi check trạng thái user:", err);
      }
    }, 5000); // Check mỗi 5s để không làm nặng Server

    return () => clearInterval(intervalId);
  }, [paymentMethod, isOpen, currentPlan]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const activePlanInfo = PLANS[selectedPlan];
  const calculatedUsd = activePlanInfo.usdPrice.toFixed(2);
  const calculatedVnd = activePlanInfo.vndPrice.toLocaleString("vi-VN");

  const onPurchaseSuccess = () => {
    setIsOpen(false);
    if (onClose) onClose();
    window.location.reload();
  };

  const handleTriggerFreeTrial = async () => {
    setTrialLoading(true);
    const success = await handleActivateTrial(onPurchaseSuccess);
    if (!success) setTrialLoading(false);
  };

  // 👉 HÀM TẠO ĐƠN HÀNG VIETQR BẰNG SEPAY
  const handleGenerateVietQR = async () => {
    setIsGeneratingQR(true);
    try {
      const response = await apiPremiumPlan.createSePayOrder({
        planType: selectedPlan,
        amount: activePlanInfo.vndPrice
      });
      if (response.success) {
        setQrData(response);
      } else {
        alert(response.message || "Không thể khởi tạo mã QR.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi hệ thống khi tạo đơn VietQR.");
    } finally {
      setIsGeneratingQR(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-[620px] rounded-3xl p-6 md:p-8 font-sans shadow-2xl relative max-h-[95vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]">

        <button onClick={handleClose} className="absolute top-5 right-5 text-slate-400 hover:text-rose-500 font-bold text-2xl cursor-pointer transition-colors">&times;</button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-50 rounded-full text-xl mb-2 animate-bounce">👑</div>
          <h3 className="text-2xl font-black text-slate-900">Upgrade to Premium Plan</h3>
          <p className="text-slate-500 text-xs mt-1">
            Unlock all advanced features. Current tier: <span className="font-bold text-teal-600 uppercase bg-teal-50 px-2 py-0.5 rounded-md text-[11px]">{currentPlan}</span>
          </p>
        </div>

        {!hasUsedTrial && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <strong className="block text-base font-bold">🎁 7-Day Free Trial Available!</strong>
              <span className="text-xs text-amber-50/90 block mt-0.5">Experience full premium toolkits with zero cost.</span>
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

        {/* ========================================================= */}
        {/* 👉 BƯỚC 1: CHỌN PHƯƠNG THỨC THANH TOÁN (CÓ TIỀN MẶT)     */}
        {/* ========================================================= */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Select Payment Method</label>
          <div className="flex flex-col sm:flex-row bg-slate-100 p-1.5 rounded-xl gap-1">
            <button
              onClick={() => setPaymentMethod("VIETQR")}
              className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${paymentMethod === "VIETQR" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}
            >
              🏦 Chuyển khoản (VietQR)
            </button>
            <button
              onClick={() => setPaymentMethod("PAYPAL")}
              className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${paymentMethod === "PAYPAL" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}
            >
              💳 Thẻ Quốc tế (PayPal)
            </button>
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${paymentMethod === "CASH" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}
            >
              💵 Tiền mặt (Cash)
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 👉 BƯỚC 2: RENDER LƯỚI CHỌN GÓI / HOẶC BẢNG GIÁ VIEW ONLY */}
        {/* ========================================================= */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {paymentMethod === "CASH" ? "2. Service Pricing List" : "2. Choose Your Plan"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(PLANS) as PlanKey[]).map((key) => {
              const plan = PLANS[key];

              // Nếu đang chọn Tiền mặt, tắt highlight của tất cả các gói (chỉ làm bảng giá)
              const isSelected = paymentMethod !== "CASH" && selectedPlan === key;

              // Điều kiện cho phép click (Không phải tiền mặt, không loading, không đang hiển thị QR)
              const canSelect = paymentMethod !== "CASH" && !trialLoading && !isSubmittingPayment && !qrData;

              return (
                <div
                  key={key}
                  onClick={() => canSelect && setSelectedPlan(key)}
                  className={`border-2 rounded-2xl p-4 relative transition-all flex flex-col justify-between 
                    ${isSelected ? "border-teal-500 bg-teal-50/30 shadow-xs" : "border-slate-200 bg-white"} 
                    ${canSelect ? "hover:border-slate-300 cursor-pointer" : "cursor-default"} 
                    ${(trialLoading || isSubmittingPayment || qrData) ? "opacity-50" : ""}
                  `}
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

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline gap-1">
                    {paymentMethod === "PAYPAL" ? (
                      <>
                        <span className="text-xs font-bold text-slate-500">$</span>
                        <span className="text-base font-black text-slate-900">{plan.usdPrice}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">USD</span>
                      </>
                    ) : (
                      <>
                        {/* Phương thức Tiền mặt và VietQR đều hiển thị VND */}
                        <span className="text-base font-black text-slate-900">{plan.vndPrice.toLocaleString("vi-VN")}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">VND</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 👉 BƯỚC 3: RENDER KHU VỰC CHECKOUT / MÃ QR / NOTE TIỀN MẶT */}
        {/* ========================================================= */}
        <div className="pt-4 border-t border-slate-100">

          {/* LUỒNG PAYPAL */}
          {paymentMethod === "PAYPAL" && (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">PayPal Checkout</span>
                </div>
                <div className="text-right">
                  <strong className="text-2xl font-black text-slate-900">${calculatedUsd}</strong>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wide">USD Total</span>
                </div>
              </div>

              {isSubmittingPayment ? (
                <div className="py-4 text-center text-sm font-semibold text-slate-600 animate-pulse">⏳ Processing payment...</div>
              ) : (
                <PayPalButtons
                  disabled={trialLoading}
                  forceReRender={[selectedPlan]}
                  style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
                  createOrder={(_data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [{
                        amount: { currency_code: "USD", value: calculatedUsd },
                        description: `Upgrade tier to ${selectedPlan} - My Only Tool`,
                      }],
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
                    alert("Payment interaction dropped. Please try again.");
                  }}
                />
              )}
            </div>
          )}

          {/* LUỒNG TIỀN MẶT */}
          {paymentMethod === "CASH" && (
            <div className="animate-[fadeIn_0.3s_ease-out] text-center p-6 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-4xl mb-4 animate-bounce">💵</div>
              <h4 className="text-lg font-black text-slate-800 mb-2">Thanh toán Tiền mặt / Chuyển khoản</h4>
              <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                Vui lòng liên hệ admin để chuyển khoản hoặc đưa tiền mặt và <strong className="text-rose-600">chờ xác nhận tự reload lại trang</strong> để áp dụng gói premium.
              </p>

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-bold text-amber-600 bg-amber-100/50 py-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                HỆ THỐNG ĐANG CHỜ ADMIN XÁC NHẬN TỰ ĐỘNG...
              </div>
            </div>
          )}

          {/* LUỒNG VIETQR */}
          {paymentMethod === "VIETQR" && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              {!qrData ? (
                <>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">VietQR Bank Transfer</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-2xl font-black text-blue-900">{calculatedVnd}</strong>
                      <span className="text-[10px] font-bold text-blue-500 block uppercase tracking-wide">VND Total</span>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateVietQR}
                    disabled={isGeneratingQR}
                    className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isGeneratingQR ? "⏳ Đang khởi tạo hóa đơn..." : "Tạo mã QR Thanh Toán"}
                  </button>
                </>
              ) : (
                <div className="text-center p-5 bg-slate-50 border border-slate-200 rounded-2xl relative">
                  {qrData.isExisting && (
                    <div className="absolute top-0 left-0 right-0 bg-orange-100 text-orange-700 text-[10px] font-bold py-1.5 rounded-t-2xl uppercase tracking-wider">
                      ⚠️ You have an old bill that's pending payment.
                    </div>
                  )}

                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase mt-3">Scan the QR code via your banking app or MoMo.</p>

                  <img src={qrData.qrUrl} alt="VietQR Code" className="mx-auto w-[240px] h-[240px] bg-white p-2 rounded-2xl shadow-sm border border-slate-200" />

                  <div className="mt-4 text-left bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] text-slate-500 mb-1">Or make a manual transfer with the following information (Required):</div>
                    <div className="text-sm font-mono font-black text-blue-700 bg-blue-50 px-3 py-2 rounded-lg select-all text-center">
                      {qrData.memo}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-amber-600 mt-5 bg-amber-50 py-2 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    THE SYSTEM IS WAITING TO RECEIVE MONEY AUTOMATICALLY...
                  </div>

                  <button onClick={() => setQrData(null)} className="mt-4 text-[11px] font-bold text-slate-400 hover:text-slate-600 underline">
                    Cancel this invoice and choose again.
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PremiumSubscriptionModal;
