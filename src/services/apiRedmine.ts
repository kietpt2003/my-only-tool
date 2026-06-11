import { PREMIUM_ERROR } from '@/constants/premiumPlan';
import { REDMINE_AUTHEN_ERROR } from '@/constants/redmine';
import axios, { AxiosError } from 'axios';

interface BackendErrorData {
  success?: boolean;
  message?: string;
  result?: string;
  currentPlan?: string;
  hasUsedTrial?: boolean;
}

// Cấu hình Base URL lấy từ biến môi trường (hoặc fix cứng tùy setup dự án của bạn)
const API_URL = process.env.API_URL || '';

const axiosInstance = axios.create({
  baseURL: `${API_URL}/api/redmine`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính kèm app_token hệ thống vào Header trước mỗi lượt gọi API
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('app_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorData>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 400 || status === 401 || status === 403 || status === 404) {
      const errorMessage = data?.message || '';

      if (status === 403 && data?.result === PREMIUM_ERROR.PREMIUM_REQUIRED) {
        if (typeof window !== 'undefined' && (window as any).showPremiumModal) {
          (window as any).showPremiumModal(data?.currentPlan, data?.hasUsedTrial);
        }
        return Promise.reject(new Error(PREMIUM_ERROR.PREMIUM_REQUIRED));
      }

      // Kiểm tra xem đây là lỗi của Hệ thống JWT App hay lỗi của Redmine Account
      const isRedmineError =
        errorMessage.includes("Redmine") ||
        errorMessage.includes("liên kết") ||
        errorMessage.includes("mật khẩu") ||
        errorMessage.includes("cấu hình") ||
        errorMessage.includes(REDMINE_AUTHEN_ERROR.DECRYPTION_FAILED) ||
        errorMessage.includes(REDMINE_AUTHEN_ERROR.INVALID_CREDENTIALS) ||
        errorMessage.includes(REDMINE_AUTHEN_ERROR.REDMINE_NOT_LINKED_OLD) ||
        errorMessage.includes(REDMINE_AUTHEN_ERROR.REDMINE_NOT_LINKED) ||
        errorMessage.includes(REDMINE_AUTHEN_ERROR.RE_LOGIN_FAILED) ||
        errorMessage.includes(REDMINE_AUTHEN_ERROR.MISSING_API_KEY_OLD);

      if (isRedmineError) {
        // Kích hoạt hiển thị Modal Login Redmine bên phía UI (Giả định hàm có sẵn ở window hoặc qua event)
        if (typeof window !== 'undefined' && (window as any).showRedmineLoginModal) {
          (window as any).showRedmineLoginModal(errorMessage);
        }
        return Promise.reject(new Error("REDMINE_AUTH_REQUIRED"));
      } else {
        // Lỗi JWT token hệ thống hết hạn hoặc không hợp lệ -> Văng ra màn hình đăng nhập chính
        localStorage.removeItem('app_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } else if (status === 500) {
      alert(`⚠️ Server Error (500): ${data?.message || 'Internal Server Error'}`);
    }

    return Promise.reject(error);
  }
);

// Định nghĩa các Interface dữ liệu chuẩn trả về từ Server Redmine
export interface RedmineUserMe {
  email: string;
  role: string;
  redmineProfile: {
    id: number;
    login: string;
    password: string;
    firstname: string;
    lastname: string;
    fullName: string;
    admin: boolean;
    redmineUrl: string;
    redmineApiKey: string;
    watchedProjectIds: string[];
    namingTemplate: string;
  };
}

export interface RedmineActivity {
  id: string;
  name: string;
  is_default?: boolean;
}

export interface RedmineDraft {
  _id: string;
  subject: string;
  hours: number;
  spentOn: string;
  activityId: string;
  trackerId: string;
}

export interface MonthlyStatusPayload {
  totalHours: number;
  isFull: boolean;
  redmineUrl: string;
  logs: Array<{
    id: string;
    project: string;
    hours: number;
    issueId: number;
    issueName: string;
    comments: string;
  }>;
}

export interface ExecuteDraftResponse {
  success: boolean;
  message: string;
  data: {
    newTaskId: number;
    newTask: any;
  };
}

// export bộ các hàm API Redmine Portal
export const apiRedmine = {

  // 1. QUẢN LÝ THÔNG TIN TÀI KHOẢN & LIÊN KẾT REDMINE
  getMe: () => axiosInstance.get<RedmineUserMe>('/user/me'),

  loginRedmine: (payload: { redmineUrl: string; username: string; password: string }) =>
    axiosInstance.post('/login', payload),

  updateConfig: (payload: { watchedProjectIds: string[]; namingTemplate: string }) =>
    axiosInstance.post('/user/redmine-config', payload),

  // 2. KHU VỰC QUẢN LÝ DANH SÁCH NHÁP (QUICK DRAFTS SIDEBAR)
  getDrafts: () => axiosInstance.get<{ success: boolean; data: RedmineDraft[] }>('/drafts'),

  createDraft: (payload: Omit<RedmineDraft, '_id'>) =>
    axiosInstance.post('/drafts', payload),

  deleteDraft: (id: string) => axiosInstance.delete(`/drafts/${id}`),

  // 3. TAB 1: CALENDAR - LẤY TRẠNG THÁI TIẾN ĐỘ THÁNG
  getMonthlyStatus: (month: number, year: number) =>
    axiosInstance.get<Record<string, MonthlyStatusPayload>>(`/monthly-status?month=${month}&year=${year}`),

  // 4. TAB 2 & 3: EXPLORER & CREATE TASK - PROJECT & TASK HIERARCHY
  getProjects: () => axiosInstance.get<{ projects: any[] }>('/projects'), // 👉 ĐÃ BỔ SUNG

  getFullProjectTree: (forceReload: boolean, onlyShowMyTasks: boolean) =>
    axiosInstance.get<any[]>(`/projects/tasks?reload=${forceReload}&onlyShowMyTasks=${onlyShowMyTasks}`),

  getProjectTasks: (projectId: number | string) =>
    axiosInstance.get<{ tasks: any[] }>(`/projects/${projectId}/tasks`),

  // 5. TAB 3: TASK CREATION - TRUY VẤN DROPDOWN OPTIONS & TẠO ISSUE MỚI
  getProjectTaskOptions: (projectId: number | string) =>
    axiosInstance.get<{ success: boolean; data: any }>(`/projects/${projectId}/task-options`),

  createTask: (payload: any) => axiosInstance.post('/tasks', payload),

  getTrackers: () => axiosInstance.get<any[]>('/trackers'),

  getStatuses: () => axiosInstance.get<{ statuses: any[] }>('/statuses'),

  // 6. TAB 4: SPENT TIME REPORT - TRUY VẤN BỘ LỌC NÂNG CAO VÀ XUẤT BÁO CÁO
  getReportFilters: () => axiosInstance.get<{ success: boolean; data: any }>('/report-filters'),

  getRemoteFilterOptions: (fieldKey: string) =>
    axiosInstance.get<{ success: boolean; data: Array<[string, string]> }>(`/report-filters/remote/${encodeURIComponent(fieldKey)}`),

  generateReport: (queryString: string) =>
    axiosInstance.get<{ success: boolean; data: { headers: string[]; rows: any[]; totals: number[] } }>(`/generate-report?${queryString}`),

  // 7. PIPELINE TỰ ĐỘNG HÓA KHI THẢ THẺ (DRAG & DROP EXECUTE)
  executeDraftPipeline: (payload: {
    draftId: string;
    parentTaskId: number;
    projectId: number;
    activityId: string;
    trackerId: string;
  }) => axiosInstance.post<ExecuteDraftResponse>('/drafts/execute', payload),

  // 8. LOG TIME TRỰC TIẾP QUA ICON ĐỒNG HỒ
  logTime: (payload: {
    issue_id: number;
    hours: number;
    spent_on: string;
    activity_id: string;
    comments: string;
  }) => axiosInstance.post('/logtime', payload),

  getActivities: () => axiosInstance.get<{ activities: RedmineActivity[] }>('/activities'),

  getScrapeFilters: () => axiosInstance.get<{ success: boolean; data: { trackers: any[] } }>('/scrape-filters'),
};
