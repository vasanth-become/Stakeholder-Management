import React, { useState, useEffect, useRef } from 'react';
import './RiskTimeline.css';

const RiskTimeline = ({ projectId = 1, stakeholderId = null, days = 30 }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStakeholder, setSelectedStakeholder] = useState(stakeholderId);
  const [showProjectTrend, setShowProjectTrend] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId, selectedStakeholder, days]);

  useEffect(() => {
    if (timelineData && canvasRef.current) {
      drawTimeline();
    }
  }, [timelineData, showProjectTrend]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        projectId: projectId.toString(),
        days: days.toString()
      });

      if (selectedStakeholder) {
        params.append('stakeholderId', selectedStakeholder.toString());
      }

      const response = await fetch(`/api/visual-insights/risk-timeline?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch timeline data');
      }

      const data = await response.json();
      setTimelineData(data);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const drawTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set actual size in memory (scaled for DPR)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale all drawing operations
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Chart dimensions
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    if (!timelineData || !timelineData.timelines || timelineData.timelines.length === 0) {
      return;
    }

    // Get data to display
    const primaryTimeline = timelineData.timelines[0];
    const dataPoints = primaryTimeline.dataPoints;
    const maxRisk = timelineData.maxRisk || 20;

    // Helper functions
    const getX = (index) => padding.left + (index / (dataPoints.length - 1)) * chartWidth;
    const getY = (riskScore) => padding.top + chartHeight - (riskScore / maxRisk) * chartHeight;

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      const value = maxRisk - (i / 4) * maxRisk;
      ctx.fillText(value.toFixed(0), padding.left - 10, y);
    }

    // Draw project trend if enabled
    if (showProjectTrend && timelineData.projectTrend) {
      const projectData = timelineData.projectTrend.dataPoints;

      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();

      projectData.forEach((point, index) => {
        const x = getX(index);
        const y = getY(point.riskScore);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw area fill
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.beginPath();
    ctx.moveTo(getX(0), padding.top + chartHeight);

    dataPoints.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.riskScore);
      ctx.lineTo(x, y);
    });

    ctx.lineTo(getX(dataPoints.length - 1), padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw risk line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();

    dataPoints.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.riskScore);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    dataPoints.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.riskScore);

      // Outer circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Inner circle with color based on risk level
      const riskLevel = getRiskLevel(point.riskScore);
      ctx.fillStyle = getRiskColor(riskLevel);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw event markers
    if (primaryTimeline.events && primaryTimeline.events.length > 0) {
      primaryTimeline.events.forEach(event => {
        const eventIndex = dataPoints.findIndex(p => p.date === event.date);
        if (eventIndex !== -1) {
          const x = getX(eventIndex);
          const y = padding.top + chartHeight + 10;

          // Event marker icon
          ctx.fillStyle = event.type === 'meeting' ? '#3b82f6' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    // Draw X-axis labels (dates)
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelInterval = Math.ceil(dataPoints.length / 6);
    dataPoints.forEach((point, index) => {
      if (index % labelInterval === 0 || index === dataPoints.length - 1) {
        const x = getX(index);
        const y = padding.top + chartHeight + 25;
        const date = new Date(point.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, y);
      }
    });
  };

  const getRiskLevel = (score) => {
    if (score >= 15) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#fbbf24';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRiskLevelText = (score) => {
    const level = getRiskLevel(score);
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  if (loading) {
    return (
      <div className="timeline-container loading">
        <div className="timeline-loading">
          <div className="loading-spinner"></div>
          <p>Loading risk timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-container error">
        <div className="timeline-error">
          <p>Unable to load risk timeline</p>
          <button onClick={fetchTimelineData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!timelineData ||
      !timelineData.timelines ||
      timelineData.timelines.length === 0 ||
      !timelineData.timelines[0].dataPoints ||
      timelineData.timelines[0].dataPoints.length === 0) {
    return (
      <div className="timeline-container empty">
        <div className="timeline-empty">
          <p>No risk data available yet</p>
          <span className="empty-hint">Risk scores will appear as you add interactions</span>
        </div>
      </div>
    );
  }

  const primaryTimeline = timelineData.timelines[0];
  const latestPoint = primaryTimeline.dataPoints[primaryTimeline.dataPoints.length - 1];
  const firstPoint = primaryTimeline.dataPoints[0];
  const riskChange = latestPoint.riskScore - firstPoint.riskScore;

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-title">
          <h3>Risk History Timeline</h3>
          <p className="timeline-subtitle">
            Track risk evolution over the past {days} days
          </p>
        </div>
        <div className="timeline-controls">
          {timelineData.projectTrend && (
            <label className="trend-toggle">
              <input
                type="checkbox"
                checked={showProjectTrend}
                onChange={(e) => setShowProjectTrend(e.target.checked)}
              />
              <span>Show project trend</span>
            </label>
          )}
        </div>
      </div>

      <div className="timeline-stats">
        <div className="stat-card">
          <div className="stat-label">Current Risk</div>
          <div className={`stat-value risk-${getRiskLevel(latestPoint.riskScore)}`}>
            {latestPoint.riskScore.toFixed(1)}
          </div>
          <div className="stat-sublabel">{getRiskLevelText(latestPoint.riskScore)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trend ({days}d)</div>
          <div className={`stat-value ${riskChange > 0 ? 'increasing' : riskChange < 0 ? 'decreasing' : 'stable'}`}>
            {riskChange > 0 ? '↑' : riskChange < 0 ? '↓' : '→'} {Math.abs(riskChange).toFixed(1)}
          </div>
          <div className="stat-sublabel">
            {riskChange > 0 ? 'Increasing' : riskChange < 0 ? 'Decreasing' : 'Stable'}
          </div>
        </div>
        {primaryTimeline.events && primaryTimeline.events.length > 0 && (
          <div className="stat-card">
            <div className="stat-label">Key Events</div>
            <div className="stat-value">{primaryTimeline.events.length}</div>
            <div className="stat-sublabel">Tracked</div>
          </div>
        )}
      </div>

      <div className="timeline-chart">
        <canvas ref={canvasRef} className="timeline-canvas"></canvas>
      </div>

      {primaryTimeline.events && primaryTimeline.events.length > 0 && (
        <div className="timeline-events">
          <div className="events-title">Key Events</div>
          <div className="events-list">
            {primaryTimeline.events.map((event, idx) => (
              <div key={idx} className="event-item">
                <div className={`event-marker ${event.type}`}></div>
                <div className="event-info">
                  <div className="event-name">{event.name}</div>
                  <div className="event-date">{formatDate(event.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {primaryTimeline.annotations && primaryTimeline.annotations.length > 0 && (
        <div className="timeline-annotations">
          {primaryTimeline.annotations.map((annotation, idx) => (
            <div key={idx} className="annotation-item">
              <div className="annotation-icon">ℹ️</div>
              <div className="annotation-text">{annotation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskTimeline;
