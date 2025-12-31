import React from 'react';

// Simple Bar Chart
export function BarChart({ data, height = 200 }) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const hasValues = maxValue > 0;

  return (
    <div className="simple-chart">
      <div className="chart-bars" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = hasValues ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="chart-bar-container">
              <div className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{
                    height: `${barHeight}%`,
                    background: item.color || '#4F46E5',
                    minHeight: item.value > 0 ? '50px' : '0'
                  }}
                >
                  {item.value > 0 && (
                    <span className="chart-bar-value">{item.value}</span>
                  )}
                </div>
              </div>
              <span className="chart-bar-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple Line Chart (trend)
export function LineChart({ data, height = 200 }) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="simple-chart" style={{ height: `${height}px` }}>
      <div className="line-chart">
        <div className="line-chart-grid">
          {[0, 25, 50, 75, 100].map((percent) => (
            <div key={percent} className="grid-line" style={{ bottom: `${percent}%` }} />
          ))}
        </div>
        <svg className="line-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - ((d.value - minValue) / range) * 100;
              return `${x},${y}`;
            }).join(' ')}
          />
        </svg>
        <div className="line-chart-labels">
          {data.map((item, index) => (
            <span key={index} className="chart-label">{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple Donut Chart
export function DonutChart({ data, centerLabel, centerValue }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90; // Start from top

  return (
    <div className="donut-chart-container">
      <svg className="donut-chart" viewBox="0 0 100 100">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;

          // Calculate path for donut segment
          const radius = 40;
          const innerRadius = 28;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (currentAngle * Math.PI) / 180;

          const x1 = 50 + radius * Math.cos(startRad);
          const y1 = 50 + radius * Math.sin(startRad);
          const x2 = 50 + radius * Math.cos(endRad);
          const y2 = 50 + radius * Math.sin(endRad);
          const x3 = 50 + innerRadius * Math.cos(endRad);
          const y3 = 50 + innerRadius * Math.sin(endRad);
          const x4 = 50 + innerRadius * Math.cos(startRad);
          const y4 = 50 + innerRadius * Math.sin(startRad);

          const largeArc = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
            'Z'
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={item.color || '#4F46E5'}
              opacity={0.9}
            />
          );
        })}
        <text x="50" y="45" textAnchor="middle" className="donut-center-value">
          {centerValue}
        </text>
        <text x="50" y="55" textAnchor="middle" className="donut-center-label">
          {centerLabel}
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((item, index) => (
          <div key={index} className="legend-item">
            <span className="legend-color" style={{ background: item.color || '#4F46E5' }} />
            <span className="legend-label">{item.label}</span>
            <span className="legend-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat Grid (for KPIs)
export function StatGrid({ stats }) {
  return (
    <div className="stat-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-item">
          <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
          {stat.change && (
            <div className={`stat-change ${stat.change > 0 ? 'positive' : 'negative'}`}>
              {stat.change > 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
