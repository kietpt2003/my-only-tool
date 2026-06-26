import React from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from '@/store';
import { apiAdmin } from '@/services/apiAdmin';
import { USER_ROLE } from '@/constants/user';
import { PREMIUM_PLAN } from '@/constants/premiumPlan';

interface ExtendedAdminUser {
  id?: string;
  email: string;
  role: string;
  createdAt?: string;
  isSuperAdmin?: boolean;
  hasUsedTrial?: boolean;
  premiumPlan?: "NONE" | "TRIAL" | "DAILY" | "MONTHLY" | "YEARLY" | "LIFETIME";
  premiumValidUntil?: string | null;
  lastLoginAt?: string | null;
}

const AdminTab: React.FC = observer(() => {
  const {
    authStore: { user: loggedInUser },
    languagesStore: {
      languages,
      isLoading,
      fetchLanguages,
      addLanguage,
      deleteLanguage
    }
  } = useStore();

  const [users, setUsers] = React.useState<ExtendedAdminUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = React.useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserRole, setNewUserRole] = React.useState('user');
  const [newLangCode, setNewLangCode] = React.useState('');
  const [newLangName, setNewLangName] = React.useState('');
  const [isLangSubmitting, setIsLangSubmitting] = React.useState(false);

  const isCurrentSuperAdmin = users.find(u => u.email === loggedInUser?.email)?.isSuperAdmin || false;

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const response = await apiAdmin.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiAdmin.addUser(newUserEmail, newUserRole);
      setNewUserEmail('');
      alert('User added successfully!');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) return;
    try {
      await apiAdmin.deleteUser(email);
      setUsers(users.filter(u => u.email !== email));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handlePlanChange = async (email: string, currentPlan: string, nextPlan: string) => {
    if (currentPlan === nextPlan) return;

    if (nextPlan === PREMIUM_PLAN.NONE) {
      if (!window.confirm(`Cancel all VIP privileges and downgrade account ${email} to subscription (${PREMIUM_PLAN.NONE})?`)) {
        fetchUsers();
        return;
      }
      try {
        const response = await apiAdmin.revokeUserPremium(email);
        alert(response.data?.message || "Revoke subscription success!");
        fetchUsers();
      } catch (error: any) {
        alert(error.response?.data?.message || 'The Premium subscription cannot be revoked.');
        fetchUsers();
      }
      return;
    }

    if (!window.confirm(`Upgrade account ${email} to Premium [${nextPlan}]?`)) {
      fetchUsers();
      return;
    }
    try {
      const response = await apiAdmin.grantUserPremium(email, nextPlan);
      alert(response.data?.message || "Update success!");
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Cannot update subscription');
      fetchUsers();
    }
  };

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLangSubmitting(true);
    try {
      await addLanguage(newLangCode, newLangName);
      setNewLangCode('');
      setNewLangName('');
      alert('Language added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add language');
    } finally {
      setIsLangSubmitting(false);
    }
  };

  const handleDeleteLanguage = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete language ${code}?`)) return;
    try {
      await deleteLanguage(code);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete language');
    }
  };

  React.useEffect(() => {
    fetchUsers();
    if (languages.length === 0) {
      fetchLanguages();
    }
  }, []);

  const renderPlanBadge = (u: ExtendedAdminUser) => {
    if (u.isSuperAdmin) {
      return (
        <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">
          ALL ACCESS
        </span>
      );
    }

    switch (u.premiumPlan) {
      case "LIFETIME":
        return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">👑 {PREMIUM_PLAN.LIFETIME}</span>;
      case "YEARLY":
        return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">💎 {PREMIUM_PLAN.YEARLY}</span>;
      case "MONTHLY":
        return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-700 border border-teal-200">📅 {PREMIUM_PLAN.MONTHLY}</span>;
      case "DAILY":
        return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">☀️ {PREMIUM_PLAN.DAILY}</span>;
      case "TRIAL":
        return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">🎁 {PREMIUM_PLAN.TRIAL}</span>;
      default:
        return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200">{PREMIUM_PLAN.NONE}</span>;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-8">

      {/* TITLE BLOCK */}
      <div>
        <h3 className="text-2xl font-bold text-rose-800 flex items-center gap-2 tracking-tight">
          <span>⚙️</span> Admin Management
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Manage system users, dynamic premium tiers, and translation languages.
        </p>
      </div>

      {/* SECTION 1: MANAGE USERS */}
      <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-xs">
        <h4 className="text-lg font-bold text-rose-700 flex items-center gap-2 mb-4">
          <span>👥</span> Manage Users & Licenses
        </h4>

        {/* Form thêm user */}
        <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="email"
            placeholder="User Email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
            className="flex-2 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-white"
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-white cursor-pointer"
          >
            <option value={USER_ROLE.USER}>User</option>
            <option value={USER_ROLE.ADMIN}>Admin</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-rose-600 text-white font-semibold rounded-lg text-sm hover:bg-rose-700 active:scale-98 transition-all cursor-pointer shadow-sm shadow-rose-600/10"
          >
            Add User
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-xs text-left table-fixed">
            <thead>
              {/* 👉 ĐIỀU CHỈNH TỶ LỆ CỘT ĐỘNG DỰA TRÊN isCurrentSuperAdmin */}
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold whitespace-nowrap">
                <th className={`px-3 py-2.5 ${isCurrentSuperAdmin ? 'w-[20%]' : 'w-[25%]'}`}>Email</th>
                <th className={`px-3 py-2.5 ${isCurrentSuperAdmin ? 'w-[12%]' : 'w-[15%]'}`}>Role</th>
                <th className={`px-3 py-2.5 ${isCurrentSuperAdmin ? 'w-[13%]' : 'w-[15%]'}`}>Premium Plan</th>
                <th className="px-3 py-2.5 w-[15%]">Valid Until</th>

                {/* 👉 ĐIỀU KIỆN RENDER CỘT MỚI */}
                {isCurrentSuperAdmin && (
                  <th className="px-3 py-2.5 w-[15%]">Last Login</th>
                )}

                <th className={`px-3 py-2.5 text-center ${isCurrentSuperAdmin ? 'w-[15%]' : 'w-[20%]'}`}>Premium Actions</th>
                <th className="px-3 py-2.5 w-[10%] text-center">System</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isUsersLoading ? (
                <tr> <td colSpan={isCurrentSuperAdmin ? 7 : 6} className="text-center p-6 text-slate-400 italic">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={isCurrentSuperAdmin ? 7 : 6} className="text-center p-6 text-slate-400 italic">No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-700 truncate" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                        ${u.role === USER_ROLE.SUPER_ADMIN
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : u.role === USER_ROLE.ADMIN
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{renderPlanBadge(u)}</td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {u.isSuperAdmin || u.premiumPlan === "LIFETIME"
                        ? "∞ Permanent"
                        : u.premiumValidUntil
                          ? new Date(u.premiumValidUntil).toLocaleDateString('vi-VN', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })
                          : "—"
                      }
                    </td>

                    {/* 👉 ĐIỀU KIỆN RENDER NỘI DUNG CỘT LAST LOGIN */}
                    {isCurrentSuperAdmin && (
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('vi-VN', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })
                          : "-"
                        }
                      </td>
                    )}

                    <td className="px-3 py-2.5 text-center">
                      {u.isSuperAdmin ? (
                        <span className="text-[11px] text-slate-400 italic whitespace-nowrap">Super Admin bypassed</span>
                      ) : (
                        <select
                          disabled={!isCurrentSuperAdmin}
                          value={u.premiumPlan || "NONE"}
                          onChange={(e) => handlePlanChange(u.email, u.premiumPlan || "NONE", e.target.value)}
                          className={`w-full max-w-[160px] px-2 pr-7 py-1 border border-slate-200 text-slate-700 bg-white rounded-lg text-[11px] font-semibold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs transition-all ${!isCurrentSuperAdmin
                            ? "cursor-not-allowed opacity-50 bg-slate-50 border-slate-200 text-slate-400"
                            : "cursor-pointer hover:border-slate-300"
                            }`}
                        >
                          <option value="NONE">❌ NONE (Cancel)</option>
                          <option value="TRIAL">🎁 TRIAL (7d)</option>
                          <option value="DAILY">☀️ DAILY (1d)</option>
                          <option value="MONTHLY">📅 MONTHLY</option>
                          <option value="YEARLY">💎 YEARLY</option>
                          <option value="LIFETIME">👑 LIFETIME</option>
                        </select>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.email)}
                        disabled={u.isSuperAdmin}
                        className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 font-medium rounded-md text-xs hover:bg-red-600 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: MANAGE LANGUAGES */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-xs">
        <h4 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mb-4">
          <span>🌍</span> Manage Languages
        </h4>

        <form onSubmit={handleAddLanguage} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Language Code (e.g. vi)"
            value={newLangCode}
            onChange={(e) => setNewLangCode(e.target.value)}
            required
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
          />
          <input
            type="text"
            placeholder="Language Name (e.g. Vietnamese)"
            value={newLangName}
            onChange={(e) => setNewLangName(e.target.value)}
            required
            className="flex-2 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
          />
          <button
            type="submit"
            disabled={isLangSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-indigo-600/10"
          >
            {isLangSubmitting ? 'Adding...' : 'Add Language'}
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="p-3.5 w-[120px]">Code</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5 w-[100px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="text-center p-6 text-slate-400 italic">Loading languages...</td></tr>
              ) : languages.length === 0 ? (
                <tr><td colSpan={3} className="text-center p-6 text-slate-400 italic">No languages configured.</td></tr>
              ) : (
                languages.map((l) => (
                  <tr key={l.code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 font-bold text-indigo-600 uppercase tracking-wide">{l.code}</td>
                    <td className="p-3.5 font-medium text-slate-700">{l.name}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteLanguage(l.code)}
                        className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 font-medium rounded-md text-xs hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
});

export default AdminTab;
