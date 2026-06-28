import React, { useState, useEffect } from 'react';
import { getApiBase } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, KeyRound, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, User as UserIcon } from 'lucide-react';

interface DBUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function AdminPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'password'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states - Create User
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // Form states - Change Password
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [changePasswordVal, setChangePasswordVal] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = getApiBase();
      const token = localStorage.getItem('workshop_token');
      const res = await fetch(`${base}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to retrieve user directory');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const base = getApiBase();
      const token = localStorage.getItem('workshop_token');
      const res = await fetch(`${base}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create user');
      }

      setSuccess(`User "${newUsername}" successfully registered.`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (currentUser?.id === id) {
      setError('Operational error: Cannot delete active administrator session.');
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to completely de-authorize user "${name}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const base = getApiBase();
      const token = localStorage.getItem('workshop_token');
      const res = await fetch(`${base}/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete user');
      }

      setSuccess(`User "${name}" successfully deleted.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error deleting user');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Operational error: No user selected.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const base = getApiBase();
      const token = localStorage.getItem('workshop_token');
      const res = await fetch(`${base}/api/auth/users/${selectedUserId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: changePasswordVal
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to change password');
      }

      const affectedUser = users.find(u => u.id === Number(selectedUserId));
      setSuccess(`Password for user "${affectedUser?.username || 'Selected'}" successfully updated.`);
      setChangePasswordVal('');
      setSelectedUserId('');
    } catch (err: any) {
      setError(err.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#212330] pb-5">
        <div>
          <h1 className="text-2xl font-black font-mono tracking-wide text-slate-100 uppercase flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" /> Security Core Terminal
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase mt-1">
            Establish, delete, or re-route user auth privileges
          </p>
        </div>

        {/* Action Tabs Row */}
        <div className="flex bg-[#0f1016] border border-[#212330] p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('list'); setError(null); setSuccess(null); }}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list' ? 'bg-amber-500 text-[#0f1016]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Directory
          </button>
          <button
            onClick={() => { setActiveTab('create'); setError(null); setSuccess(null); }}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create' ? 'bg-amber-500 text-[#0f1016]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Account
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(null); setSuccess(null); }}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'password' ? 'bg-amber-500 text-[#0f1016]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Re-key Passcode
          </button>
        </div>
      </div>

      {/* Global Status Banner Notifications */}
      {error && (
        <div className="bg-red-950/20 border border-red-900/40 text-red-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-950/20 border border-green-900/40 text-green-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TAB 1: User Directory List */}
      {activeTab === 'list' && (
        <div className="bg-[#12131a] border border-[#1e202d] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-amber-500" /> Active System Users ({users.length})
          </h2>

          {loading && users.length === 0 ? (
            <div className="text-center py-12 font-mono text-slate-500 text-xs">
              <span className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin inline-block mb-2" />
              <p>QUERYING SECURITY REGISTERS...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 font-mono text-slate-500 text-xs">
              No authenticated personnel accounts found in the DB.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#212330]">
              <table className="w-full text-left font-mono text-xs text-slate-300">
                <thead className="bg-[#181a24] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#212330]">
                  <tr>
                    <th className="px-5 py-4">Database ID</th>
                    <th className="px-5 py-4">Username</th>
                    <th className="px-5 py-4">Clearance Role</th>
                    <th className="px-5 py-4">Date Registered</th>
                    <th className="px-5 py-4 text-right">Emergency Purge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e202d]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#161822] transition">
                      <td className="px-5 py-4 text-slate-500">#{u.id}</td>
                      <td className="px-5 py-4 font-bold text-slate-200 flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> {u.username}
                        {currentUser?.id === u.id && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-normal uppercase border border-amber-500/20">
                            Current Session
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          u.role === 'admin' 
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/10'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={currentUser?.id === u.id}
                          className="p-1.5 text-red-500 hover:text-red-400 bg-red-950/20 hover:bg-red-950/40 rounded border border-red-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center cursor-pointer"
                          title="Purge credentials from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Create Account Form */}
      {activeTab === 'create' && (
        <div className="bg-[#12131a] border border-[#1e202d] rounded-2xl p-6 shadow-xl max-w-lg mx-auto">
          <h2 className="text-base font-mono font-bold text-slate-200 uppercase mb-6 flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-amber-500" /> Add Personnel Credentials
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                New Username Account
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. jdoe"
                className="block w-full px-4 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                New Account Passcode
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                className="block w-full px-4 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Clearance Role Designation
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="block w-full px-4 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 transition duration-200"
              >
                <option value="user">User Clearance (Read Manuals & Manage CRM)</option>
                <option value="admin">Administrator Clearance (Full CRM + Credentials Control)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-[#0f1016] font-mono font-bold text-xs uppercase rounded-xl tracking-wider transition duration-200 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" /> Register User Profile
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Change Password Form */}
      {activeTab === 'password' && (
        <div className="bg-[#12131a] border border-[#1e202d] rounded-2xl p-6 shadow-xl max-w-lg mx-auto">
          <h2 className="text-base font-mono font-bold text-slate-200 uppercase mb-6 flex items-center gap-2">
            <KeyRound className="w-4.5 h-4.5 text-amber-500" /> Force Account Password Reset
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Target User Account
              </label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                className="block w-full px-4 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 transition duration-200"
              >
                <option value="">Select account...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                New Passcode Sequence
              </label>
              <input
                type="password"
                required
                value={changePasswordVal}
                onChange={(e) => setChangePasswordVal(e.target.value)}
                placeholder="Enter new password"
                className="block w-full px-4 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-[#0f1016] font-mono font-bold text-xs uppercase rounded-xl tracking-wider transition duration-200 shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" /> Force Passcode Update
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
