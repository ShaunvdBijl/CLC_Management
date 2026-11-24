import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { EventsPage } from './pages/EventsPage';
import { EventsKanbanPage } from './pages/EventsKanbanPage';
import { EventsGanttPage } from './pages/EventsGanttPage';
import { ClubsAndMeetingsPage } from './pages/ClubsAndMeetingsPage';
import { TasksPage } from './pages/TasksPage';
import { CalendarsPage } from './pages/CalendarsPage';
import { CrossCampusPage } from './pages/CrossCampusPage';
import { HistoryPage } from './pages/HistoryPage';
import { MembersAdminPage } from './pages/MembersAdminPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/board" element={<EventsKanbanPage />} />
        <Route path="/events/timeline" element={<EventsGanttPage />} />
        <Route path="/clubs" element={<ClubsAndMeetingsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarsPage />} />
        <Route path="/cross-campus" element={<CrossCampusPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/admin/members" element={<MembersAdminPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
