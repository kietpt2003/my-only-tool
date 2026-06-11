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

  activateTrial: async (): Promise<PaypalSuccessResponse> => {
    const response = await axiosClient.post<PaypalSuccessResponse>('/api/orders/premium/activate-plan', {
      planType: PREMIUM_PLAN.TRIAL
    });
    return response.data;
  }
};
