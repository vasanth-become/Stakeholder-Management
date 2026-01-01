import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { OnboardingProvider } from './context/OnboardingContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import AddStakeholderPage from './pages/AddStakeholderPage';
import StakeholdersListPage from './pages/StakeholdersListPage';
import StakeholderProfilePage from './pages/StakeholderProfilePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import OAuthCallback from './pages/OAuthCallback';
import Onboarding from './pages/Onboarding';
import './App.css';

function AppLayout() {
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  return (
    <div className="app">
      {!isOnboarding && <Sidebar />}
      <main className={isOnboarding ? '' : 'main-content'}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
          <Route path="/project/:id/add-stakeholder" element={<AddStakeholderPage />} />
          <Route path="/stakeholders" element={<StakeholdersListPage />} />
          <Route path="/stakeholder/:id" element={<StakeholderProfilePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/callback" element={<OAuthCallback />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <OnboardingProvider>
      <Router>
        <AppLayout />
      </Router>
    </OnboardingProvider>
  );
}

export default App;
