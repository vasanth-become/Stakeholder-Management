import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          Stakeholder Radar
        </Link>
        <div className="nav-links">
          <Link
            to="/"
            className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
