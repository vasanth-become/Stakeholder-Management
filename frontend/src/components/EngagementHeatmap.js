import React, { useState, useEffect } from 'react';
import './EngagementHeatmap.css';

const EngagementHeatmap = ({ projectId = 1, weeks = 8 }) => {
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('influence'); // influence, power, risk
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    fetchHeatmapData();
  }, [projectId, weeks, sortBy]);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/visual-insights/heatmap?projectId=${projectId}&weeks=${weeks}&sortBy=${sortBy}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch heatmap data');
      }

      const data = await response.json();
      setHeatmapData(data);
    } catch (err) {
      console.error('Error fetching heatmap:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCellColor = (engagementStatus, interactionCount) => {
    if (interactionCount === 0) return 'grey';

    switch (engagementStatus) {
      case 'engaged':
      case 'champion':
        return 'green';
      case 'neutral':
      case 'declining':
        return 'yellow';
      case 'resistant':
      case 'at-risk':
        return 'orange';
      case 'blocker':
      case 'critical':
        return 'red';
      default:
        return 'grey';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const renderTooltip = (cell, stakeholder) => {
    if (!hoveredCell || hoveredCell !== `${stakeholder.id}-${cell.period.start}`) {
      return null;
    }

    return (
      <div className="heatmap-tooltip">
        <div className="tooltip-header">
          <strong>{stakeholder.name}</strong>
          <span className="tooltip-period">
            {formatDate(cell.period.start)} - {formatDate(cell.period.end)}
          </span>
        </div>
        <div className="tooltip-body">
          {cell.interactionCount > 0 ? (
            <>
              <div className="tooltip-row">
                <span className="tooltip-label">Interactions:</span>
                <span className="tooltip-value">{cell.interactionCount}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Last Contact:</span>
                <span className="tooltip-value">
                  {cell.lastInteraction
                    ? new Date(cell.lastInteraction).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Trend:</span>
                <span className={`tooltip-value trend-${cell.toneTrend}`}>
                  {cell.toneTrend === 'improving' && '↑ Improving'}
                  {cell.toneTrend === 'stable' && '→ Stable'}
                  {cell.toneTrend === 'declining' && '↓ Declining'}
                </span>
              </div>
              {cell.owner && (
                <div className="tooltip-row">
                  <span className="tooltip-label">Owner:</span>
                  <span className="tooltip-value">{cell.owner}</span>
                </div>
              )}
              {cell.notes && (
                <div className="tooltip-notes">{cell.notes}</div>
              )}
            </>
          ) : (
            <div className="tooltip-empty">No interactions this period</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="heatmap-container loading">
        <div className="heatmap-loading">
          <div className="loading-spinner"></div>
          <p>Loading engagement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="heatmap-container error">
        <div className="heatmap-error">
          <p>Unable to load engagement heatmap</p>
          <button onClick={fetchHeatmapData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!heatmapData || !heatmapData.stakeholders || heatmapData.stakeholders.length === 0) {
    return (
      <div className="heatmap-container empty">
        <div className="heatmap-empty">
          <p>No stakeholder data available yet</p>
          <span className="empty-hint">Add stakeholders to see engagement patterns</span>
        </div>
      </div>
    );
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div className="heatmap-title">
          <h3>Engagement Heatmap</h3>
          <p className="heatmap-subtitle">
            Track stakeholder engagement over the past {weeks} weeks
          </p>
        </div>
        <div className="heatmap-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="influence">Influence</option>
            <option value="power">Power</option>
            <option value="risk">Risk Level</option>
          </select>
        </div>
      </div>

      <div className="heatmap-scroll-wrapper">
        <div className="heatmap-grid">
          {/* Header row with time periods */}
          <div className="heatmap-row header-row">
            <div className="stakeholder-name-cell header-cell">
              Stakeholder
            </div>
            {heatmapData.periods.map((period, idx) => (
              <div key={idx} className="period-cell header-cell">
                <div className="period-label">
                  {formatDate(period.start)}
                </div>
              </div>
            ))}
          </div>

          {/* Data rows - one per stakeholder */}
          {heatmapData.stakeholders.map((stakeholder) => (
            <div key={stakeholder.id} className="heatmap-row data-row">
              <div className="stakeholder-name-cell">
                <div className="stakeholder-info">
                  <span className="stakeholder-name">{stakeholder.name}</span>
                  <span className="stakeholder-meta">
                    {stakeholder.influence && (
                      <span className="meta-badge influence">
                        Influence: {stakeholder.influence}
                      </span>
                    )}
                    {stakeholder.power && (
                      <span className="meta-badge power">
                        Power: {stakeholder.power}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {stakeholder.heatmapCells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`engagement-cell ${getCellColor(cell.engagementStatus, cell.interactionCount)}`}
                  onMouseEnter={() => setHoveredCell(`${stakeholder.id}-${cell.period.start}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {renderTooltip(cell, stakeholder)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <div className="legend-title">Engagement Status:</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color green"></div>
            <span>Engaged</span>
          </div>
          <div className="legend-item">
            <div className="legend-color yellow"></div>
            <span>Neutral</span>
          </div>
          <div className="legend-item">
            <div className="legend-color orange"></div>
            <span>At Risk</span>
          </div>
          <div className="legend-item">
            <div className="legend-color red"></div>
            <span>Critical</span>
          </div>
          <div className="legend-item">
            <div className="legend-color grey"></div>
            <span>No Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngagementHeatmap;
