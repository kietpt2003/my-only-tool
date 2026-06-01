import { AuthStore } from './AuthStore';
import { ChatStore } from './ChatStore';
import { DraftStore } from './DraftStore';
import { LanguagesStore } from './LanguagesStore';
import { RedmineUserStore } from './RedmineUserStore';

export class RootStore {
  authStore: AuthStore;
  languagesStore: LanguagesStore;
  draftStore: DraftStore;
  redmineUserStore: RedmineUserStore;
  chatStore: ChatStore;

  constructor() {
    this.authStore = new AuthStore();
    this.languagesStore = new LanguagesStore();
    this.draftStore = new DraftStore();
    this.redmineUserStore = new RedmineUserStore();
    this.chatStore = new ChatStore();
  }
}

// Khởi tạo một bản thể duy nhất (Singleton) của RootStore
export const rootStore = new RootStore();
