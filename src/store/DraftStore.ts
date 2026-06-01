import { action, makeAutoObservable, runInAction } from 'mobx';

import { apiRedmine, RedmineActivity, RedmineDraft } from '@/services/apiRedmine';

export interface TrackerItem {
  id: string | number;
  name: string;
}

export class DraftStore {
  drafts: RedmineDraft[] = [];
  isLoading: boolean = false;
  searchDraftQuery: string = '';

  trackers: TrackerItem[] = [];
  trackerMap: Record<string | number, string> = { 5: 'Task' };

  activities: RedmineActivity[] = [];
  activityMap: Record<string | number, string> = {};

  constructor() {
    makeAutoObservable(this, {
      loadDraftsFromServer: action.bound,
      addDraft: action.bound,
      deleteDraft: action.bound,
      setSearchDraftQuery: action.bound,
      loadQuickDraftTrackers: action.bound,
      loadActivities: action.bound,
    });
  }

  get filteredDrafts(): RedmineDraft[] {
    const query = this.searchDraftQuery.trim().toLowerCase();
    if (!query) return this.drafts;

    return this.drafts.filter((draft) => {
      const activityName = this.activityMap[draft.activityId] || `Act #${draft.activityId}`;
      const trackerName = this.trackerMap[draft.trackerId] || `Tracker #${draft.trackerId || 5}`;

      return (
        draft.subject.toLowerCase().includes(query) ||
        activityName.toLowerCase().includes(query) ||
        trackerName.toLowerCase().includes(query) ||
        draft.spentOn.includes(query)
      );
    });
  }

  // Thiết lập chuỗi tìm kiếm từ UI
  setSearchDraftQuery(query: string) {
    this.searchDraftQuery = query;
  }

  // Action: Đồng bộ danh sách nháp từ server về Store
  async loadDraftsFromServer() {
    this.isLoading = true;
    try {
      const response = await apiRedmine.getDrafts();
      if (response.data.success) {
        runInAction(() => {
          this.drafts = response.data.data;
        });
      }
    } catch (error) {
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Action: Gửi yêu cầu tạo Nháp mới lên DB và cập nhật local state
  async addDraft(payload: Omit<RedmineDraft, '_id'>) {
    try {
      const response = await apiRedmine.createDraft(payload);
      if (response.status === 200 || response.status === 201) {
        // Sau khi lưu server thành công, load lại danh sách để đảm bảo ID đồng bộ chính xác
        await this.loadDraftsFromServer();
      }
    } catch (error) {
      alert('Failed to save quick draft.');
    }
  }

  // Action: Xóa nháp khỏi danh sách và gọi API xóa cứng trong cơ sở dữ liệu
  async deleteDraft(id: string) {
    try {
      // Optimistic Update: Xóa ở local trước cho UI mượt mà phản hồi ngay lập tức
      const backupDrafts = [...this.drafts];
      this.drafts = this.drafts.filter((d) => d._id !== id);

      const response = await apiRedmine.deleteDraft(id);
      if (response.status !== 200 && response.status !== 204) {
        // Rollback lại dữ liệu nếu API trả về mã lỗi
        runInAction(() => {
          this.drafts = backupDrafts;
        });
        alert('Failed to delete draft from server.');
      }
    } catch (error) {
    }
  }

  async loadQuickDraftTrackers() {
    try {
      const response = await apiRedmine.getScrapeFilters();
      const result = response.data;

      if (result.success && result.data && result.data.trackers) {
        runInAction(() => {
          this.trackers = result.data.trackers;

          result.data.trackers.forEach((t: TrackerItem) => {
            this.trackerMap[t.id] = t.name;
          });
        });
      }
    } catch (error) {
      // Fallback danh sách mặc định nếu API lỗi để bảo vệ UI không bị trống rỗng
      runInAction(() => {
        this.trackers = [{ id: '5', name: 'Task (Default)' }];
        this.trackerMap = { 5: 'Task (Default)' };
      });
    }
  }

  async loadActivities() {
    try {
      const response = await apiRedmine.getActivities();
      if (response.data && response.data.activities) {
        runInAction(() => {
          this.activities = response.data.activities;
          // Build map tra cứu tên nhanh
          response.data.activities.forEach((act) => {
            this.activityMap[act.id] = act.name;
          });
        });
      }
    } catch (error) {
    }
  }
}
