import axiosClient from './axiosClient';

export const apiTools = {
  // Lấy token để upload lên Vercel Blob
  getBlobToken: () => {
    return axiosClient.get('/api/convert-key/blob-token');
  },

  // Gọi API chuyển đổi JS sang Excel
  convertJsToExcel: (fileUrl: string) => {
    return axiosClient.post('/api/convert-key/upload', { fileUrl });
  },

  convertExcelToJs: (payload: { fileUrl: string; keyColumn: string | number; valueColumn: string | number }) => {
    return axiosClient.post('/api/convert-key/v2/upload-excel', payload);
  },

  diffJs: (payload: { oldFileUrl: string; newFileUrl: string }) => {
    return axiosClient.post('/api/convert-key/diff-js', payload);
  },

  translateJs: (payload: { fileUrl: string; targetLangs: string[] }) => {
    return axiosClient.post('/api/convert-key/translate-js', payload);
  },

  mergeExcelFiles: (payload: { file1Url: string; file2Url: string; keyColumnFile1: string | number; valueColumnFile1: string | number; keyColumnFile2: string | number; valueColumnFile2: string | number }) => {
    return axiosClient.post('/api/convert-key/upload-excel-merge-zip', payload);
  },

  generateLocales: (payload: { fileUrl: string; workSheetKey: number; keyColumn: number; workSheetValue: number; valueColumns: number[] }) => {
    return axiosClient.post('/api/convert-key/v2/generate-excels-for-each-locales', payload);
  },

  diffExcel: (payload: { oldFileUrl: string; newFileUrl: string; keyColumnOld: string | number; valueColumnOld: string | number; keyColumnNew: string | number; valueColumnNew: string | number }) => {
    return axiosClient.post('/api/convert-key/diff-excel', payload);
  },

  translateExcel: (payload: { fileUrl: string; targetLangs: string[]; keyColumn: string | number; valueColumn: string | number }) => {
    return axiosClient.post('/api/convert-key/translate-excel', payload);
  },
};
