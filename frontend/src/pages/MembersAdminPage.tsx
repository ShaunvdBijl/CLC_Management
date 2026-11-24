import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Save } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isAdmin, useAuth } from '../lib/authContext';
import type { Campus, Department, UserProfile, UserRole } from '../types/api';

const ALL_ROLES: UserRole[] = [
  'Admin',
  'CampusHead',
  'Deputy',
  'EventsHead',
  'ClubsHead',
  'MarketingHead',
  'DepartmentMember',
  'Unassigned',
];
const CAMPUS_LEADER_ROLES: UserRole[] = ALL_ROLES.filter((r) => r !== 'Admin');
const DEPARTMENTS: Department[] = ['None', 'Events', 'Clubs', 'Marketing'];

interface RowDraft {
  role: UserRole;
  department: Department;
  campusId: string | null;
}

export function MembersAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const globalAdmin = isAdmin(user);
  const allowedRoles = globalAdmin ? ALL_ROLES : CAMPUS_LEADER_ROLES;

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', showUnassigned],
    queryFn: () => apiFetch<UserProfile[]>(`/api/v1/users?unassigned=${showUnassigned}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: RowDraft }) =>
      apiFetch<UserProfile>(`/api/v1/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      }),
    onMutate: ({ id }) => {
      setSavingId(id);
      setError('');
    },
    onSuccess: (_, { id }) => {
      setSavingId(null);
      setSavedId(id);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setTimeout(() => setSavedId((curr) => (curr === id ? null : curr)), 2500);
    },
    onError: (e: Error) => {
      setSavingId(null);
      setError(e.message);
    },
  });

  const getDraft = (u: UserProfile): RowDraft =>
    drafts[u.id] ?? { role: u.role, department: u.department, campusId: u.campusId };

  const setField = (u: UserProfile, patch: Partial<RowDraft>) => {
    const current = getDraft(u);
    setDrafts((prev) => ({
      ...prev,
      [u.id]: { ...current, ...patch },
    }));
  };

  const isDirty = (u: UserProfile): boolean => {
    const d = drafts[u.id];
    if (!d) return false;
    return d.role !== u.role || d.department !== u.department || d.campusId !== u.campusId;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#161616]">
            {globalAdmin ? 'Global Role & Campus Management (Admin)' : `${user?.campusName ?? 'Campus'} Role Management`}
          </h1>
          <p className="text-sm text-[#54595F]">
            {globalAdmin
              ? 'Promote or assign any account to any role, department, and campus, then click Save to commit to the database.'
              : `Scoped strictly to ${user?.campusName ?? 'your campus'}. Edit a student's role/department and click Save to persist changes.`}
          </p>
        </div>

        <button
          onClick={() => setShowUnassigned(!showUnassigned)}
          className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-[#161616] hover:border-[#DB3335]"
        >
          {showUnassigned ? 'Show All Members' : 'Filter Unassigned Accounts'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200/90 overflow-x-auto shadow-xs">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#161616] text-xs uppercase text-neutral-200">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campus</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(usersQuery.data ?? []).map((u) => {
              const draft = getDraft(u);
              const dirty = isDirty(u);
              const isSaving = savingId === u.id;
              const isSaved = savedId === u.id;
              const isProtectedAdmin = !globalAdmin && u.role === 'Admin';

              return (
                <tr key={u.id} className={dirty ? 'bg-amber-50/40' : 'hover:bg-neutral-50'}>
                  <td className="px-4 py-3 font-bold text-[#161616]">{u.fullName}</td>
                  <td className="px-4 py-3 text-[#54595F] text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    {globalAdmin ? (
                      <select
                        value={draft.campusId ?? ''}
                        onChange={(e) => setField(u, { campusId: e.target.value || null })}
                        className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {(campusesQuery.data ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-[#3A3A3A]">
                        {u.campusName ?? 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={isProtectedAdmin}
                      value={draft.role}
                      onChange={(e) => setField(u, { role: e.target.value as UserRole })}
                      className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white font-semibold disabled:opacity-50"
                    >
                      {(isProtectedAdmin ? ALL_ROLES : allowedRoles).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={isProtectedAdmin}
                      value={draft.department}
                      onChange={(e) => setField(u, { department: e.target.value as Department })}
                      className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isProtectedAdmin || isSaving || (!dirty && !isSaved)}
                      onClick={() => updateMutation.mutate({ id: u.id, draft })}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSaved
                          ? 'bg-emerald-600 text-white'
                          : dirty
                            ? 'bg-[#DB3335] hover:bg-[#B52325] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!(usersQuery.data ?? []).length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#54595F]">
                  No accounts found in your campus scope.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
