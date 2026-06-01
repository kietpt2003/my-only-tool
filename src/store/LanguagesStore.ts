import { makeAutoObservable } from 'mobx';
import { apiLanguages, LanguagePayload } from '@/services/apiLanguages';

export class LanguagesStore {
  languages: LanguagePayload[] = [];
  isLoading: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Lấy danh sách ngôn ngữ từ API
  fetchLanguages = async () => {
    this.isLoading = true;
    try {
      const res = await apiLanguages.getLanguages();
      this.languages = res.data;
    } catch (error) {
    } finally {
      this.isLoading = false;
    }
  };

  addLanguage = async (code: string, name: string) => {
    try {
      await apiLanguages.addLanguage(code, name);
      await this.fetchLanguages();
    } catch (error) {
      throw error;
    }
  };

  // Xóa ngôn ngữ (Sẽ dùng bên Admin Tab)
  deleteLanguage = async (code: string) => {
    try {
      await apiLanguages.deleteLanguage(code);
      // Xóa trực tiếp khỏi mảng hiện tại cho giao diện phản hồi tức thì (Optimistic UI)
      this.languages = this.languages.filter(lang => lang.code !== code);
    } catch (error) {
      throw error;
    }
  };
}
