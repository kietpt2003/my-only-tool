import { makeAutoObservable, runInAction } from 'mobx';
import { jwtDecode } from 'jwt-decode';
import { apiPremiumPlan } from '@/services/apiPremiumPlan';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: string;
}

export class AuthStore {
  token: string | null = null;
  user: UserPayload | null = null;
  isChecking: boolean = true; // Trạng thái loading chờ check token ban đầu
  isSubmittingPayment: boolean = false;

  constructor() {
    // Phép màu của MobX: Tự động biến mọi biến thành State, mọi hàm thành Action!
    makeAutoObservable(this);
  }

  // Action: Kiểm tra và lưu token (Dùng ở App.tsx)
  checkAndSetToken = (urlToken?: string | null) => {
    if (urlToken) {
      this.token = urlToken;
      localStorage.setItem('app_token', urlToken);
    } else {
      this.token = localStorage.getItem('app_token');
    }

    if (this.token) {
      try {
        this.user = jwtDecode<UserPayload>(this.token);
      } catch (error) {
        this.logout();
      }
    }

    this.isChecking = false;
  }

  logout = () => {
    this.token = null;
    this.user = null;
    localStorage.removeItem('app_token');
  }

  handlePaymentSuccess = async (details: any, usdAmount: number, planType: string, onSuccess?: () => void) => {
    this.isSubmittingPayment = true;
    try {
      // Sử dụng API đóng gói từ apiPremiumPlan
      const result = await apiPremiumPlan.syncPaypalSuccess(usdAmount, details, planType);

      if (result.success && result.newToken) {
        // Cập nhật Token mới có chứa quyền VIP vào store ngay lập tức
        this.checkAndSetToken(result.newToken);
        onSuccess?.();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("MobX Store Sync payment error:", err);
      // Đọc thông báo lỗi an toàn trả về từ interceptor backend
      alert(err.response?.data?.message || "Payment sync failed. Please contact Admin.");
      return false;
    } finally {
      runInAction(() => {
        this.isSubmittingPayment = false;
      });
    }
  }

  handleActivateTrial = async (callback?: () => void) => {
    this.isSubmittingPayment = true;
    try {
      const result = await apiPremiumPlan.activateTrial();

      if (result.success && result.newToken) {
        this.checkAndSetToken(result.newToken);
        alert("🎉 Kích hoạt dùng thử 7 ngày Premium thành công!");
        if (callback) callback();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Trial activation error:", err);
      alert(err.response?.data?.message || "Không thể kích hoạt dùng thử lúc này.");
      return false;
    } finally {
      runInAction(() => {
        this.isSubmittingPayment = false;
      });
    }
  }

  // Getter: Tiện ích check xem đã login chưa
  get isAuthenticated() {
    return !!this.token;
  }
}
