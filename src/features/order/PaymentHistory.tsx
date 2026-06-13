import React from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/store";

// Helper chuyển đổi trạng thái (Enum ORDER_STATUS)
const getStatusBadge = (status: number) => {
  switch (status) {
    case 1: return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold">COMPLETED</span>;
    case 2: return <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-[11px] font-bold">FAILED</span>;
    case 3: return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold">REFUNDED</span>;
    case 4: return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[11px] font-bold">PENDING</span>;
    default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-[11px] font-bold">UNKNOWN</span>;
  }
};

// Helper chuyển đổi phương thức thanh toán (Enum PAYMENT_METHOD)
const getMethodText = (method: number) => {
  switch (method) {
    case 1: return "PayPal (USD)";
    case 2: return "VietQR (VND)";
    case 3: return "Cash (VND)";
    default: return "Unknown";
  }
};

const PaymentHistory = observer(() => {
  const { orderStore } = useStore();
  const { orders, isLoading, isLoadingMore, hasNextPage, fetchOrders, loadMoreOrders } = orderStore;

  // Tự động fetch data trang 1 khi Component vừa render
  React.useEffect(() => {
    fetchOrders(1);

    // Tùy chọn: Xóa data cũ khi thoát Tab
    // return () => orderStore.resetStore(); 
  }, [fetchOrders]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <span className="animate-spin text-2xl mr-3">⏳</span> Loading your transactions...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
        <div className="text-4xl mb-3 opacity-50">🧾</div>
        <h3 className="text-sm font-bold text-slate-600">No payment history</h3>
        <p className="text-xs text-slate-400 mt-1">You haven't made any transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
              <th className="px-5 py-4">Order ID / Date</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {orders.map((order) => (
              <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-mono text-xs font-bold text-slate-700">{order.orderId}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg text-xs">
                    {order.planType}
                  </span>
                </td>
                <td className="px-5 py-4 font-black text-slate-800">
                  {order.paymentMethod === 1
                    ? `$${order.amount.toFixed(2)}`
                    : `${order.amount.toLocaleString("vi-VN")} ₫`}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                  {getMethodText(order.paymentMethod)}
                </td>
                <td className="px-5 py-4 text-right">
                  {getStatusBadge(order.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RENDER NÚT LOAD MORE (Nếu Backend báo còn dữ liệu) */}
      {hasNextPage && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
          <button
            onClick={loadMoreOrders}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingMore ? "⏳ Loading..." : "Load More Transactions ⬇️"}
          </button>
        </div>
      )}
    </div>
  );
});

export default PaymentHistory;
