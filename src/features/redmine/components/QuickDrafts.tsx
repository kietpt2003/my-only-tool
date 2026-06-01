import React from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from '@/store';
import DraftItem from './DraftItem';

function QuickDrafts() {
  const {
    draftStore: {
      addDraft,
      loadDraftsFromServer,
      deleteDraft,
      filteredDrafts,
      searchDraftQuery,
      setSearchDraftQuery,
      trackers,
      trackerMap,
      loadQuickDraftTrackers,
      // 👉 Lấy thêm dữ liệu Activity từ Store
      activities,
      activityMap,
      loadActivities,
    },
    redmineUserStore: {
      setShowLoginModal
    }
  } = useStore();

  const [draftSubject, setDraftSubject] = React.useState('');
  const [draftHours, setDraftHours] = React.useState('');
  const [draftActivity, setDraftActivity] = React.useState('');
  const [draftTracker, setDraftTracker] = React.useState('5');
  const [draftDate, setDraftDate] = React.useState('');

  const handleAddDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftSubject || !draftHours || !draftActivity) {
      alert('Please enter subject, hours and select an Activity!');
      return;
    }

    addDraft({
      subject: draftSubject,
      hours: parseFloat(draftHours),
      trackerId: draftTracker,
      activityId: draftActivity,
      spentOn: draftDate
    });

    setDraftSubject('');
    setDraftHours('');
  };

  React.useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setDraftDate(today);

    loadDraftsFromServer();
    loadQuickDraftTrackers();
    loadActivities();
  }, []);

  return (
    <aside className="xl:col-span-1 space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📝</span> Quick Drafts
          </h3>
          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
            {filteredDrafts.length}
          </span>
        </div>

        {/* Form tạo nháp nhanh */}
        <form onSubmit={handleAddDraft} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
          <input
            type="text"
            placeholder="Task description (e.g., Log task...)"
            value={draftSubject}
            onChange={e => setDraftSubject(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-teal-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={draftTracker}
              onChange={e => setDraftTracker(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none cursor-pointer"
            >
              {trackers.length === 0 ? (
                <option value="5">Task</option>
              ) : (
                trackers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>
            <select
              value={draftActivity}
              onChange={e => setDraftActivity(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none cursor-pointer"
            >
              <option value="">-- Activity --</option>
              {activities.map(act => (
                <option key={act.id} value={act.id}>{act.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Hours"
              step="0.1"
              min="0.1"
              value={draftHours}
              onChange={e => setDraftHours(e.target.value)}
              className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-teal-500"
            />
            <input
              type="date"
              value={draftDate}
              onChange={e => setDraftDate(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-teal-500"
            />
            <button type="submit" className="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-xs hover:bg-teal-700 transition-all cursor-pointer">
              Add
            </button>
          </div>
        </form>

        <input
          type="text"
          placeholder="🔍 Filter drafts below..."
          value={searchDraftQuery}
          onChange={e => setSearchDraftQuery(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
        />

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {filteredDrafts.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-6 italic">No draft data found</div>
          ) : (
            filteredDrafts.map(draft => (
              <DraftItem
                key={draft._id}
                item={draft}
                searchQuery={searchDraftQuery}
                onPress={() => deleteDraft(draft._id)}
              />
            ))
          )}
        </div>
      </div>

      {/* PREFERENCES CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
          <span>⚙️</span> Preferences
        </h3>
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all cursor-pointer"
        >
          🔑 Update Redmine Login
        </button>
      </div>
    </aside>
  )
}

export default observer(QuickDrafts);
