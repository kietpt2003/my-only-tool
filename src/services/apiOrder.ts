import axiosClient from './axiosClient';

export interface OrderItem {
  _id: string;
  orderId: string;
  amount: number;
  planType: string;
  status: number; // Tương ứng với Enum ORDER_STATUS
  paymentMethod: number; // Tương ứng với Enum PAYMENT_METHOD
  createdAt: string;
}

export interface OrderPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface OrderListResponse {
  success: boolean;
  message: string;
  data: OrderItem[];
  pagination: OrderPagination;
}

export const apiOrder = {
  getOrders: async (page: number = 1, limit: number = 10): Promise<OrderListResponse> => {
    const response = await axiosClient.get<OrderListResponse>(`/api/orders?page=${page}&limit=${limit}`);
    return response.data;
  }
};
