import axios from 'axios';
import { rootStore } from '@/store/RootStore';

const axiosClient = axios.create({
  baseURL: process.env.API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isSessionExpired = false;

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('app_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && [401, 403].includes(error.response.status)) {

      if (!isSessionExpired) {
        isSessionExpired = true;

        alert("Your login session has expired or been denied!");
        rootStore.authStore.logout();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
