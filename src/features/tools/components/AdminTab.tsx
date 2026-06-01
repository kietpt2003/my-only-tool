import React from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from '@/store';
import { apiAdmin, AdminUser } from '@/services/apiAdmin';
import { USER_ROLE } from '@/constants/user';

const AdminTab: React.FC = observer(() => {
  const {
    languagesStore: {
      languages,
      isLoading,
      fetchLanguages,
      addLanguage,
      deleteLanguage
    }
  } = useStore();

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = React.useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserRole, setNewUserRole] = React.useState('user');
  const [newLangCode, setNewLangCode] = React.useState('');
  const [newLangName, setNewLangName] = React.useState('');
  const [isLangSubmitting, setIsLangSubmitting] = React.useState(false);

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

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-8">

      {/* TITLE BLOCK */}
      <div>
        <h3 className="text-2xl font-bold text-rose-800 flex items-center gap-2 tracking-tight">
          <span>⚙️</span> Admin Management
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Manage system users and translation languages.
        </p>
      </div>

      {/* SECTION 1: MANAGE USERS */}
      <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-xs">
        <h4 className="text-lg font-bold text-rose-700 flex items-center gap-2 mb-4">
          <span>👥</span> Manage Users
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

        {/* Bảng danh sách user */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="p-3.5">Email</th>
                <th className="p-3.5 w-[150px]">Role</th>
                <th className="p-3.5 w-[100px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isUsersLoading ? (
                <tr><td colSpan={3} className="text-center p-6 text-slate-400 italic">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={3} className="text-center p-6 text-slate-400 italic">No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 font-medium text-slate-700">{u.email}</td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                        ${u.role === USER_ROLE.ADMIN
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.email)}
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

      {/* SECTION 2: MANAGE LANGUAGES */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-xs">
        <h4 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mb-4">
          <span>🌍</span> Manage Languages
        </h4>

        {/* Form thêm ngôn ngữ */}
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

        {/* Bảng danh sách ngôn ngữ */}
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
