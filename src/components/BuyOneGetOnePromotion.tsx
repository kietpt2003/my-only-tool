import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { apiPremiumPlan, PurchasePlan } from '@/services/apiPremiumPlan';
import SubscriptionDialog from './SubscriptionDialog';

interface Props { placement: 'home' | 'redmine'; blocked?: boolean; compact?: boolean }
export default observer(function BuyOneGetOnePromotion({ placement, blocked = false, compact = false }: Props) {
  const { authStore: { user } } = useStore();
  const [plans, setPlans] = React.useState<PurchasePlan[]>([]);
  const [open, setOpen] = React.useState(false);
  const key = `bogo:v1:${user?.id || user?.email}:${placement}`;
  React.useEffect(() => {
    if (!user) return;
    const request = new AbortController();
    apiPremiumPlan.getPlans(request.signal).then(result => { if (!request.signal.aborted) setPlans(result.data.filter(plan => plan.bogoEnabled)); }).catch(() => {});
    return () => request.abort();
  }, [user?.id, user?.email]);
  React.useEffect(() => {
    if (!plans.length || blocked) return;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, 'shown'); } catch {}
    setOpen(true);
  }, [plans, key, blocked]);
  React.useEffect(() => {
    const hideForCheckout = () => { setOpen(false); try { sessionStorage.setItem(key, 'shown'); } catch {} };
    window.addEventListener('premium-modal-open', hideForCheckout);
    return () => window.removeEventListener('premium-modal-open', hideForCheckout);
  }, [key]);
  if (!plans.length || blocked) return null;
  return <>
    <button type="button" onClick={() => setOpen(true)} className={compact ? 'inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-bold text-teal-800 cursor-pointer hover:bg-teal-100' : 'w-full rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-4 text-left cursor-pointer hover:border-teal-400'}>
      {compact ? '🎁 Buy 1 Get 1' : <><span className="block text-sm font-bold text-teal-900">🎁 Buy 1 Get 1 · Share Premium with a friend</span>
      <span className="block text-xs leading-5 text-teal-700 mt-1">Choose a participating plan and gift the same plan to one user with no active subscription. View offer →</span></>}
    </button>
    {open && <SubscriptionDialog title="Buy 1 Get 1" onClose={() => setOpen(false)}>
      <div className="text-4xl mb-3">🎁</div>
      <h2 className="text-2xl font-black text-teal-900">Buy 1 Get 1</h2>
      <p className="text-sm leading-6 text-slate-600 mt-3">Choose a participating plan, turn on Buy 1 Get 1 and select a friend. Both accounts receive the same plan after payment is confirmed.</p>
      <p className="text-xs leading-5 text-slate-500 mt-2">Recipients must have no active plan. Users whose plans have expired are eligible. One recipient per purchase.</p>
      <div className="overflow-x-auto my-5 rounded-xl border border-slate-200">
        <table className="w-full text-xs text-left">
          <caption className="p-3 text-left font-semibold text-slate-700">Total Buy 1 Get 1 prices for two users</caption>
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Plan</th><th className="p-3">Bank / Cash</th><th className="p-3">Card / PayPal</th></tr></thead>
          <tbody>{plans.map(plan => <tr key={plan.id} className="border-t border-slate-100"><td className="p-3 font-semibold">{plan.name}</td><td className="p-3 whitespace-nowrap">{plan.bogoVndPrice.toLocaleString('vi-VN')} ₫</td><td className="p-3">${plan.bogoUsdPrice.toFixed(2)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mb-4">Lifetime VIP keeps its original price. Bank transfer and cash use the same VND pricing.</p>
      <button type="button" onClick={() => { setOpen(false); window.showPremiumModal?.(user?.premiumPlan || 'NONE', user?.hasUsedTrial, true); }} className="w-full py-3 rounded-xl bg-teal-600 text-white text-sm font-bold cursor-pointer hover:bg-teal-700">Choose a Buy 1 Get 1 plan</button>
    </SubscriptionDialog>}
  </>;
});
