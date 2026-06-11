import axiosClient from './axiosClient';

export interface AdminUser {
  email: string;
  role: string;
  _id?: string;
}

export const apiAdmin = {
  getUsers: () => {
    return axiosClient.get('/admin/users');
  },

  addUser: (email: string, role: string) => {
    return axiosClient.post('/admin/users', { email, role });
  },

  deleteUser: (email: string) => {
    return axiosClient.delete(`/admin/users/${email}`);
  },

  /**
   * 👉 BỔ SUNG: Đặc quyền dành riêng cho Super Admin cấp phát gói VIP/Trial thủ công
   * @param email Email của user cần nhận gói
   * @param planType Loại gói muốn cấp ("TRIAL", "DAILY", "MONTHLY", "YEARLY", "LIFETIME")
   * @param days Số ngày/tháng/năm hiệu lực tùy chọn (Nếu để trống Backend tự tính theo planType hoặc mặc định 7 ngày Trial)
   */
  grantUserPremium: (email: string, planType?: string, days?: number) => {
    return axiosClient.post('/admin/users/grant-premium', { email, planType, days });
  },

  /**
   * 👉 BỔ SUNG: Thu hồi gói Premium/Trial, hạ cấp tài khoản user về gói thường (NONE)
   * @param email Email của user cần xóa gói
   */
  revokeUserPremium: (email: string) => {
    return axiosClient.post('/admin/users/revoke-premium', { email });
  },
};
