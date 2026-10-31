import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { PREMIUM_PLAN } from '@/constants/premiumPlan';
import { useStore } from '@/store';
import { apiPremiumPlan, GiftRecipient, PaidPlanKey, PurchaseInvoice, PurchasePlan } from '@/services/apiPremiumPlan';
import GiftRecipientPicker from './GiftRecipientPicker';
import SubscriptionDialog from './SubscriptionDialog';

declare global {
  interface Window { showPremiumModal?: (currentPlan: string, hasUsedTrial?: boolean, buyOneGetOne?: boolean) => void }
}
interface Props { onClose?: () => void; checkCashStatus?: (callback?: () => void) => void }

export default function PremiumSubscriptionModal({ onClose }: Props) {
  const { authStore: { handleActivateTrial, isSubmittingPayment, checkAndSetToken } } = useStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState<string>(PREMIUM_PLAN.NONE);
  const [hasUsedTrial, setHasUsedTrial] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'VIETQR' | 'PAYPAL' | 'CASH'>('VIETQR');
  const [selectedPlan, setSelectedPlan] = React.useState<PaidPlanKey>('MONTHLY');
  const [plans, setPlans] = React.useState<PurchasePlan[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [catalogError, setCatalogError] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  const [buyOneGetOne, setBuyOneGetOne] = React.useState(false);
  const [recipient, setRecipient] = React.useState<GiftRecipient | null>(null);
  const [invoice, setInvoice] = React.useState<PurchaseInvoice | null>(null);
  const [invoiceMethod, setInvoiceMethod] = React.useState<'VIETQR' | 'CASH'>('VIETQR');
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);
  const [error, setError] = React.useState('');
  const [paymentDone, setPaymentDone] = React.useState(false);
  const locked = busy || isSubmittingPayment;
  const activePlan = plans.find(plan => plan.id === selectedPlan);
  const bogo = buyOneGetOne && !!activePlan?.bogoEnabled;
  const amountVnd = activePlan ? (bogo ? activePlan.bogoVndPrice : activePlan.vndPrice) : 0;
  const amountUsd = activePlan ? (bogo ? activePlan.bogoUsdPrice : activePlan.usdPrice) : 0;
  const ready = !!activePlan && !catalogLoading && !catalogError && (!bogo || !!recipient);
  const choice = { planType: selectedPlan, buyOneGetOne: bogo, ...(bogo && recipient ? { recipientUserId: recipient.id } : {}) };
  const setProcessing = (value: boolean) => { busyRef.current = value; setBusy(value); };

  React.useEffect(() => {
    window.showPremiumModal = (plan, trialStatus, promotion = false) => {
      if (busyRef.current) return;
      setCurrentPlan(plan || PREMIUM_PLAN.NONE); setHasUsedTrial(!!trialStatus);
      setBuyOneGetOne(promotion); setRecipient(null); setInvoice(null); setError(''); setPaymentDone(false); setIsOpen(true);
      window.dispatchEvent(new Event('premium-modal-open'));
    };
    return () => { delete window.showPremiumModal; };
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const request = new AbortController();
    setCatalogLoading(true); setCatalogError('');
    apiPremiumPlan.getPlans(request.signal).then(result => {
      if (!request.signal.aborted) {
        setPlans(result.data);
        if (!result.data.some(plan => plan.id === selectedPlan)) setSelectedPlan(result.data[0]?.id || 'MONTHLY');
      }
    }).catch(() => { if (!request.signal.aborted) setCatalogError('Unable to load plan prices. Please retry.'); })
      .finally(() => { if (!request.signal.aborted) setCatalogLoading(false); });
    return () => request.abort();
  }, [isOpen, retry]);

  const close = () => {
    if (busyRef.current) return;
    setIsOpen(false); onClose?.();
  };
  const purchaseSuccess = (token?: string) => {
    if (token) checkAndSetToken(token);
    setPaymentDone(true); setIsOpen(false); onClose?.();
    window.location.reload();
  };

  React.useEffect(() => {
    if (!isOpen || !invoice || paymentDone) return;
    let active = true; let checking = false;
    const request = new AbortController();
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await apiPremiumPlan.checkOrderStatus(invoice.orderCode, request.signal);
        if (active && result.status === 'COMPLETED' && result.newToken) purchaseSuccess(result.newToken);
      } catch { if (active) setError('Could not refresh payment status. Your order is saved; checking will retry automatically.'); }
      finally { checking = false; }
    };
    check();
    const interval = setInterval(check, 3000);
    return () => { active = false; clearInterval(interval); request.abort(); };
  }, [isOpen, invoice?.orderCode, paymentDone]);

  const startOffline = async () => {
    if (!ready || busyRef.current) return;
    setProcessing(true); setError('');
    try {
      const result = paymentMethod === 'CASH' ? await apiPremiumPlan.createCashOrder(choice) : await apiPremiumPlan.createSePayOrder(choice);
      setInvoice(result); setInvoiceMethod(paymentMethod === 'CASH' ? 'CASH' : 'VIETQR');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Unable to create your invoice. Please retry.');
      if (error.response?.status === 409) setRecipient(null);
    } finally { setProcessing(false); }
  };

  if (!isOpen) return null;
  return (
    <SubscriptionDialog title="Upgrade to Premium Plan" onClose={close} busy={locked}>
      <div className="text-center mb-5 pr-4">
        <div className="text-3xl mb-2">👑</div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Upgrade to Premium Plan</h2>
        <p className="text-xs text-slate-500 mt-2">Current tier: <span className="font-bold text-teal-700">{currentPlan}</span></p>
      </div>
      {!hasUsedTrial && !invoice && <div className="flex flex-wrap items-center justify-between gap-3 p-4 mb-5 rounded-2xl bg-amber-50 border border-amber-200">
        <div><strong className="text-sm text-amber-900">🎁 7-day free trial</strong><p className="text-xs text-amber-700 mt-1">Buy 1 Get 1 applies to paid plans only.</p></div>
        <button type="button" disabled={locked} onClick={async () => { setProcessing(true); try { await handleActivateTrial(() => purchaseSuccess()); } finally { setProcessing(false); } }} className="px-4 py-2 rounded-xl bg-white text-amber-800 font-bold text-xs disabled:opacity-50 cursor-pointer">Start Free Trial</button>
      </div>}
      {error && <p role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs leading-5">{error}</p>}
      {catalogError && <p role="alert" className="mb-4 text-sm text-rose-600">{catalogError} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline cursor-pointer">Retry</button></p>}
      {catalogLoading && <p role="status" className="text-sm text-slate-500 py-5">Loading prices...</p>}
      {!catalogLoading && !catalogError && !invoice && <>
        <fieldset disabled={locked} className="mb-5">
          <legend className="text-xs font-bold text-slate-500 mb-2">1. Payment method</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([{ id: 'VIETQR', label: '🏦 Chuyển khoản' }, { id: 'PAYPAL', label: '💳 Thẻ quốc tế' }, { id: 'CASH', label: '💵 Tiền mặt' }] as const).map(method =>
              <button type="button" key={method.id} aria-pressed={paymentMethod === method.id} onClick={() => { setPaymentMethod(method.id); setError(''); }} className={`px-3 py-2.5 text-xs font-bold rounded-xl border cursor-pointer ${paymentMethod === method.id ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>{method.label}</button>)}
          </div>
        </fieldset>
        <fieldset disabled={locked} className="mb-5">
          <legend className="text-xs font-bold text-slate-500 mb-3">2. Choose your plan</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map(plan => {
              const promotional = buyOneGetOne && plan.bogoEnabled;
              const price = paymentMethod === 'PAYPAL' ? (promotional ? plan.bogoUsdPrice : plan.usdPrice) : (promotional ? plan.bogoVndPrice : plan.vndPrice);
              return <button type="button" key={plan.id} aria-pressed={selectedPlan === plan.id} onClick={() => { setSelectedPlan(plan.id); setError(''); if (!plan.bogoEnabled) { setBuyOneGetOne(false); setRecipient(null); } }} className={`text-left p-4 rounded-2xl border-2 cursor-pointer ${selectedPlan === plan.id ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200'}`}>
                <span className="block text-sm font-bold text-slate-800">{plan.name}</span>
                <span className="block text-[11px] text-slate-500 mt-1">{plan.subName}</span>
                <span className="block text-lg font-black text-slate-900 mt-2">{paymentMethod === 'PAYPAL' ? `$${price.toFixed(2)}` : `${price.toLocaleString('vi-VN')} ₫`}</span>
                {promotional && <span className="text-[10px] font-bold text-teal-700">Buy 1 Get 1 · 2 users</span>}
              </button>;
            })}
          </div>
        </fieldset>
        {plans.some(plan => plan.bogoEnabled) && <section className="mb-5 rounded-2xl border border-teal-200 bg-teal-50/30 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-teal-900 cursor-pointer">
            <input type="checkbox" checked={bogo} disabled={locked || !activePlan?.bogoEnabled} onChange={event => { setBuyOneGetOne(event.target.checked); setRecipient(null); setError(''); }} className="w-4 h-4 accent-teal-600" />
            🎁 Buy 1 Get 1
          </label>
          {!activePlan?.bogoEnabled && <p className="text-xs text-slate-500">This plan is not included in the promotion.</p>}
          {bogo && <>
            <p className="text-xs leading-5 text-slate-600">One checkout activates {activePlan?.name} for you and one eligible friend. The displayed price includes the promotion surcharge.</p>
            <GiftRecipientPicker value={recipient} onChange={setRecipient} disabled={locked} />
          </>}
        </section>}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-4 flex items-center justify-between gap-3">
          <div><span className="text-xs font-bold text-slate-500">Total · {bogo ? '2 users' : '1 user'}</span>{recipient && bogo && <p className="text-[11px] text-teal-700 break-all mt-1">Gift: {recipient.email}</p>}</div>
          <strong className="text-xl font-black text-slate-900 whitespace-nowrap">{paymentMethod === 'PAYPAL' ? `$${amountUsd.toFixed(2)}` : `${amountVnd.toLocaleString('vi-VN')} ₫`}</strong>
        </div>
        {bogo && !recipient && <p className="text-xs text-amber-700 mb-3">Select a recipient before continuing to payment.</p>}
        {paymentMethod === 'PAYPAL' ? <PayPalButtons
          disabled={!ready || locked}
          forceReRender={[selectedPlan, bogo, recipient?.id, amountUsd]}
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
          createOrder={async () => {
            if (!ready) throw new Error('Select a valid plan and recipient');
            setProcessing(true); setError('');
            try { return (await apiPremiumPlan.createPaypalOrder(choice)).id; }
            catch (error: any) { setProcessing(false); setError(error.response?.data?.message || 'Unable to start PayPal checkout.'); throw error; }
          }}
          onApprove={async data => {
            setProcessing(true);
            try { const result = await apiPremiumPlan.capturePaypalOrder(data.orderID); purchaseSuccess(result.newToken); }
            catch (error: any) { setError(error.response?.data?.message || `Payment could not be confirmed. Contact admin with order ${data.orderID}.`); }
            finally { setProcessing(false); }
          }}
          onCancel={() => setProcessing(false)}
          onError={() => { setProcessing(false); setError(previous => previous || 'PayPal checkout was interrupted. Please retry.'); }}
        /> : <button type="button" disabled={!ready || locked} onClick={startOffline} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">{locked ? 'Creating invoice...' : paymentMethod === 'CASH' ? 'Create cash invoice' : 'Tạo mã QR thanh toán'}</button>}
      </>}
      {invoice && <section className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/30 p-4 text-center">
        <h3 className="text-lg font-bold text-slate-900">{invoiceMethod === 'CASH' ? 'Cash payment invoice' : 'Bank transfer invoice'}</h3>
        <p className="text-sm font-semibold text-slate-700">{plans.find(plan => plan.id === invoice.planType)?.name || invoice.planType}{invoice.buyOneGetOne ? ' · Buy 1 Get 1' : ''}</p>
        <strong className="block text-2xl text-teal-800">{invoice.amount.toLocaleString('vi-VN')} ₫</strong>
        {invoice.recipientEmail && <p className="text-xs text-teal-700 break-all">Gift recipient: {invoice.recipientEmail}</p>}
        {invoice.qrUrl && <img src={invoice.qrUrl} alt="Payment QR code" className="mx-auto w-60 h-60 rounded-xl border border-slate-200 bg-white p-2" />}
        <p className="font-mono text-xs break-all select-all rounded-lg bg-white p-3 border border-slate-200">{invoiceMethod === 'CASH' ? invoice.orderCode : invoice.memo}</p>
        <p role="status" className="text-xs leading-5 text-amber-700">{invoiceMethod === 'CASH' ? 'Give this order code and the total amount to admin. Both plans activate after admin confirms payment.' : 'Waiting for bank transfer confirmation. Both plans activate together after the payment is confirmed.'}</p>
        <button type="button" onClick={() => { setInvoice(null); setError(''); }} className="text-xs underline text-slate-500 cursor-pointer">Choose another option</button>
      </section>}
    </SubscriptionDialog>
  );
}
