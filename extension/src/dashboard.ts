import * as vscode from 'vscode';
import { ProgressManager } from './progressManager';

export class Dashboard {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private progressManager: ProgressManager;

  constructor(progressManager: ProgressManager) {
    this.progressManager = progressManager;
  }

  /**
   * Creates or reveals the dashboard inside an active panel.
   */
  public show(): void {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (Dashboard.currentPanel) {
      Dashboard.currentPanel.reveal(column);
      return;
    }

    Dashboard.currentPanel = vscode.window.createWebviewPanel(
      'focusRecoveryDashboard',
      'Focus Recovery Statistics',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    Dashboard.currentPanel.webview.html = this.render();

    Dashboard.currentPanel.onDidDispose(() => {
      Dashboard.currentPanel = undefined;
    });

    // Process event messages sent from the HTML button callbacks
    Dashboard.currentPanel.webview.onDidReceiveMessage(msg => {
      switch (msg.command) {
        case 'startSession':
          vscode.commands.executeCommand('focusRecovery.startSession');
          break;
        case 'changeDifficulty':
          vscode.commands.executeCommand('focusRecovery.changeDifficulty');
          break;
        case 'reset':
          vscode.commands.executeCommand('focusRecovery.resetProgress');
          break;
      }
    });
  }

  /**
   * Re-renders the contents of the dashboard to show fresh statistics.
   */
  public update(): void {
    if (Dashboard.currentPanel) {
      Dashboard.currentPanel.webview.html = this.render();
    }
  }

  /**
   * Emits HTML, CSS, and interactive JavaScript bundle for VS Code environment.
   */
  private render(): string {
    const progress = this.progressManager.getProgress();
    const activeLevel = this.progressManager.getCurrentLevelInfo();

    const recentRecords = progress.progressHistory.slice(-5).reverse();
    const recordsHTML = recentRecords.map(item => {
      const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const badgeClass = item.completed ? 'badge-success' : 'badge-failure';
      const label = item.completed ? 'Completed' : 'Cancelled';

      return `
        <div class="record-item">
          <div class="record-details">
            <span class="record-title">Level ${item.level} Session</span>
            <span class="record-subtitle">${formattedDate} • ${item.reps} reps • ${item.holdDuration}s Hold</span>
          </div>
          <span class="badge ${badgeClass}">${label}</span>
        </div>
      `;
    }).join('') || '<div class="no-records">No completed sessions yet. Start your first session below!</div>';

    // Calculate progression percentage toward next level (every 5 successful sessions per level)
    const completionsAtCurrent = progress.progressHistory.filter(
      h => h.level === progress.currentLevel && h.completed
    ).length;
    const progressPercent = Math.min((completionsAtCurrent / 5) * 100, 100);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          :root {
            --primary-color: var(--vscode-button-background, #0e639c);
            --primary-hover: var(--vscode-button-hoverBackground, #1177bb);
            --bg-color: var(--vscode-editor-background, #1e1e1e);
            --card-bg: var(--vscode-editorWidget-background, #252526);
            --border-color: var(--vscode-widget-border, #3c3c3c);
            --text-main: var(--vscode-editor-foreground, #cccccc);
            --text-heading: var(--vscode-editor-title-foreground, #ffffff);
            --text-muted: var(--vscode-descriptionForeground, #888888);
          }

          body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
            background-color: var(--bg-color);
            color: var(--text-main);
            padding: 24px;
            margin: 0;
          }

          .header-bar {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
            margin-bottom: 24px;
          }

          .header-title {
            font-size: 24px;
            font-weight: 500;
            color: var(--text-heading);
            margin: 0 0 6px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .header-desc {
            font-size: 13px;
            color: var(--text-muted);
            margin: 0;
          }

          .btn-container {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
          }

          button {
            background-color: var(--primary-color);
            color: var(--vscode-button-foreground, #ffffff);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.1s ease;
          }

          button:hover {
            background-color: var(--primary-hover);
          }

          button.secondary {
            background-color: var(--vscode-button-secondaryBackground, #3a3d41);
            color: var(--vscode-button-secondaryForeground, #ffffff);
          }

          button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground, #45494e);
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .stat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 16px;
            box-sizing: border-box;
          }

          .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            margin-bottom: 8px;
          }

          .stat-val {
            font-size: 26px;
            font-weight: 600;
            color: var(--text-heading);
          }

          .level-progress-bar-container {
            height: 6px;
            background-color: var(--border-color);
            border-radius: 3px;
            overflow: hidden;
            margin-top: 10px;
          }

          .level-progress-bar-fill {
            height: 100%;
            background-color: var(--primary-color);
            border-radius: 3px;
            width: ${progressPercent}%;
          }

          .progress-label {
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
          }

          .main-content {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 24px;
          }

          .panel-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-heading);
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--border-color);
          }

          .record-item {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .record-details {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .record-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-heading);
          }

          .record-subtitle {
            font-size: 11px;
            color: var(--text-muted);
          }

          .badge {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
            text-transform: uppercase;
          }

          .badge-success {
            background-color: #1e4620;
            color: #a3e635;
          }

          .badge-failure {
            background-color: #5a1e1e;
            color: #fca5a5;
          }

          .no-records {
            text-align: center;
            padding: 24px;
            color: var(--text-muted);
            border: 1px dashed var(--border-color);
            border-radius: 6px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <h1 class="header-title">❤️ Focus Recovery Dashboard</h1>
          <p class="header-desc">Simulated VS Code Interactive Webview. Maintain physical, visual, and cognitive readiness.</p>
        </div>

        <div class="btn-container">
          <button onclick="startSession()">Start Active Session</button>
          <button class="secondary" onclick="changeDifficulty()">Configure Difficulty</button>
          <button class="secondary" onclick="resetProgress()">Reset History</button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Current Goal Level</div>
            <div class="stat-val">${activeLevel.displayName}</div>
            <div class="level-progress-bar-container">
              <div class="level-progress-bar-fill"></div>
            </div>
            <div class="progress-label">
              <span>Next Level Progress</span>
              <span>${completionsAtCurrent}/5 Sessions</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Continuous Daily Streak</div>
            <div class="stat-val">${progress.currentStreak} Days</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Total Completed Cycles</div>
            <div class="stat-val">${progress.totalSessions} Sessions</div>
          </div>
        </div>

        <div class="main-content">
          <div>
            <div class="panel-title">Recent Activity Logs</div>
            ${recordsHTML}
          </div>
          <div>
            <div class="panel-title">Wellness Guidelines</div>
            <div style="background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; font-size: 12px; line-height: 1.5; color: var(--text-main);">
              <p style="margin-top:0;"><strong>1. Align Posture:</strong> Align spine and lower shoulders during Hold state.</p>
              <p><strong>2. Optical Reset:</strong> Look away from screen, focus on distant object (>20 feet) during Relax state.</p>
              <p style="margin-bottom:0;"><strong>3. Breathe:</strong> Slow, deep abdominal breaths to optimize oxygenation and recovery.</p>
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          function startSession() { vscode.postMessage({ command: 'startSession' }); }
          function changeDifficulty() { vscode.postMessage({ command: 'changeDifficulty' }); }
          function resetProgress() { vscode.postMessage({ command: 'reset' }); }
        </script>
      </body>
      </html>
    `;
  }
}
