import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import LoginGuard from './components/LoginGuard';
import LandingPage from './pages/LandingPage';
import YearCalendarPage from './pages/YearCalendarPage';
import SchedulePage from './pages/SchedulePage';
import LineupDetailPage from './pages/LineupDetailPage';
import LineupFormPage from './pages/LineupFormPage';
import MembersPage from './pages/MembersPage';
import SongsPage from './pages/SongsPage';
import TeamSetupPage from './pages/TeamSetupPage';
import PublicSchedulePage from './pages/PublicSchedulePage';
import PublicLineupDetailPage from './pages/PublicLineupDetailPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public: login/landing */}
          <Route path="/login" element={<LandingPage />} />

          {/* Needs login but NOT a team yet */}
          <Route element={<LoginGuard />}>
            <Route path="/team-setup" element={<Layout />}>
              <Route index element={<TeamSetupPage />} />
            </Route>
          </Route>

          {/* Needs login + team */}
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Layout />}>
              {/* Year Calendar is the default home; SchedulePage when ?month= is present */}
              <Route index element={<YearCalendarPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="lineup/new" element={<LineupFormPage />} />
              <Route path="lineup/:id" element={<LineupDetailPage />} />
              <Route path="lineup/:id/edit" element={<LineupFormPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="songs" element={<SongsPage />} />
            </Route>
          </Route>

          {/* Public team schedule (no login required) */}
          <Route path="/team/:teamId" element={<PublicSchedulePage />} />
          <Route path="/team/:teamId/lineup/:lineupId" element={<PublicLineupDetailPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
