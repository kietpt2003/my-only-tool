import { PREMIUM_PLAN } from '@/constants/premiumPlan';
import axiosClient from './axiosClient';

// 👉 Định nghĩa Interface cho dữ liệu trả về khi thanh toán thành công
export interface PaypalSuccessResponse {
  success: boolean;
  message: string;
  newToken: string; // Token mới chứa thông tin gói VIP vừa nâng cấp
}

// 👉 Định nghĩa Interface cho dữ liệu thông tin gói hiện tại
export interface PremiumStatusResponse {
  success: boolean;
  data: {
    email: string;
    premiumPlan: "NONE" | "TRIAL" | "DAILY" | "MONTHLY" | "YEARLY" | "LIFETIME";
    premiumValidUntil: string | null;
    daysLeft: number | "Infinite";
  };
}

// 👉 Định nghĩa Interface cho Request tạo đơn SePay
export interface CreateSePayOrderRequest {
  planType: string;
  amount: number;
}

// 👉 Định nghĩa Interface cho Response tạo mã QR SePay
export interface SePayOrderResponse {
  success: boolean;
  isExisting: boolean;
  message: string;
  qrUrl: string;
  memo: string;
  orderCode: string;
  planType: string;
}

// 👉 Định nghĩa Interface cho Response khi check trạng thái đơn
export interface OrderStatusResponse {
  success: boolean;
  status: "PENDING" | "COMPLETED";
  newToken?: string; // Chỉ có khi status là COMPLETED
  message?: string;
}

/**
 * Hệ thống API quản lý và đồng bộ hóa các gói cước VIP/Premium
 */
export const apiPremiumPlan = {

  /**
   * 1. Đồng bộ hóa đơn PayPal thành công lên hệ thống Server
   * @param usdAmount Số tiền USD thực tế của gói chọn mua
   * @param paypalDetails Object chi tiết giao dịch thu được từ cổng PayPal SDK
   * @param planType Mã gói cước ("DAILY" | "MONTHLY" | "YEARLY" | "LIFETIME")
   */
  syncPaypalSuccess: async (
    usdAmount: number,
    paypalDetails: any,
    planType: string
  ): Promise<PaypalSuccessResponse> => {
    // Không cần truyền userId vì axiosClient tự động đính kèm Token ẩn chứa ID ở header rồi
    const response = await axiosClient.post<PaypalSuccessResponse>('/api/orders/paypal-success', {
      usdAmount,
      paypalDetails,
      planType,
    });
    return response.data;
  },

  /**
   * 2. Lấy thông tin chi tiết thời hạn và số ngày còn lại của gói VIP hiện tại
   */
  getPremiumStatus: async (): Promise<PremiumStatusResponse> => {
    const response = await axiosClient.get<PremiumStatusResponse>('/api/users/premium-status');
    return response.data;
  },

  /**
   * 3. Kích hoạt gói dùng thử (Trial 7 ngày)
   */
  activateTrial: async (): Promise<PaypalSuccessResponse> => {
    const response = await axiosClient.post<PaypalSuccessResponse>('/api/orders/premium/activate-plan', {
      planType: PREMIUM_PLAN.TRIAL
    });
    return response.data;
  },

  /**
   * 4. Tạo đơn hàng VietQR qua cổng SePay
   * @param data Chứa planType và amount (giá VND)
   */
  createSePayOrder: async (data: CreateSePayOrderRequest): Promise<SePayOrderResponse> => {
    // Lưu ý URL cần khớp với route khai báo ở backend (ví dụ: /api/orders/se-pay)
    const response = await axiosClient.post<SePayOrderResponse>('/api/orders/se-pay', data);
    return response.data;
  },

  /**
   * 5. Kiểm tra định kỳ trạng thái của một đơn hàng VietQR (Polling)
   * @param orderCode Mã đơn hàng nội bộ (Ví dụ: MYONLYTOOLM123E4567E89)
   */
  checkOrderStatus: async (orderCode: string): Promise<OrderStatusResponse> => {
    const response = await axiosClient.get<OrderStatusResponse>(`/api/orders/status/${orderCode}`);
    return response.data;
  }
};
