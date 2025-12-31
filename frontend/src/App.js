import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectPage from './pages/ProjectPage';
import StakeholderPage from './pages/StakeholderPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/project/:id" element={<ProjectDetailPage />} />
            <Route path="/stakeholder/:id" element={<StakeholderPage />} />
            <Route path="/stakeholders" element={<Dashboard />} />
            <Route path="/reports" element={<Dashboard />} />
            <Route path="/settings" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
