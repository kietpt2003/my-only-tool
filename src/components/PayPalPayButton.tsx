import React from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

interface PayPalPayButtonProps {
  amount: string; // Số tiền cần thanh toán (VD: "10.00")
  onSuccess?: (details: any) => void;
}

const PayPalPayButton: React.FC<PayPalPayButtonProps> = ({ amount, onSuccess }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
      <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide text-center">
        💳 Secure Checkout via PayPal
      </h3>

      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}

        // 1. Hàm tạo Đơn hàng (Gửi số tiền lên PayPal để mở cổng pop-up)
        createOrder={(_data, actions) => {
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: {
                  currency_code: "USD",
                  value: amount,
                },
                description: "Premium Feature Activation - My Only Tool",
              },
            ],
          });
        }}

        // 2. Hàm xử lý khi User quét/bấm thanh toán THÀNH CÔNG
        onApprove={async (_data, actions) => {
          if (actions.order) {
            const details = await actions.order.capture();
            alert(`🎉 Transaction completed by ${details.payer?.name?.given_name}!`);

            if (onSuccess) {
              onSuccess(details); // Bắn dữ liệu về component cha để cập nhật database/tài khoản
            }
          }
        }}

        // 3. Hàm bắt lỗi nếu có sự cố mạng/thẻ bị từ chối
        onError={(err) => {
          console.error("PayPal Checkout Error: ", err);
          alert("❌ Something went wrong with the payment. Please try again.");
        }}

        // 4. Hàm xử lý nếu User tắt Pop-up không muốn mua nữa
        onCancel={() => {
          alert("⚠️ Payment canceled by user.");
        }}
      />
    </div>
  );
};

export default PayPalPayButton;
