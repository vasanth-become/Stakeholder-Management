import React, { useState, useEffect } from 'react';
import { projectAPI, stakeholderAPI, interactionAPI } from '../services/api';
import ReportCard from '../components/ReportCard';
import { BarChart, LineChart, DonutChart, StatGrid } from '../components/SimpleChart';

function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('30');
  const [projectFilter, setProjectFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [projectsData, stakeholdersData] = await Promise.all([
        projectAPI.getAll(),
        stakeholderAPI.getAll(),
      ]);

      setProjects(projectsData);
      setStakeholders(stakeholdersData);

      // Fetch all interactions
      const allInteractions = [];
      for (const stakeholder of stakeholdersData) {
        try {
          const stakeholderInteractions = await interactionAPI.getByStakeholder(stakeholder.id);
          allInteractions.push(...stakeholderInteractions);
        } catch (err) {
          // Skip if no interactions
        }
      }
      setInteractions(allInteractions);

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate metrics
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const highRiskStakeholders = stakeholders.filter(s => s.risk_score >= 12).length;
  const supportiveStakeholders = stakeholders.filter(s => s.engagement_status === 'supportive').length;
  const neutralStakeholders = stakeholders.filter(s => s.engagement_status === 'neutral').length;
  const resistantStakeholders = stakeholders.filter(s => s.engagement_status === 'resistant').length;

  // Calculate average risk score
  const avgRiskScore = stakeholders.length > 0
    ? (stakeholders.reduce((sum, s) => sum + s.risk_score, 0) / stakeholders.length).toFixed(1)
    : 0;

  // Project health percentage
  const projectsAtRisk = projects.filter(p => {
    const projectStakeholders = stakeholders.filter(s => s.project_id === p.id);
    const highRisk = projectStakeholders.filter(s => s.risk_score >= 12).length;
    return highRisk > 0;
  }).length;
  const riskPercentage = projects.length > 0
    ? Math.round((projectsAtRisk / projects.length) * 100)
    : 0;

  // Group interactions by type
  const interactionsByType = interactions.reduce((acc, interaction) => {
    const type = interaction.interaction_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Get top 5 high-risk stakeholders
  const topRiskStakeholders = [...stakeholders]
    .filter(s => s.risk_score >= 12)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  // Owner performance
  const ownerStats = stakeholders.reduce((acc, s) => {
    const owner = s.owner || 'Unassigned';
    if (!acc[owner]) {
      acc[owner] = {
        stakeholders: 0,
        interactions: 0,
        avgRisk: 0,
        totalRisk: 0,
      };
    }
    acc[owner].stakeholders += 1;
    acc[owner].totalRisk += s.risk_score;
    acc[owner].avgRisk = acc[owner].totalRisk / acc[owner].stakeholders;
    return acc;
  }, {});

  // Add interaction counts to owner stats
  interactions.forEach(interaction => {
    const stakeholder = stakeholders.find(s => s.id === interaction.stakeholder_id);
    if (stakeholder) {
      const owner = stakeholder.owner || 'Unassigned';
      if (ownerStats[owner]) {
        ownerStats[owner].interactions += 1;
      }
    }
  });

  function handleExportPDF() {
    alert('PDF export functionality coming soon!');
  }

  function handleExportCSV() {
    // Simple CSV export
    const csv = [
      ['Metric', 'Value'],
      ['Total Projects', projects.length],
      ['Active Projects', activeProjects],
      ['Completed Projects', completedProjects],
      ['Total Stakeholders', stakeholders.length],
      ['High Risk Stakeholders', highRiskStakeholders],
      ['Average Risk Score', avgRiskScore],
      ['Total Interactions', interactions.length],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stakeholder-radar-report.csv';
    a.click();
  }

  if (loading) return <div className="loading">Loading reports...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="page reports-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="text-muted">Insights and analytics for your stakeholder management</p>
        </div>
        <div className="report-actions">
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            📄 Export CSV
          </button>
          <button onClick={handleExportPDF} className="btn btn-secondary btn-sm">
            📑 Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="report-filters">
        <div className="filter-group">
          <label className="filter-label">Date Range:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="filter-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Project:</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Owner:</label>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Owners</option>
            {Object.keys(ownerStats).map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Summary Panel */}
      <div className="ai-summary-panel">
        <div className="ai-summary-header">
          <h3>✨ AI Summary & Recommendations</h3>
        </div>
        <div className="ai-summary-content">
          <div className="ai-insight">
            <h4>📊 Key Highlights</h4>
            <ul>
              <li>You have {activeProjects} active projects with {stakeholders.length} stakeholders</li>
              <li>{highRiskStakeholders} stakeholders are currently at high risk (≥12/20)</li>
              <li>Overall engagement: {supportiveStakeholders} supportive, {neutralStakeholders} neutral, {resistantStakeholders} resistant</li>
              <li>{interactions.length} interactions logged across all stakeholders</li>
            </ul>
          </div>

          {highRiskStakeholders > 0 && (
            <div className="ai-insight ai-insight-warning">
              <h4>⚠️ Risks to Watch</h4>
              <p>
                {highRiskStakeholders} stakeholder{highRiskStakeholders !== 1 ? 's show' : ' shows'} high risk.
                {topRiskStakeholders.length > 0 && ` ${topRiskStakeholders[0].name} has the highest risk score (${topRiskStakeholders[0].risk_score}/20).`}
                {' '}Consider scheduling check-in meetings with high-risk stakeholders to improve alignment.
              </p>
            </div>
          )}

          <div className="ai-insight ai-insight-action">
            <h4>💡 Suggested Next Steps</h4>
            <ul>
              {highRiskStakeholders > 0 && (
                <li>Review and reach out to {highRiskStakeholders} high-risk stakeholder{highRiskStakeholders !== 1 ? 's' : ''}</li>
              )}
              {resistantStakeholders > 0 && (
                <li>Develop engagement strategies for {resistantStakeholders} resistant stakeholder{resistantStakeholders !== 1 ? 's' : ''}</li>
              )}
              <li>Maintain regular communication with supportive stakeholders to keep momentum</li>
              {interactions.length < stakeholders.length && (
                <li>Log interactions for stakeholders without recent activity</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="reports-grid">
        {/* Project Health Report */}
        <ReportCard
          title="Project Health"
          subtitle="Overview of project status and health"
          icon="📈"
        >
          <StatGrid
            stats={[
              { label: 'Active Projects', value: activeProjects, color: '#4F46E5' },
              { label: 'Completed', value: completedProjects, color: '#10B981' },
              { label: 'At Risk', value: `${riskPercentage}%`, color: riskPercentage > 30 ? '#DC2626' : '#4F46E5' },
              { label: 'Avg Risk Score', value: avgRiskScore, color: avgRiskScore >= 12 ? '#DC2626' : '#10B981' },
            ]}
          />

          <div className="report-insight">
            {projectsAtRisk > 0 ? (
              <p className="insight-warning">
                ⚠️ {projectsAtRisk} out of {projects.length} project{projectsAtRisk !== 1 ? 's show' : ' shows'} high risk this period
              </p>
            ) : (
              <p className="insight-success">
                ✓ All projects are within acceptable risk levels
              </p>
            )}
          </div>
        </ReportCard>

        {/* Stakeholder Risk Report */}
        <ReportCard
          title="Stakeholder Risk Distribution"
          subtitle="Risk levels across all stakeholders"
          icon="⚠️"
        >
          <DonutChart
            data={[
              { label: 'Low Risk (0-6)', value: stakeholders.filter(s => s.risk_score < 7).length, color: '#10B981' },
              { label: 'Medium (7-11)', value: stakeholders.filter(s => s.risk_score >= 7 && s.risk_score < 12).length, color: '#F59E0B' },
              { label: 'High Risk (12-20)', value: highRiskStakeholders, color: '#DC2626' },
            ]}
            centerValue={stakeholders.length}
            centerLabel="Total"
          />

          {topRiskStakeholders.length > 0 && (
            <div className="top-risk-list">
              <h4>Top 5 Highest Risk</h4>
              {topRiskStakeholders.map(s => (
                <div key={s.id} className="risk-list-item">
                  <span className="risk-stakeholder-name">{s.name}</span>
                  <span className="risk-badge risk-high">{s.risk_score}/20</span>
                </div>
              ))}
            </div>
          )}
        </ReportCard>

        {/* Engagement Report */}
        <ReportCard
          title="Engagement Overview"
          subtitle="Stakeholder engagement distribution"
          icon="🤝"
        >
          <BarChart
            data={[
              { label: 'Supportive', value: supportiveStakeholders, color: '#10B981' },
              { label: 'Neutral', value: neutralStakeholders, color: '#6B7280' },
              { label: 'Resistant', value: resistantStakeholders, color: '#DC2626' },
            ]}
            height={200}
          />

          <div className="report-insight">
            <p>
              {supportiveStakeholders > resistantStakeholders ? (
                <span className="insight-success">
                  ✓ More stakeholders are supportive ({supportiveStakeholders}) than resistant ({resistantStakeholders})
                </span>
              ) : (
                <span className="insight-warning">
                  ⚠️ {resistantStakeholders} stakeholders show resistance — focus on engagement strategies
                </span>
              )}
            </p>
          </div>
        </ReportCard>

        {/* Activity Report */}
        <ReportCard
          title="Activity Report"
          subtitle="Interaction volume and types"
          icon="📅"
        >
          <StatGrid
            stats={[
              { label: 'Total Interactions', value: interactions.length, color: '#4F46E5' },
              { label: 'Meetings', value: interactionsByType['meeting'] || 0, color: '#10B981' },
              { label: 'Calls', value: interactionsByType['call'] || 0, color: '#F59E0B' },
              { label: 'Emails', value: interactionsByType['email'] || 0, color: '#6366F1' },
            ]}
          />

          {interactions.length === 0 && (
            <div className="empty-state-small">
              <p>No interactions logged yet — start tracking engagement 🙂</p>
            </div>
          )}
        </ReportCard>

        {/* Owner Performance */}
        <ReportCard
          title="Owner Performance"
          subtitle="Activity and risk metrics by owner"
          icon="👤"
        >
          <div className="owner-performance-table">
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Stakeholders</th>
                  <th>Interactions</th>
                  <th>Avg Risk</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ownerStats)
                  .sort((a, b) => b[1].stakeholders - a[1].stakeholders)
                  .map(([owner, stats]) => (
                    <tr key={owner}>
                      <td><strong>{owner}</strong></td>
                      <td>{stats.stakeholders}</td>
                      <td>{stats.interactions}</td>
                      <td>
                        <span className={`risk-badge risk-${stats.avgRisk >= 12 ? 'high' : stats.avgRisk >= 7 ? 'medium' : 'low'}`}>
                          {stats.avgRisk.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </ReportCard>
      </div>
    </div>
  );
}

export default ReportsPage;
