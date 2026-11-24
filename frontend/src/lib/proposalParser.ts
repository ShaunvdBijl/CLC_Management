import mammoth from 'mammoth';
import type { ProposalType } from '../types/api';

export interface ParsedProposalFields {
  proposalType?: ProposalType;
  title?: string;
  description?: string;
  proposedVenue?: string;
  proposedStartAt?: string;
  proposedEndAt?: string;
  clubWhatTheyDo?: string;
  clubMeetingSchedule?: string;
  clubMeetingLocation?: string;
  whatsAppMessage?: string;
  filledCount: number;
}

export async function extractDocumentText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }
  return file.text();
}

function toDateTimeLocal(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function parseProposalFile(file: File): Promise<ParsedProposalFields> {
  const text = await extractDocumentText(file);
  const result: ParsedProposalFields = { filledCount: 0 };

  const assign = <K extends keyof Omit<ParsedProposalFields, 'filledCount'>>(
    key: K,
    val?: ParsedProposalFields[K],
  ) => {
    if (val && typeof val === 'string' && val.trim()) {
      result[key] = val.trim() as ParsedProposalFields[K];
      result.filledCount += 1;
    }
  };

  // Try JSON first
  if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(text) as Record<string, string>;
      const typeVal = (obj.proposalType || obj.type || '').toLowerCase();
      if (typeVal.includes('event')) assign('proposalType', 'Event');
      else if (typeVal.includes('club')) assign('proposalType', 'Club');
      else if (typeVal.includes('market')) assign('proposalType', 'Marketing');

      assign('title', obj.title || obj.name);
      assign('description', obj.description || obj.summary);
      assign('proposedVenue', obj.venue || obj.proposedVenue || obj.location);
      assign('proposedStartAt', toDateTimeLocal(obj.startAt || obj.proposedStartAt || obj.start || ''));
      assign('proposedEndAt', toDateTimeLocal(obj.endAt || obj.proposedEndAt || obj.end || ''));
      assign('clubWhatTheyDo', obj.whatTheyDo || obj.clubWhatTheyDo || obj.activities);
      assign('clubMeetingSchedule', obj.meetingSchedule || obj.clubMeetingSchedule || obj.when);
      assign('clubMeetingLocation', obj.meetingLocation || obj.clubMeetingLocation || obj.where);
      assign('whatsAppMessage', obj.whatsAppMessage || obj.whatsapp);
      return result;
    } catch {
      // fall through to key-value parser
    }
  }

  // Parse structured text / markdown (Key: Value)
  const lines = text.split(/\r?\n/);
  let currentKey: string | null = null;
  const buckets: Record<string, string[]> = {};

  for (const rawLine of lines) {
    const clean = rawLine.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
    const match = clean.match(/^([A-Za-z0-9 _/-]{2,32}):\s*(.*)$/);
    if (match) {
      currentKey = match[1].trim().toLowerCase();
      buckets[currentKey] = match[2] ? [match[2].trim()] : [];
    } else if (currentKey && clean) {
      buckets[currentKey].push(clean);
    }
  }

  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (buckets[k]?.length) return buckets[k].join('\n');
    }
    return undefined;
  };

  const rawType = (getVal('type', 'proposal type', 'category') || '').toLowerCase();
  if (rawType.includes('event')) assign('proposalType', 'Event');
  else if (rawType.includes('club')) assign('proposalType', 'Club');
  else if (rawType.includes('market')) assign('proposalType', 'Marketing');

  assign('title', getVal('title', 'event title', 'club name', 'campaign title', 'name'));
  assign('description', getVal('description', 'details', 'overview', 'summary', 'campaign'));
  assign('proposedVenue', getVal('venue', 'proposed venue', 'event venue'));
  assign('proposedStartAt', toDateTimeLocal(getVal('start', 'start date', 'start time', 'proposed start') || ''));
  assign('proposedEndAt', toDateTimeLocal(getVal('end', 'end date', 'end time', 'proposed end') || ''));
  assign('clubWhatTheyDo', getVal('what they do', 'what we do', 'activities', 'club activities'));
  assign('clubMeetingSchedule', getVal('when they meet', 'meeting schedule', 'meetings', 'schedule'));
  assign('clubMeetingLocation', getVal('where they meet', 'meeting location', 'room', 'location'));
  assign('whatsAppMessage', getVal('whatsapp message', 'whatsapp', 'whatsapp promo', 'promo message'));

  // Fallback: if plain text with no headers, use first line as title and rest as description
  if (result.filledCount === 0 && text.trim()) {
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    if (nonEmpty[0]) assign('title', nonEmpty[0].slice(0, 120));
    if (nonEmpty.length > 1) assign('description', nonEmpty.slice(1).join('\n'));
  }

  return result;
}

export function downloadProposalTemplate(kind: 'CampusEvent' | 'ClubRegistration' | 'ClubEvent' | 'Marketing'): void {
  const templates: Record<typeof kind, { filename: string; content: string }> = {
    CampusEvent: {
      filename: 'campus-event-proposal-template.txt',
      content: `Type: Event
Title: Campus Quiz Night
Venue: Main Auditorium
Start: 2026-12-04T18:00
End: 2026-12-04T21:00
Description: Campus-wide trivia evening hosted by the Events department with prizes for top student teams.
`,
    },
    ClubRegistration: {
      filename: 'club-registration-proposal-template.txt',
      content: `Type: Club
Title: Robotics & Automation Club
Description: Student engineering club focused on building autonomous robots and competing in tech expos.
What They Do: Weekly Arduino/ROS workshops, hardware prototyping, and annual robotics showcases.
When They Meet: Wednesdays 16:00 - 17:30
Where They Meet: Robotics Lab B2
`,
    },
    ClubEvent: {
      filename: 'club-event-proposal-template.txt',
      content: `Type: Event
Title: Robotics Club Project Showcase
Venue: Innovation Hall
Start: 2026-12-06T13:00
End: 2026-12-06T16:00
Description: Live demonstration of student-built robots and embedded systems projects open to the campus.
`,
    },
    Marketing: {
      filename: 'marketing-campaign-proposal-template.txt',
      content: `Type: Marketing
Title: Quiz Night Campus Promotion
Description: Digital campus screen posters, hallway prints, and student group WhatsApp countdown blasts.
WhatsApp Message: Hey BC students! Ready to test your knowledge? Join us for Campus Quiz Night this Friday at 18:00 in the Main Auditorium. Form a team of 4 and win awesome prizes!
`,
    },
  };

  const tpl = templates[kind];
  const blob = new Blob([tpl.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tpl.filename;
  a.click();
  URL.revokeObjectURL(url);
}
