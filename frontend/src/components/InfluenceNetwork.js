import React, { useState, useEffect, useRef } from 'react';
import './InfluenceNetwork.css';

const InfluenceNetwork = ({ projectId = 1 }) => {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // all, decision-drivers, blockers, champions
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    fetchNetworkData();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [projectId]);

  useEffect(() => {
    if (networkData) {
      initializeSimulation();
    }
  }, [networkData, filterMode]);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/visual-insights/influence-network?projectId=${projectId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch network data');
      }

      const data = await response.json();
      setNetworkData(data);
    } catch (err) {
      console.error('Error fetching network:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeSimulation = () => {
    if (!networkData ||
        !networkData.nodes ||
        !networkData.edges ||
        !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Filter nodes based on mode
    let filteredNodes = networkData.nodes;
    if (filterMode === 'decision-drivers') {
      filteredNodes = networkData.nodes.filter(n =>
        n.category === 'Decision Driver' || n.influence >= 8
      );
    } else if (filterMode === 'blockers') {
      filteredNodes = networkData.nodes.filter(n =>
        n.category === 'Blocker'
      );
    } else if (filterMode === 'champions') {
      filteredNodes = networkData.nodes.filter(n =>
        n.category === 'Champion'
      );
    }

    // Filter edges to only include filtered nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = networkData.edges.filter(e =>
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    // Initialize node positions in a circular layout
    const nodes = filteredNodes.map((node, index) => {
      const angle = (index / filteredNodes.length) * 2 * Math.PI;
      const radius = Math.min(rect.width, rect.height) * 0.3;

      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    });

    nodesRef.current = nodes;

    // Start animation
    const animate = () => {
      updateSimulation(nodes, filteredEdges, rect.width, rect.height);
      drawNetwork(nodes, filteredEdges);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const updateSimulation = (nodes, edges, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const damping = 0.8;
    const springStrength = 0.01;
    const repulsionStrength = 2000;

    // Apply forces
    nodes.forEach(node => {
      // Reset forces
      let fx = 0;
      let fy = 0;

      // Centering force
      fx += (centerX - node.x) * 0.001;
      fy += (centerY - node.y) * 0.001;

      // Repulsion between nodes
      nodes.forEach(other => {
        if (node.id !== other.id) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (distance * distance);
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      });

      // Spring force for edges
      edges.forEach(edge => {
        if (edge.source === node.id) {
          const target = nodes.find(n => n.id === edge.target);
          if (target) {
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (distance - 100) * springStrength * edge.strength;
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        }
        if (edge.target === node.id) {
          const source = nodes.find(n => n.id === edge.source);
          if (source) {
            const dx = source.x - node.x;
            const dy = source.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (distance - 100) * springStrength * edge.strength;
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        }
      });

      // Update velocity and position
      node.vx = (node.vx + fx) * damping;
      node.vy = (node.vy + fy) * damping;
      node.x += node.vx;
      node.y += node.vy;

      // Keep nodes in bounds
      const padding = 40;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    });
  };

  const drawNetwork = (nodes, edges) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);

      if (source && target) {
        ctx.strokeStyle = `rgba(156, 163, 175, ${edge.strength})`;
        ctx.lineWidth = edge.strength * 3;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowSize = 8;
        const distance = Math.sqrt(
          Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)
        );
        const arrowX = source.x + (target.x - source.x) * (distance - target.size - 5) / distance;
        const arrowY = source.y + (target.y - source.y) * (distance - target.size - 5) / distance;

        ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;

      // Node shadow for hover/select
      if (isHovered || isSelected) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
      }

      // Draw node circle
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
      ctx.fill();

      // Node border
      ctx.strokeStyle = isHovered || isSelected ? '#111827' : '#ffffff';
      ctx.lineWidth = isHovered || isSelected ? 3 : 2;
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw node label
      ctx.fillStyle = '#111827';
      ctx.font = `${isHovered || isSelected ? '600' : '500'} 12px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const label = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name;
      ctx.fillText(label, node.x, node.y + node.size + 8);
    });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on a node
    const clickedNode = nodesRef.current.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= node.size;
    });

    setSelectedNode(clickedNode ? clickedNode.id : null);
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hoveredNode = nodesRef.current.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= node.size;
    });

    setHoveredNode(hoveredNode ? hoveredNode.id : null);
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  };

  if (loading) {
    return (
      <div className="network-container loading">
        <div className="network-loading">
          <div className="loading-spinner"></div>
          <p>Loading influence network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="network-container error">
        <div className="network-error">
          <p>Unable to load influence network</p>
          <button onClick={fetchNetworkData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div className="network-container empty">
        <div className="network-empty">
          <p>No network data available yet</p>
          <span className="empty-hint">Add stakeholders to visualize influence relationships</span>
        </div>
      </div>
    );
  }

  const selectedNodeData = selectedNode
    ? networkData.nodes.find(n => n.id === selectedNode)
    : null;

  return (
    <div className="network-container">
      <div className="network-header">
        <div className="network-title">
          <h3>Influence Network</h3>
          <p className="network-subtitle">
            Visualize stakeholder relationships and influence patterns
          </p>
        </div>
        <div className="network-controls">
          <label htmlFor="filter-select">Filter:</label>
          <select
            id="filter-select"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stakeholders</option>
            <option value="decision-drivers">Decision Drivers</option>
            <option value="blockers">Blockers</option>
            <option value="champions">Champions</option>
          </select>
        </div>
      </div>

      <div className="network-visualization">
        <canvas
          ref={canvasRef}
          className="network-canvas"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
        ></canvas>
      </div>

      {selectedNodeData && (
        <div className="network-details">
          <div className="details-header">
            <h4>{selectedNodeData.name}</h4>
            <button
              className="close-button"
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
          </div>
          <div className="details-body">
            <div className="detail-row">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{selectedNodeData.category}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Influence:</span>
              <span className="detail-value">{selectedNodeData.influence}/10</span>
            </div>
            {selectedNodeData.description && (
              <div className="detail-row">
                <span className="detail-label">Role:</span>
                <span className="detail-value">{selectedNodeData.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="network-legend">
        <div className="legend-title">Categories:</div>
        <div className="legend-items">
          {(networkData.categories || []).map((category, idx) => (
            <div key={idx} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: category.color }}
              ></div>
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfluenceNetwork;
