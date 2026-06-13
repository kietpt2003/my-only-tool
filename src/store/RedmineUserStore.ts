import { makeAutoObservable, runInAction, action } from 'mobx';

import { apiRedmine, RedmineUserMe } from '@/services/apiRedmine';

export class RedmineUserStore {
  user: RedmineUserMe | null = null;
  isLoading: boolean = false;
  isLoggingIn: boolean = false;

  showLoginModal: boolean = false;
  loginErrorMessage: string = '';

  isForceLogin: boolean = false;

  // Form states cho Modal Đăng nhập Redmine
  redmineUrl: string = '';
  redmineUsername: string = '';
  redminePassword: string = '';

  constructor() {
    makeAutoObservable(this, {
      loadUserInfo: action.bound,
      handleRedmineLogin: action.bound,
      setRedmineUrl: action.bound,
      setRedmineUsername: action.bound,
      setRedminePassword: action.bound,
      setShowLoginModal: action.bound,
      setIsForceLogin: action.bound
    });
  }

  // 👉 Computed Properties giúp truy xuất nhanh, an toàn dữ liệu profile
  get profile() {
    return this.user?.redmineProfile || null;
  }

  get userDisplayName(): string {
    if (this.isLoading) return 'Loading...';
    return this.profile?.fullName || this.profile?.login || 'Connected';
  }

  get isConnectedToRedmine(): boolean {
    return !!this.profile?.redmineUrl;
  }

  setShowLoginModal(show: boolean, message: string = '') {
    this.showLoginModal = show;
    this.loginErrorMessage = message;
  }

  setIsForceLogin(val: boolean) {
    this.isForceLogin = val;
  }

  setRedmineUrl(url: string) {
    this.redmineUrl = url;
  }

  setRedmineUsername(username: string) {
    this.redmineUsername = username;
  }

  setRedminePassword(password: string) {
    this.redminePassword = password;
  }

  // 👉 Action: Tải thông tin tài khoản hiện tại từ Server API
  async loadUserInfo(onMissingUrl?: () => void, onSuccess?: () => void) {
    this.isLoading = true;
    try {
      const response = await apiRedmine.getMe();
      runInAction(() => {
        this.user = response.data;
        if (this.profile) {
          this.redmineUrl = this.profile.redmineUrl || '';
          this.redmineUsername = this.profile.login || '';
          this.redminePassword = this.profile.password || '';

          // Nếu chưa cấu hình URL, kích hoạt callback bên ngoài (ví dụ mở modal)
          if (!this.profile.redmineUrl && onMissingUrl) {
            onMissingUrl();
          }

          onSuccess?.();
        }
      });
    } catch (error) {
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // 👉 Action: Xử lý Đăng nhập Redmine thực tế
  async handleRedmineLogin(onSuccess?: () => void) {
    if (!this.redmineUrl || !this.redmineUsername || !this.redminePassword) {
      alert('Please fill out all login fields.');
      return;
    }

    this.isLoggingIn = true;
    try {
      const response = await apiRedmine.loginRedmine({
        redmineUrl: this.redmineUrl,
        username: this.redmineUsername,
        password: this.redminePassword,
      });

      if (response.status === 200) {
        alert('🎉 Connected to your Redmine system successfully!');
        runInAction(() => {
          this.redminePassword = '';
        });
        if (onSuccess) onSuccess();
        // Reload lại trang để hệ thống nhận cấu hình session cookie/token mới từ backend proxy
        window.location.reload();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Incorrect credentials or bad Redmine configuration.');
    } finally {
      runInAction(() => {
        this.isLoggingIn = false;
      });
    }
  }
}
