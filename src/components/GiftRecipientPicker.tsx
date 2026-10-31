import React from 'react';
import { apiPremiumPlan, GiftRecipient } from '@/services/apiPremiumPlan';

interface Props { value: GiftRecipient | null; onChange: (value: GiftRecipient | null) => void; disabled?: boolean; excludeEmail?: string }
export default function GiftRecipientPicker({ value, onChange, disabled, excludeEmail }: Props) {
  const [search, setSearch] = React.useState('');
  const [users, setUsers] = React.useState<GiftRecipient[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => { setPage(1); setUsers([]); }, [search]);
  React.useEffect(() => {
    const request = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const result = await apiPremiumPlan.getGiftRecipients(search.trim(), page, request.signal);
        if (request.signal.aborted) return;
        setUsers(previous => page === 1 ? result.data : [...new Map([...previous, ...result.data].map(user => [user.id, user])).values()]);
        setHasMore(result.pagination.hasNextPage);
      } catch (error) { if (!request.signal.aborted) setError('Unable to load recipients. Please retry.'); }
      finally { if (!request.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); request.abort(); };
  }, [search, page, retry]);
  return (
    <div className="space-y-2">
      <label htmlFor="gift-recipient-search" className="block text-xs font-bold text-teal-800">Gift recipient</label>
      <p className="text-xs leading-5 text-slate-500">Choose another user with no active plan. Expired plans are eligible. Your friend receives the same plan.</p>
      {value && <div className="flex items-center justify-between gap-2 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs"><span className="break-all font-semibold text-teal-800">🎁 {value.email}</span><button type="button" disabled={disabled} onClick={() => onChange(null)} className="font-bold text-teal-700 cursor-pointer">Change</button></div>}
      {!value && <>
        <input id="gift-recipient-search" type="search" value={search} disabled={disabled} onChange={event => setSearch(event.target.value)} placeholder="Search user email..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 outline-none" />
        {error ? <p role="alert" className="text-xs text-rose-600">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline cursor-pointer">Retry</button></p> : <>
          <div aria-label="Eligible gift recipients" className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {users.filter(user => user.email !== excludeEmail).map(user => <button type="button" disabled={disabled || loading} key={user.id} onClick={() => onChange(user)} className="block w-full px-3 py-2 text-left text-xs break-all hover:bg-teal-50 disabled:opacity-50 cursor-pointer">{user.email}</button>)}
            {loading && <p role="status" className="p-3 text-xs text-slate-500">Loading recipients...</p>}
            {!loading && !users.length && <p className="p-3 text-xs text-slate-500">No eligible users found.</p>}
          </div>
          {hasMore && <button type="button" disabled={loading || disabled} onClick={() => setPage(value => value + 1)} className="text-xs font-bold text-teal-700 cursor-pointer">Load more users</button>}
        </>}
      </>}
    </div>
  );
}
