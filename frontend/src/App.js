import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import StakeholderPage from './pages/StakeholderPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectPage />} />
            <Route path="/stakeholder/:id" element={<StakeholderPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
