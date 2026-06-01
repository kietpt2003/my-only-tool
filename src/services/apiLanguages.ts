import axiosClient from './axiosClient';

export interface LanguagePayload {
  code: string;
  name: string;
}

export const apiLanguages = {
  getLanguages: () => {
    return axiosClient.get('/api/languages');
  },

  addLanguage: (code: string, name: string) => {
    return axiosClient.post('/api/languages/admin', { code, name });
  },

  deleteLanguage: (code: string) => {
    return axiosClient.delete(`/api/languages/admin/${code}`);
  }
};