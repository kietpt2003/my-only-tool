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
};
