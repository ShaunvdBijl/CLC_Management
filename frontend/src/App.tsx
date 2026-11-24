import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/authContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { CampusActivityPage } from './pages/CampusActivityPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { ProposalApprovalsPage } from './pages/ProposalApprovalsPage';
import { EventsPage } from './pages/EventsPage';
import { EventsKanbanPage } from './pages/EventsKanbanPage';
import { EventsGanttPage } from './pages/EventsGanttPage';
import { ClubsPage } from './pages/ClubsPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { TasksPage } from './pages/TasksPage';
import { CalendarsPage } from './pages/CalendarsPage';
import { CrossCampusPage } from './pages/CrossCampusPage';
import { HistoryPage } from './pages/HistoryPage';
import { MembersAdminPage } from './pages/MembersAdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] text-sm font-semibold text-[#54595F]">
        Loading Belgium Campus iTversity CLC Portal...
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Belgium Campus Showcase & Auth */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/campus/:code" element={<CampusActivityPage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Authenticated CLC Portal */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/proposals/approvals" element={<ProposalApprovalsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/board" element={<EventsKanbanPage />} />
        <Route path="/events/timeline" element={<EventsGanttPage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarsPage />} />
        <Route path="/cross-campus" element={<CrossCampusPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/admin/members" element={<MembersAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
