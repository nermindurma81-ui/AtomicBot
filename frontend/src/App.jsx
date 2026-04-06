import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/index.js';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AppLayout from './pages/AppLayout.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ConnectorsPage from './pages/ConnectorsPage.jsx';
import SkillsPage from './pages/SkillsPage.jsx';
import ModelsPage from './pages/ModelsPage.jsx';
import CronPage from './pages/CronPage.jsx';
import VPSPage from './pages/VPSPage.jsx';

function PrivateRoute({ children }) {
  const token = useStore(s => s.token);
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<ChatPage />} />
        <Route path="connectors" element={<ConnectorsPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="crons" element={<CronPage />} />
        <Route path="vps" element={<VPSPage />} />
      </Route>
    </Routes>
  );
}
