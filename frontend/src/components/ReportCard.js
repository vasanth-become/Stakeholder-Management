import React from 'react';

function ReportCard({ title, subtitle, children, icon }) {
  return (
    <div className="report-card">
      <div className="report-card-header">
        {icon && <span className="report-icon">{icon}</span>}
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="report-card-content">
        {children}
      </div>
    </div>
  );
}

export default ReportCard;
