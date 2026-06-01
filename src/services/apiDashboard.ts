import axiosClient from './axiosClient';

export const apiDashboard = {
  getVisits: () => {
    return axiosClient.get('/api/stats/visits');
  },

  getUsageStats: (endpoint: string) => {
    return axiosClient.get(`/api/stats/total-usage?endpoint=${endpoint}`);
  },
};
