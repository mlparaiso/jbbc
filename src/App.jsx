import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import SchedulePage from './pages/SchedulePage';
import LineupDetailPage from './pages/LineupDetailPage';
import LineupFormPage from './pages/LineupFormPage';
import MembersPage from './pages/MembersPage';
import AdminLoginPage from './pages/AdminLoginPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<SchedulePage />} />
            <Route path="lineup/new" element={<LineupFormPage />} />
            <Route path="lineup/:id" element={<LineupDetailPage />} />
            <Route path="lineup/:id/edit" element={<LineupFormPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="admin" element={<AdminLoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
