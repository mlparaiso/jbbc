import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import YearCalendarPage from './pages/YearCalendarPage';
import SchedulePage from './pages/SchedulePage';
import LineupDetailPage from './pages/LineupDetailPage';
import LineupFormPage from './pages/LineupFormPage';
import MembersPage from './pages/MembersPage';
import AdminLoginPage from './pages/AdminLoginPage';
import SongsPage from './pages/SongsPage';

// Wrapper: if ?month is in URL → MonthView, else → YearCalendar
function HomeRouter() {
  const [searchParams] = useSearchParams();
  return searchParams.get('month') ? <SchedulePage /> : <YearCalendarPage />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRouter />} />
            <Route path="lineup/new" element={<LineupFormPage />} />
            <Route path="lineup/:id" element={<LineupDetailPage />} />
            <Route path="lineup/:id/edit" element={<LineupFormPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="songs" element={<SongsPage />} />
            <Route path="admin" element={<AdminLoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
