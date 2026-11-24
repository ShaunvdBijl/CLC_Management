import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Save,
  Trash2,
  Video,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import { FileDropZone } from '../components/FileDropZone';
import { extractDocumentText } from '../lib/proposalParser';
import type { Meeting } from '../types/api';

interface ArtifactDraft {
  teamsJoinUrl: string;
  recordingUrl: string;
  transcriptUrl: string;
  transcriptText: string;
}

export function MeetingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [location, setLocation] = useState('Microsoft Teams');
  const [teamsJoinUrl, setTeamsJoinUrl] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [artifactDrafts, setArtifactDrafts] = useState<Record<string, ArtifactDraft>>({});

  const leader = isLeadership(user);

  const meetingsQuery = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiFetch<Meeting[]>('/api/v1/meetings'),
  });

  const createMeetingMutation = useMutation({
    mutationFn: () =>
      apiFetch<Meeting>('/api/v1/meetings', {
        method: 'POST',
        body: JSON.stringify({
          title,
          agenda,
          location,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          teamsJoinUrl: teamsJoinUrl || null,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setAgenda('');
      setLocation('Microsoft Teams');
      setTeamsJoinUrl('');
      setStartAt('');
      setEndAt('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['campus-calendar'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveArtifactsMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: ArtifactDraft }) =>
      apiFetch<Meeting>(`/api/v1/meetings/${id}/artifacts`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      }),
    onSuccess: () => {
      setEditingId(null);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/meetings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['campus-calendar'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const openArtifactEditor = (m: Meeting) => {
    if (editingId === m.id) {
      setEditingId(null);
      return;
    }
    setArtifactDrafts((prev) => ({
      ...prev,
      [m.id]: {
        teamsJoinUrl: m.teamsJoinUrl ?? '',
        recordingUrl: m.recordingUrl ?? '',
        transcriptUrl: m.transcriptUrl ?? '',
        transcriptText: m.transcriptText ?? '',
      },
    }));
    setEditingId(m.id);
  };

  const handleTranscriptFile = async (meetingId: string, file: File) => {
    try {
      const text = await extractDocumentText(file);
      setArtifactDrafts((prev) => ({
        ...prev,
        [meetingId]: {
          ...(prev[meetingId] ?? { teamsJoinUrl: '', recordingUrl: '', transcriptUrl: '', transcriptText: '' }),
          transcriptText: text.trim(),
        },
      }));
    } catch (e) {
      setError(`Could not read transcript file: ${(e as Error).message}`);
    }
  };

  const meetings = meetingsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#161616]">Campus CLC Meetings &amp; MS Teams</h1>
        <p className="text-sm text-[#54595F]">
          Schedule campus council meetings held on Microsoft Teams and archive post-meeting recordings, transcripts, and dates.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

      {leader && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMeetingMutation.mutate();
          }}
          className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-4 shadow-xs"
        >
          <h2 className="font-extrabold text-[#161616] text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#DB3335]" />
            Schedule Campus CLC Meeting
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              placeholder="Meeting Title (e.g., Weekly CLC Council Sync)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              required
              placeholder="Location (e.g., Microsoft Teams / Boardroom 2B)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              type="url"
              placeholder="Microsoft Teams Join Link (https://teams.microsoft.com/l/meetup-join/...)"
              value={teamsJoinUrl}
              onChange={(e) => setTeamsJoinUrl(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm md:col-span-2"
            />
            <input
              required
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              required
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>
          <textarea
            required
            rows={2}
            placeholder="Meeting agenda & discussion points..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={createMeetingMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325]"
          >
            {createMeetingMutation.isPending ? 'Scheduling...' : 'Schedule CLC Meeting'}
          </button>
        </form>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.map((m) => {
          const isEditing = editingId === m.id;
          const draft = artifactDrafts[m.id];
          const isTranscriptOpen = expandedTranscriptId === m.id;

          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#E9C00E]/30 text-[#161616]">
                      CLC MEETING
                    </span>
                    {m.summarySyncedAt && (
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        RECORDED
                      </span>
                    )}
                    <h3 className="font-extrabold text-[#161616]">{m.title}</h3>
                  </div>
                  <p className="text-sm text-[#3A3A3A]">{m.agenda}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-[#54595F] pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                      {m.location}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#0170B9]" />
                      {new Date(m.startAt).toLocaleString()} –{' '}
                      {new Date(m.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>Host: {m.createdByName}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {m.teamsJoinUrl && (
                    <a
                      href={m.teamsJoinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#464EB8] hover:bg-[#383F9A] text-white text-xs font-bold transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join in MS Teams
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {m.recordingUrl && (
                    <a
                      href={m.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161616] hover:bg-[#2B2B2B] text-[#E9C00E] text-xs font-bold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Watch Recording
                    </a>
                  )}
                  {leader && (
                    <>
                      <button
                        type="button"
                        onClick={() => openArtifactEditor(m)}
                        className="px-3 py-2 rounded-xl border border-neutral-300 hover:border-[#DB3335] text-xs font-bold text-[#161616]"
                      >
                        {isEditing ? 'Close' : 'Post Recording / Transcript'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMeetingMutation.mutate(m.id)}
                        className="p-2 rounded-lg text-neutral-400 hover:text-[#DB3335] hover:bg-red-50"
                        title="Cancel Meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Transcript Viewer */}
              {(m.transcriptText || m.transcriptUrl) && (
                <div className="pt-2 border-t border-neutral-100 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedTranscriptId(isTranscriptOpen ? null : m.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0170B9] hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {isTranscriptOpen ? 'Hide Meeting Transcript' : 'View Meeting Transcript'}
                      {isTranscriptOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {m.transcriptUrl && (
                      <a
                        href={m.transcriptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#54595F] hover:text-[#161616] inline-flex items-center gap-1"
                      >
                        Open Transcript File <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {isTranscriptOpen && m.transcriptText && (
                    <pre className="bg-[#F8F8F6] border border-neutral-200 rounded-xl p-4 text-xs text-[#161616] whitespace-pre-wrap font-sans max-h-72 overflow-y-auto leading-relaxed">
                      {m.transcriptText}
                    </pre>
                  )}
                </div>
              )}

              {/* Leadership Recording & Transcript Editor */}
              {isEditing && draft && (
                <div className="pt-3 border-t border-neutral-200 space-y-3 bg-[#FAFAFA] -mx-5 -mb-5 p-5 rounded-b-2xl">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#161616]">
                    Post MS Teams Recording &amp; Transcript
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="url"
                      placeholder="MS Teams Join URL"
                      value={draft.teamsJoinUrl}
                      onChange={(e) =>
                        setArtifactDrafts((prev) => ({
                          ...prev,
                          [m.id]: { ...draft, teamsJoinUrl: e.target.value },
                        }))
                      }
                      className="border border-neutral-300 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                    <input
                      type="url"
                      placeholder="Recording Link (MS Stream / SharePoint URL)"
                      value={draft.recordingUrl}
                      onChange={(e) =>
                        setArtifactDrafts((prev) => ({
                          ...prev,
                          [m.id]: { ...draft, recordingUrl: e.target.value },
                        }))
                      }
                      className="border border-neutral-300 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>
                  <input
                    type="url"
                    placeholder="Transcript SharePoint Link (optional)"
                    value={draft.transcriptUrl}
                    onChange={(e) =>
                      setArtifactDrafts((prev) => ({
                        ...prev,
                        [m.id]: { ...draft, transcriptUrl: e.target.value },
                      }))
                    }
                    className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-xs bg-white"
                  />
                  <FileDropZone
                    accept=".docx,.vtt,.txt"
                    variant="document"
                    title="Drop MS Teams transcript file (.docx, .vtt, or .txt)"
                    subtitle="Extracts the full transcript text automatically into the box below"
                    onFileSelected={(file) => handleTranscriptFile(m.id, file)}
                  />
                  <textarea
                    rows={4}
                    placeholder="Meeting transcript text..."
                    value={draft.transcriptText}
                    onChange={(e) =>
                      setArtifactDrafts((prev) => ({
                        ...prev,
                        [m.id]: { ...draft, transcriptText: e.target.value },
                      }))
                    }
                    className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-xs bg-white"
                  />
                  <button
                    type="button"
                    disabled={saveArtifactsMutation.isPending}
                    onClick={() => saveArtifactsMutation.mutate({ id: m.id, draft })}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DB3335] hover:bg-[#B52325] text-white text-xs font-bold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Recording &amp; Transcript
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {meetings.length === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-8 text-center text-sm text-[#54595F]">
            No campus CLC meetings scheduled yet.
          </div>
        )}
      </div>

      {/* Power Automate / MS Teams Auto-Sync Integration Note */}
      {leader && (
        <div className="bg-[#161616] text-neutral-300 rounded-2xl p-5 text-xs space-y-1.5">
          <p className="font-extrabold text-[#E9C00E] uppercase tracking-wider">
            Automated MS Teams Recording &amp; Transcript Sync (Power Automate Webhook)
          </p>
          <p>
            Configure a Microsoft Power Automate flow triggered when a Teams recording/transcript is saved in SharePoint to <code className="text-white font-mono">POST /api/v1/meetings/teams-webhook</code> with header <code className="text-white font-mono">X-Teams-Webhook-Secret</code> — the meeting date, recording link, and transcript will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}
