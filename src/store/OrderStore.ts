// src/store/orderStore.ts
import { makeAutoObservable, runInAction } from "mobx";

import { apiOrder, OrderItem } from "@/services/apiOrder";

export class OrderStore {
  orders: OrderItem[] = [];
  isLoading: boolean = false;      // Loading lần đầu
  isLoadingMore: boolean = false;  // Loading khi bấm Load More
  currentPage: number = 1;
  hasNextPage: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Hàm fetch danh sách order (Mặc định gọi trang 1)
  fetchOrders = async (page: number = 1, limit: number = 10) => {
    if (page === 1) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    try {
      const response = await apiOrder.getOrders(page, limit);

      runInAction(() => {
        if (response.success) {
          if (page === 1) {
            // Nếu là trang 1 thì ghi đè mảng
            this.orders = response.data;
          } else {
            // Nếu là Load More thì nối mảng cũ với data mới
            this.orders = [...this.orders, ...response.data];
          }

          this.currentPage = response.pagination.currentPage;
          this.hasNextPage = response.pagination.hasNextPage;
        }
      });
    } catch (error) {
      console.error("Lỗi khi fetch lịch sử giao dịch:", error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isLoadingMore = false;
      });
    }
  };

  // Hàm gọi khi người dùng bấm nút "Tải thêm"
  loadMoreOrders = () => {
    if (this.hasNextPage && !this.isLoadingMore) {
      this.fetchOrders(this.currentPage + 1);
    }
  };

  // Reset store (Dùng khi unmount component nếu cần)
  resetStore = () => {
    this.orders = [];
    this.currentPage = 1;
    this.hasNextPage = false;
  };
}
