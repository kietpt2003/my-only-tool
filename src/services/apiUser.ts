import axiosClient from "./axiosClient";

export const apiUser = {
  getMe: async () => {
    const response = await axiosClient.get('/api/auth/me');
    return response.data;
  }
}
