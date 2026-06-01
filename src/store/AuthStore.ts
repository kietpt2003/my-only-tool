import { makeAutoObservable } from 'mobx';
import { jwtDecode } from 'jwt-decode';

export interface UserPayload {
  name: string;
  email: string;
  picture: string;
  role: string;
}

export class AuthStore {
  token: string | null = null;
  user: UserPayload | null = null;
  isChecking: boolean = true; // Trạng thái loading chờ check token ban đầu

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

  // Getter: Tiện ích check xem đã login chưa
  get isAuthenticated() {
    return !!this.token;
  }
}
