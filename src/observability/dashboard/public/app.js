/**
 * CAM Dashboard Client
 *
 * Handles WebSocket connection and real-time UI updates.
 */

(function () {
  'use strict';

  // DOM Elements
  const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    uptime: document.getElementById('uptime'),
    clients: document.getElementById('clients'),
    model: document.getElementById('model'),
    contextProgress: document.getElementById('contextProgress'),
    contextUsage: document.getElementById('contextUsage'),
    learningScore: document.getElementById('learningScore'),
    activeAgents: document.getElementById('activeAgents'),
    pendingTasks: document.getElementById('pendingTasks'),
    agentsList: document.getElementById('agentsList'),
    tasksList: document.getElementById('tasksList'),
    eventsList: document.getElementById('eventsList'),
    clearEvents: document.getElementById('clearEvents'),
    lastUpdate: document.getElementById('lastUpdate'),
  };

  // State
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const reconnectDelay = 2000;
  let events = [];
  const maxEvents = 100;

  /**
   * Connect to WebSocket server.
   */
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = function () {
      reconnectAttempts = 0;
      setConnectionStatus('connected', 'Connected');
      console.log('WebSocket connected');
    };

    ws.onmessage = function (event) {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onclose = function () {
      setConnectionStatus('disconnected', 'Disconnected');
      scheduleReconnect();
    };

    ws.onerror = function (error) {
      console.error('WebSocket error:', error);
      setConnectionStatus('error', 'Error');
    };
  }

  /**
   * Schedule reconnection attempt.
   */
  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionStatus('error', 'Connection failed');
      return;
    }

    reconnectAttempts++;
    setConnectionStatus('reconnecting', `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`);

    setTimeout(connect, reconnectDelay * Math.min(reconnectAttempts, 5));
  }

  /**
   * Set connection status display.
   */
  function setConnectionStatus(status, text) {
    elements.connectionStatus.textContent = text;
    elements.connectionStatus.className = 'connection-status ' + status;
  }

  /**
   * Handle incoming WebSocket message.
   */
  function handleMessage(message) {
    const { type, data, timestamp } = message;

    switch (type) {
      case 'status':
        updateStatus(data);
        break;
      case 'agents':
        updateAgents(data);
        break;
      case 'tasks':
        updateTask(data);
        break;
      case 'event':
        addEvent(data);
        break;
      case 'pong':
        // Keep-alive response
        break;
      default:
        console.log('Unknown message type:', type);
    }

    updateLastUpdate(timestamp);
  }

  /**
   * Update status display.
   */
  function updateStatus(status) {
    if (status.model) {
      elements.model.textContent = status.model;
    }

    if (typeof status.contextUsage === 'number') {
      const percentage = Math.round(status.contextUsage);
      elements.contextUsage.textContent = percentage + '%';
      elements.contextProgress.style.width = percentage + '%';

      // Color coding
      elements.contextProgress.className = 'progress-fill';
      if (percentage >= 90) {
        elements.contextProgress.classList.add('critical');
      } else if (percentage >= 75) {
        elements.contextProgress.classList.add('warning');
      }
    }

    if (typeof status.learningScore === 'number') {
      elements.learningScore.textContent = status.learningScore.toFixed(1);
    }

    if (typeof status.activeAgents === 'number') {
      elements.activeAgents.textContent = status.activeAgents;
      elements.activeAgents.className = 'status-value' + (status.activeAgents > 0 ? ' active' : '');
    }

    if (typeof status.pendingTasks === 'number') {
      elements.pendingTasks.textContent = status.pendingTasks;
      elements.pendingTasks.className = 'status-value' + (status.pendingTasks > 0 ? ' active' : '');
    }
  }

  /**
   * Update agents list display.
   */
  function updateAgents(agents) {
    if (!agents || agents.length === 0) {
      elements.agentsList.innerHTML = '<div class="empty-state">No active agents</div>';
      return;
    }

    elements.agentsList.innerHTML = agents.map(function (agent) {
      const statusClass = 'agent-status-' + agent.status;
      const duration = agent.startedAt ? formatDuration(new Date() - new Date(agent.startedAt)) : '--';

      return `
        <div class="agent-item ${statusClass}">
          <div class="agent-header">
            <span class="agent-name">${escapeHtml(agent.name)}</span>
            <span class="agent-status">${agent.status}</span>
          </div>
          <div class="agent-details">
            ${agent.task ? `<span class="agent-task">${escapeHtml(agent.task)}</span>` : ''}
            <span class="agent-duration">${duration}</span>
          </div>
          ${agent.traits && agent.traits.length > 0 ? `
            <div class="agent-traits">
              ${agent.traits.map(function (t) { return `<span class="trait">${escapeHtml(t)}</span>`; }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Update or add a task.
   */
  function updateTask(task) {
    // For now, just refresh tasks via API
    fetchTasks();
  }

  /**
   * Fetch tasks from API.
   */
  function fetchTasks() {
    fetch('/api/tasks')
      .then(function (res) { return res.json(); })
      .then(function (response) {
        if (response.success) {
          renderTasks(response.data);
        }
      })
      .catch(function (e) {
        console.error('Failed to fetch tasks:', e);
      });
  }

  /**
   * Render tasks list.
   */
  function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      elements.tasksList.innerHTML = '<div class="empty-state">No tasks</div>';
      return;
    }

    elements.tasksList.innerHTML = tasks.map(function (task) {
      const statusClass = 'task-status-' + task.status;
      const progressBar = typeof task.progress === 'number'
        ? `<div class="task-progress"><div class="task-progress-fill" style="width: ${task.progress}%"></div></div>`
        : '';

      return `
        <div class="task-item ${statusClass}">
          <div class="task-header">
            <span class="task-name">${escapeHtml(task.name)}</span>
            <span class="task-status">${task.status}</span>
          </div>
          ${progressBar}
          ${task.error ? `<div class="task-error">${escapeHtml(task.error)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Add event to the log.
   */
  function addEvent(event) {
    events.unshift(event);
    if (events.length > maxEvents) {
      events = events.slice(0, maxEvents);
    }
    renderEvents();
  }

  /**
   * Render events list.
   */
  function renderEvents() {
    if (events.length === 0) {
      elements.eventsList.innerHTML = '<div class="empty-state">No events</div>';
      return;
    }

    elements.eventsList.innerHTML = events.map(function (event) {
      const time = formatTime(new Date(event.timestamp));
      const severity = getEventSeverity(event);
      const details = formatEventDetails(event);

      return `
        <div class="event-item event-${severity}">
          <span class="event-time">${time}</span>
          <span class="event-type">${escapeHtml(event.type)}</span>
          <span class="event-details">${details}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Get event severity based on type.
   */
  function getEventSeverity(event) {
    if (event.error || event.type.includes('error')) return 'error';
    if (event.type.includes('warning')) return 'warning';
    if (event.success === false) return 'warning';
    return 'info';
  }

  /**
   * Format event details for display.
   */
  function formatEventDetails(event) {
    const data = event.data || {};
    const parts = [];

    if (data.agentId) parts.push('Agent: ' + data.agentId.slice(0, 8));
    if (data.agentName) parts.push(data.agentName);
    if (data.skillName) parts.push('Skill: ' + data.skillName);
    if (data.tier) parts.push('Tier: ' + data.tier);
    if (data.operation) parts.push(data.operation);

    if (event.duration) {
      parts.push(event.duration + 'ms');
    }

    return escapeHtml(parts.join(' | ') || '--');
  }

  /**
   * Clear events list.
   */
  function clearEvents() {
    events = [];
    renderEvents();
  }

  /**
   * Update last update timestamp.
   */
  function updateLastUpdate(timestamp) {
    if (timestamp) {
      const time = formatTime(new Date(timestamp));
      elements.lastUpdate.textContent = 'Last update: ' + time;
    }
  }

  /**
   * Format time for display.
   */
  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  /**
   * Format duration in milliseconds.
   */
  function formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return Math.floor(ms / 1000) + 's';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm';
    return Math.floor(ms / 3600000) + 'h';
  }

  /**
   * Format uptime in seconds.
   */
  function formatUptime(seconds) {
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours + 'h ' + mins + 'm';
  }

  /**
   * Escape HTML to prevent XSS.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Fetch initial state from API.
   */
  function fetchInitialState() {
    fetch('/api/state')
      .then(function (res) { return res.json(); })
      .then(function (response) {
        if (response.success) {
          const state = response.data;
          updateStatus(state.status);
          updateAgents(state.agents);
          renderTasks(state.tasks);
          events = state.events || [];
          renderEvents();
          elements.clients.textContent = state.connectionCount;
          elements.uptime.textContent = formatUptime(state.uptime);
        }
      })
      .catch(function (e) {
        console.error('Failed to fetch initial state:', e);
      });
  }

  /**
   * Poll for uptime updates.
   */
  function startUptimePolling() {
    setInterval(function () {
      fetch('/api/health')
        .then(function (res) { return res.json(); })
        .then(function (response) {
          if (response.success) {
            elements.uptime.textContent = formatUptime(response.data.uptime);
            elements.clients.textContent = response.data.connections;
          }
        })
        .catch(function () {
          // Ignore errors
        });
    }, 5000);
  }

  /**
   * Initialize dashboard.
   */
  function init() {
    // Connect WebSocket
    connect();

    // Fetch initial state
    fetchInitialState();

    // Start uptime polling
    startUptimePolling();

    // Event listeners
    elements.clearEvents.addEventListener('click', clearEvents);

    // Send periodic pings
    setInterval(function () {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 25000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
