import React from 'react';
import GiftRecipientPicker from './GiftRecipientPicker';
import { apiPremiumPlan, GiftRecipient, PurchaseInvoice } from '@/services/apiPremiumPlan';

type CashOrder = PurchaseInvoice & { orderId: string; userEmail: string; createdAt: string; paymentVerifiedAt?: string };
export default function PendingCashOrders({ onFulfilled }: { onFulfilled?: () => void | Promise<void> }) {
  const [orders, setOrders] = React.useState<CashOrder[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [confirming, setConfirming] = React.useState('');
  const [reviewOrder, setReviewOrder] = React.useState<CashOrder | null>(null);
  const [reviewRecipient, setReviewRecipient] = React.useState<GiftRecipient | null>(null);
  const [error, setError] = React.useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setOrders((await apiPremiumPlan.getPendingCashOrders()).data); }
    catch (error: any) { setError(error.response?.data?.message || 'Unable to load cash invoices.'); }
    finally { setLoading(false); }
  };
  React.useEffect(() => { load(); }, []);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">💵 Cash invoices & paid orders for review</h3><button type="button" disabled={loading || !!confirming} onClick={load} className="text-xs font-bold text-teal-700 cursor-pointer">Refresh</button></div>
    <p className="text-xs text-slate-500">Confirm only after receiving the displayed total. Buy 1 Get 1 activates the buyer and gift recipient together.</p>
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    {reviewOrder && <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 space-y-3">
      <p className="text-xs font-bold text-amber-900 break-all">Correct gift recipient · {reviewOrder.orderId}</p>
      <GiftRecipientPicker value={reviewRecipient} onChange={setReviewRecipient} excludeEmail={reviewOrder.userEmail} disabled={!!confirming} />
      <div className="flex gap-3">
        <button type="button" disabled={!reviewRecipient || !!confirming} onClick={async () => {
          if (!reviewRecipient || !window.confirm(`Assign the paid gift to ${reviewRecipient.email} and activate both plans?`)) return;
          setConfirming(reviewOrder.orderId); setError('');
          try { await apiPremiumPlan.correctGiftRecipient(reviewOrder.orderId, reviewRecipient.id); setReviewOrder(null); await load(); await onFulfilled?.(); }
          catch (error: any) { setError(error.response?.data?.message || 'Unable to correct recipient.'); }
          finally { setConfirming(''); }
        }} className="rounded-lg bg-teal-600 text-white px-3 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer">Save recipient & activate</button>
        <button type="button" disabled={!!confirming} onClick={() => setReviewOrder(null)} className="text-xs text-slate-500 cursor-pointer">Cancel</button>
      </div>
    </div>}
    {loading ? <p className="text-xs text-slate-500">Loading invoices...</p> : !orders.length ? <p className="text-xs text-slate-400">No pending cash invoices or payments needing review.</p> : <div className="space-y-2 max-h-96 overflow-y-auto">
      {orders.map(order => <div key={order.orderId} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
        <p className="font-mono break-all text-slate-600">{order.orderId}</p>
        <p className="font-semibold break-all">{order.userEmail}</p>
        <p>{order.planType}{order.buyOneGetOne ? ' · Buy 1 Get 1' : ''} · <strong>{order.amount.toLocaleString('vi-VN')} ₫</strong></p>
        {order.recipientEmail && <p className="break-all text-teal-700">Gift: {order.recipientEmail}</p>}
        {order.paymentVerifiedAt && order.buyOneGetOne ? <button type="button" disabled={!!confirming} onClick={() => { setReviewOrder(order); setReviewRecipient(null); }} className="mt-2 text-xs font-bold text-amber-700 underline cursor-pointer">Payment verified · review gift recipient</button> : <button type="button" disabled={!!confirming} onClick={async () => {
          if (!window.confirm(`Confirm receipt of ${order.amount.toLocaleString('vi-VN')} VND for ${order.userEmail}${order.recipientEmail ? ` and gift to ${order.recipientEmail}` : ''}?`)) return;
          setConfirming(order.orderId); setError('');
          try { await apiPremiumPlan.confirmCashOrder(order.orderId); await load(); await onFulfilled?.(); }
          catch (error: any) { setError(error.response?.data?.message || 'Unable to confirm payment.'); }
          finally { setConfirming(''); }
        }} className="mt-2 rounded-lg bg-teal-600 text-white px-3 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer">{confirming === order.orderId ? 'Confirming...' : 'Confirm cash received'}</button>}
      </div>)}
    </div>}
  </section>;
}
