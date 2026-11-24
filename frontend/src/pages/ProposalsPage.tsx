import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Download, FileCheck2, MessageSquare } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isAdmin, isLeadership, useAuth } from '../lib/authContext';
import { FileDropZone } from '../components/FileDropZone';
import { downloadProposalTemplate, parseProposalFile } from '../lib/proposalParser';
import type { CampusEvent, Club, Proposal, ProposalType, ReviewDecision, UserProfile } from '../types/api';
import { StatusPill } from './DashboardPage';

type ProposalFlowMode = 'CampusEvent' | 'ClubRegistration' | 'ClubEvent' | 'Marketing';

export function ProposalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [autofillNotice, setAutofillNotice] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});

  const admin = isAdmin(user);
  const leader = isLeadership(user);

  const availableModes: { key: ProposalFlowMode; label: string; type: ProposalType }[] = [];
  if (admin || user?.department === 'Events') {
    availableModes.push({ key: 'CampusEvent', label: 'Campus-Wide Event (Events Dept)', type: 'Event' });
  }
  if (admin || user?.department === 'Clubs') {
    availableModes.push({ key: 'ClubRegistration', label: 'Register New Club (Clubs Dept)', type: 'Club' });
    availableModes.push({ key: 'ClubEvent', label: 'Club Event Showcase (Clubs Dept)', type: 'Event' });
  }
  if (admin || user?.department === 'Marketing') {
    availableModes.push({ key: 'Marketing', label: 'Marketing Campaign & WhatsApp Promo', type: 'Marketing' });
  }

  const [flowMode, setFlowMode] = useState<ProposalFlowMode>(availableModes[0]?.key ?? 'CampusEvent');
  const activeProposalType: ProposalType =
    flowMode === 'ClubRegistration' ? 'Club' : flowMode === 'Marketing' ? 'Marketing' : 'Event';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposedVenue, setProposedVenue] = useState('');
  const [proposedStartAt, setProposedStartAt] = useState('');
  const [proposedEndAt, setProposedEndAt] = useState('');
  const [proposedClubHeadId, setProposedClubHeadId] = useState('');
  const [clubWhatTheyDo, setClubWhatTheyDo] = useState('');
  const [clubMeetingSchedule, setClubMeetingSchedule] = useState('');
  const [clubMeetingLocation, setClubMeetingLocation] = useState('');
  const [targetEventId, setTargetEventId] = useState('');
  const [targetClubId, setTargetClubId] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  const canSubmit = availableModes.length > 0;

  const proposalsQuery = useQuery({
    queryKey: ['proposals', statusFilter],
    queryFn: () => apiFetch<Proposal[]>(`/api/v1/proposals${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const usersQuery = useQuery({
    queryKey: ['campus-users'],
    queryFn: () => apiFetch<UserProfile[]>('/api/v1/users'),
    enabled: canSubmit || leader,
  });

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiFetch<CampusEvent[]>('/api/v1/events'),
    enabled: canSubmit,
  });

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => apiFetch<Club[]>('/api/v1/clubs'),
    enabled: canSubmit,
  });

  const handleProposalFile = async (file: File) => {
    try {
      const parsed = await parseProposalFile(file);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.proposedVenue) setProposedVenue(parsed.proposedVenue);
      if (parsed.proposedStartAt) setProposedStartAt(parsed.proposedStartAt);
      if (parsed.proposedEndAt) setProposedEndAt(parsed.proposedEndAt);
      if (parsed.clubWhatTheyDo) setClubWhatTheyDo(parsed.clubWhatTheyDo);
      if (parsed.clubMeetingSchedule) setClubMeetingSchedule(parsed.clubMeetingSchedule);
      if (parsed.clubMeetingLocation) setClubMeetingLocation(parsed.clubMeetingLocation);
      if (parsed.whatsAppMessage) setWhatsAppMessage(parsed.whatsAppMessage);

      setAutofillNotice(
        parsed.filledCount > 0
          ? `Autofilled ${parsed.filledCount} field${parsed.filledCount === 1 ? '' : 's'} from "${file.name}".`
          : `Read "${file.name}", but no matching fields were detected. Try downloading a sample template.`,
      );
      setError('');
    } catch (e) {
      setError(`Could not parse "${file.name}": ${(e as Error).message}`);
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Proposal>('/api/v1/proposals', {
        method: 'POST',
        body: JSON.stringify({
          proposalType: activeProposalType,
          title,
          description,
          proposedStartAt: proposedStartAt ? new Date(proposedStartAt).toISOString() : null,
          proposedEndAt: proposedEndAt ? new Date(proposedEndAt).toISOString() : null,
          proposedVenue: proposedVenue || null,
          proposedClubHeadId: flowMode === 'ClubRegistration' ? proposedClubHeadId || null : null,
          targetEventId: flowMode === 'Marketing' ? targetEventId || null : null,
          targetClubId: flowMode === 'ClubEvent' || flowMode === 'Marketing' ? targetClubId || null : null,
          clubWhatTheyDo: flowMode === 'ClubRegistration' ? clubWhatTheyDo || null : null,
          clubMeetingSchedule: flowMode === 'ClubRegistration' ? clubMeetingSchedule || null : null,
          clubMeetingLocation: flowMode === 'ClubRegistration' ? clubMeetingLocation || null : null,
          whatsAppMessage: flowMode === 'Marketing' ? whatsAppMessage || null : null,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setProposedVenue('');
      setProposedStartAt('');
      setProposedEndAt('');
      setClubWhatTheyDo('');
      setClubMeetingSchedule('');
      setClubMeetingLocation('');
      setWhatsAppMessage('');
      setAutofillNotice('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: ReviewDecision; comment?: string }) =>
      apiFetch<Proposal>(`/api/v1/proposals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: comment || null }),
      }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const resubmitMutation = useMutation({
    mutationFn: (p: Proposal) =>
      apiFetch<Proposal>(`/api/v1/proposals/${p.id}/resubmit`, {
        method: 'PUT',
        body: JSON.stringify({
          title: p.title,
          description: `${p.description}\n[Updated and resubmitted]`,
          proposedStartAt: p.proposedStartAt,
          proposedEndAt: p.proposedEndAt,
          proposedVenue: p.proposedVenue,
          proposedClubHeadId: p.proposedClubHeadId,
          targetEventId: p.targetEventId,
          targetClubId: p.targetClubId,
          clubWhatTheyDo: p.clubWhatTheyDo,
          clubMeetingSchedule: p.clubMeetingSchedule,
          clubMeetingLocation: p.clubMeetingLocation,
          whatsAppMessage: p.whatsAppMessage,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
    onError: (e: Error) => setError(e.message),
  });

  const copyWhatsApp = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#161616]">Proposal Approval Pipeline</h1>
          <p className="text-sm text-[#54595F]">
            Drop a proposal file to autofill fields, submit for Campus Head / Deputy review, and track approvals.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-neutral-300 rounded-xl px-3 py-2 bg-white font-medium"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="ChangesRequested">Changes Requested</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

      {canSubmit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="bg-white rounded-2xl border border-neutral-200/90 p-6 space-y-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold text-[#161616] text-base">Submit New Proposal</h2>
            <div className="flex flex-wrap items-center gap-2">
              {availableModes.length > 1 && (
                <select
                  value={flowMode}
                  onChange={(e) => setFlowMode(e.target.value as ProposalFlowMode)}
                  className="text-xs font-bold border border-neutral-300 rounded-lg px-3 py-2 bg-[#FAFAFA]"
                >
                  {availableModes.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => downloadProposalTemplate(flowMode)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-[#161616] hover:border-[#DB3335]"
              >
                <Download className="w-3.5 h-3.5" />
                Sample Template
              </button>
            </div>
          </div>

          {/* Proposal File Drop Zone for Autofill */}
          <FileDropZone
            accept=".txt,.md,.json,.csv"
            variant="document"
            title="Drop a proposal document here to autofill fields"
            subtitle="Supports .txt, .md, .json, or .csv — or click to browse (Title, Venue, Start, End, Description, Club Details, WhatsApp Message)"
            onFileSelected={handleProposalFile}
          />

          {autofillNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {autofillNotice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder={
                flowMode === 'CampusEvent'
                  ? 'Campus Event Title (e.g., Campus Quiz Night)'
                  : flowMode === 'ClubRegistration'
                    ? 'Club Name (e.g., Robotics & Automation Club)'
                    : flowMode === 'ClubEvent'
                      ? 'Club Event Title (e.g., Robotics Showcase)'
                      : 'Marketing Campaign Title'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />

            {(flowMode === 'CampusEvent' || flowMode === 'ClubEvent') && (
              <input
                required
                placeholder="Proposed Venue (e.g., Main Auditorium)"
                value={proposedVenue}
                onChange={(e) => setProposedVenue(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
              />
            )}

            {flowMode === 'ClubEvent' && (
              <select
                required
                value={targetClubId}
                onChange={(e) => setTargetClubId(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm md:col-span-2 bg-white"
              >
                <option value="">Select Hosting Club...</option>
                {(clubsQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {(flowMode === 'CampusEvent' || flowMode === 'ClubEvent') && (
              <>
                <input
                  required
                  type="datetime-local"
                  value={proposedStartAt}
                  onChange={(e) => setProposedStartAt(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={proposedEndAt}
                  onChange={(e) => setProposedEndAt(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </>
            )}

            {flowMode === 'ClubRegistration' && (
              <>
                <select
                  required
                  value={proposedClubHeadId}
                  onChange={(e) => setProposedClubHeadId(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                >
                  <option value="">Select Designated Club Head...</option>
                  {(usersQuery.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
                <input
                  required
                  placeholder="When They Meet (e.g., Wednesdays 16:00 - 17:30)"
                  value={clubMeetingSchedule}
                  onChange={(e) => setClubMeetingSchedule(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
                <input
                  required
                  placeholder="Where They Meet (e.g., Robotics Lab B2)"
                  value={clubMeetingLocation}
                  onChange={(e) => setClubMeetingLocation(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
                <input
                  required
                  placeholder="What They Do (e.g., Weekly coding workshops & robotics builds)"
                  value={clubWhatTheyDo}
                  onChange={(e) => setClubWhatTheyDo(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm md:col-span-2"
                />
              </>
            )}

            {flowMode === 'Marketing' && (
              <>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                >
                  <option value="">Link to Campus Event (optional if Club chosen)</option>
                  {(eventsQuery.data ?? []).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({new Date(ev.startAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <select
                  value={targetClubId}
                  onChange={(e) => setTargetClubId(e.target.value)}
                  className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                >
                  <option value="">Link to Club (optional if Event chosen)</option>
                  {(clubsQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <textarea
            required
            rows={2}
            placeholder="Proposal description and objectives..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
          />

          {flowMode === 'Marketing' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#161616] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Promotional Message (for student & campus groups)
              </label>
              <textarea
                rows={3}
                placeholder="Draft the ready-to-share WhatsApp announcement message for campus groups..."
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                className="w-full border border-emerald-300 bg-emerald-50/30 rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325] disabled:opacity-50"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {(proposalsQuery.data ?? []).map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#161616] text-[#E9C00E]">
                    {p.proposalType === 'Event' && p.targetClubName
                      ? `CLUB EVENT · ${p.targetClubName}`
                      : p.proposalType}
                  </span>
                  <h3 className="font-bold text-[#161616]">{p.title}</h3>
                </div>
                <p className="text-xs text-[#54595F] mt-1">
                  Submitted by {p.submittedByName} · {new Date(p.createdAt).toLocaleString()}
                  {p.proposedVenue ? ` · Venue: ${p.proposedVenue}` : ''}
                  {p.proposedClubHeadName ? ` · Club Head: ${p.proposedClubHeadName}` : ''}
                  {p.targetEventTitle ? ` · Event: ${p.targetEventTitle}` : ''}
                </p>
              </div>
              <StatusPill status={p.status} />
            </div>

            <p className="text-sm text-[#3A3A3A] whitespace-pre-line">{p.description}</p>

            {p.proposalType === 'Club' && (p.clubWhatTheyDo || p.clubMeetingSchedule || p.clubMeetingLocation) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#F8F8F6] rounded-xl p-3 text-xs">
                <div>
                  <p className="font-bold text-[#161616]">What They Do</p>
                  <p className="text-[#54595F]">{p.clubWhatTheyDo || '—'}</p>
                </div>
                <div>
                  <p className="font-bold text-[#161616]">When They Meet</p>
                  <p className="text-[#54595F]">{p.clubMeetingSchedule || '—'}</p>
                </div>
                <div>
                  <p className="font-bold text-[#161616]">Where They Meet</p>
                  <p className="text-[#54595F]">{p.clubMeetingLocation || '—'}</p>
                </div>
              </div>
            )}

            {p.whatsAppMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Group Promo Message
                  </span>
                  <button
                    type="button"
                    onClick={() => copyWhatsApp(p.id, p.whatsAppMessage!)}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {copiedId === p.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === p.id ? 'Copied!' : 'Copy for WhatsApp'}
                  </button>
                </div>
                <p className="text-xs text-emerald-950 whitespace-pre-line">{p.whatsAppMessage}</p>
              </div>
            )}

            {p.reviews.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-[#54595F]">Review History</p>
                {p.reviews.map((r) => (
                  <p key={r.id} className="text-xs text-[#3A3A3A]">
                    <span className="font-bold">{r.reviewerName}</span> ({r.decision}):{' '}
                    {r.comment || 'No comment'}
                  </p>
                ))}
              </div>
            )}

            {leader && p.status === 'Pending' && (
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <input
                  placeholder="Feedback / reason (mandatory for Changes Requested or Rejected)"
                  value={reviewComment[p.id] ?? ''}
                  onChange={(e) => setReviewComment({ ...reviewComment, [p.id]: e.target.value })}
                  className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'Approved', comment: reviewComment[p.id] })
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'ChangesRequested', comment: reviewComment[p.id] })
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'Rejected', comment: reviewComment[p.id] })
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-[#DB3335] text-white text-xs font-bold hover:bg-[#B52325]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {canSubmit && p.status === 'ChangesRequested' && (
              <div className="pt-2 border-t border-neutral-100">
                <button
                  onClick={() => resubmitMutation.mutate(p)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#161616] text-white text-xs font-bold hover:bg-[#2B2B2B]"
                >
                  Update & Resubmit Proposal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
