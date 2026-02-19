import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import LandingPage from './pages/LandingPage';
import YearCalendarPage from './pages/YearCalendarPage';
import SchedulePage from './pages/SchedulePage';
import LineupDetailPage from './pages/LineupDetailPage';
import LineupFormPage from './pages/LineupFormPage';
import MembersPage from './pages/MembersPage';
import SongsPage from './pages/SongsPage';
import TeamSetupPage from './pages/TeamSetupPage';

function HomeRouter() {
  const [searchParams] = useSearchParams();
  return searchParams.get('month') ? <SchedulePage /> : <YearCalendarPage />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public: login/landing */}
          <Route path="/login" element={<LandingPage />} />

          {/* Needs login but NOT a team yet (team setup) */}
          <Route path="/team-setup" element={<Layout />}>
            <Route index element={<TeamSetupPage />} />
          </Route>

          {/* Needs login + team */}
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeRouter />} />
              <Route path="lineup/new" element={<LineupFormPage />} />
              <Route path="lineup/:id" element={<LineupDetailPage />} />
              <Route path="lineup/:id/edit" element={<LineupFormPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="songs" element={<SongsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
