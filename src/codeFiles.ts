export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  content: string;
  description: string;
}

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: "package.json",
    path: "package.json",
    language: "json",
    description: "The VS Code extension manifest file defining configuration properties, commands, and activation events.",
    content: `{
  "name": "focus-recovery",
  "displayName": "Focus Recovery",
  "description": "A local wellness, focus, and posture recovery assistant for VS Code.",
  "version": "1.0.0",
  "publisher": "wellness-labs",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "focusRecovery.startSession",
        "title": "Focus Recovery: Start Session",
        "category": "Focus Recovery"
      },
      {
        "command": "focusRecovery.showStatistics",
        "title": "Focus Recovery: Show Statistics",
        "category": "Focus Recovery"
      },
      {
        "command": "focusRecovery.changeDifficulty",
        "title": "Focus Recovery: Change Difficulty",
        "category": "Focus Recovery"
      },
      {
        "command": "focusRecovery.resetProgress",
        "title": "Focus Recovery: Reset Progress",
        "category": "Focus Recovery"
      },
      {
        "command": "focusRecovery.exportProgress",
        "title": "Focus Recovery: Export Progress",
        "category": "Focus Recovery"
      },
      {
        "command": "focusRecovery.importProgress",
        "title": "Focus Recovery: Import Progress",
        "category": "Focus Recovery"
      }
    ],
    "configuration": {
      "title": "Focus Recovery Configuration",
      "properties": {
        "focusRecovery.morningReminder": {
          "type": "string",
          "default": "08:00",
          "description": "Morning focus and wellness session reminder (HH:MM)."
        },
        "focusRecovery.eveningReminder": {
          "type": "string",
          "default": "19:00",
          "description": "Evening focus recovery and wellness session reminder (HH:MM)."
        },
        "focusRecovery.autoProgress": {
          "type": "boolean",
          "default": true,
          "description": "Enable adaptive progression (difficulty increases automatically every 5 sessions)."
        },
        "focusRecovery.difficulty": {
          "type": "string",
          "enum": [
            "Beginner (Level 1)",
            "Level 2",
            "Level 3",
            "Level 4",
            "Level 5",
            "Advanced (Level 6)"
          ],
          "default": "Beginner (Level 1)",
          "description": "Difficulty overrides if autoProgress is disabled."
        },
        "focusRecovery.enableNotifications": {
          "type": "boolean",
          "default": true,
          "description": "Trigger soundless visual VS Code alerts at scheduled reminder times."
        },
        "focusRecovery.enableStatusBar": {
          "type": "boolean",
          "default": true,
          "description": "Add a Heart shortcut in the VS Code status bar for starting sessions."
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.75.0",
    "@types/node": "^16.x",
    "typescript": "^4.9.4"
  }
}`
  },
  {
    name: "types.ts",
    path: "src/types.ts",
    language: "typescript",
    description: "Shared TypeScript interfaces for progress data, records, progression levels, and extension settings.",
    content: `/**
 * Focus Recovery - Type Definitions
 */

export interface ReminderSettings {
  morningReminder: string; // HH:MM format
  eveningReminder: string; // HH:MM format
  enableNotifications: boolean;
  enableStatusBar: boolean;
  autoProgress: boolean;
}

export interface ProgressionLevel {
  level: number;
  displayName: string;
  holdDuration: number; // Duration of active phase (seconds)
  restDuration: number; // Duration of relax phase (seconds)
  reps: number;         // Repetitions per set
}

export interface UserProgress {
  currentLevel: number;
  currentStreak: number;
  totalSessions: number;
  lastCompletedSession: string | null; // ISO Date String
  autoProgress: boolean;
  difficultyPreference: string;
  progressHistory: SessionRecord[];
}

export interface SessionRecord {
  timestamp: string; // ISO String
  level: number;
  holdDuration: number;
  restDuration: number;
  reps: number;
  completed: boolean;
}`
  },
  {
    name: "progressManager.ts",
    path: "src/progressManager.ts",
    language: "typescript",
    description: "Adaptive progression logic, streak calculation, level tracking, and VS Code globalState local storage adapter.",
    content: `import * as vscode from 'vscode';
import { UserProgress, SessionRecord, ProgressionLevel } from './types';

// Progression details as specified in requested training program rules
export const PROGRESSION_LEVELS: ProgressionLevel[] = [
  { level: 1, displayName: "Beginner (Level 1)", holdDuration: 3, restDuration: 3, reps: 10 },
  { level: 2, displayName: "Level 2", holdDuration: 4, restDuration: 3, reps: 12 },
  { level: 3, displayName: "Level 3", holdDuration: 5, restDuration: 3, reps: 15 },
  { level: 4, displayName: "Level 4", holdDuration: 6, restDuration: 3, reps: 18 },
  { level: 5, displayName: "Level 5", holdDuration: 8, restDuration: 3, reps: 20 },
  { level: 6, displayName: "Advanced (Level 6)", holdDuration: 10, restDuration: 3, reps: 25 }
];

export class ProgressManager {
  private static readonly STORAGE_KEY = 'focusRecovery.progress';
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Retrieves the current user progress from the local VS Code globalState.
   */
  public getProgress(): UserProgress {
    const data = this.context.globalState.get<string>(ProgressManager.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Focus Recovery: Error parsing progress data", e);
      }
    }
    return this.getDefaultProgress();
  }

  /**
   * Returns empty progress configuration.
   */
  private getDefaultProgress(): UserProgress {
    return {
      currentLevel: 1,
      currentStreak: 0,
      totalSessions: 0,
      lastCompletedSession: null,
      autoProgress: true,
      difficultyPreference: "Beginner (Level 1)",
      progressHistory: []
    };
  }

  /**
   * Saves updated progress back to VS Code globalState.
   */
  public saveProgress(progress: UserProgress): void {
    this.context.globalState.update(ProgressManager.STORAGE_KEY, JSON.stringify(progress));
  }

  /**
   * Records a completed session, manages streaks, and increments level automatically if needed.
   */
  public addCompletedSession(completed: boolean): { levelUp: boolean; oldLevel: number; newLevel: number; streakUpdated: boolean } {
    const progress = this.getProgress();
    const config = vscode.workspace.getConfiguration('focusRecovery');
    const autoProgress = config.get<boolean>('autoProgress', true);
    
    const activeLevel = this.getCurrentLevelInfo();
    const now = new Date();
    
    let streakUpdated = false;
    let newStreak = progress.currentStreak;
    
    if (completed) {
      if (progress.lastCompletedSession) {
        const lastDate = new Date(progress.lastCompletedSession);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          // Check if it's the next day (to avoid double counting same-day completions)
          if (now.getDate() !== lastDate.getDate() || now.getMonth() !== lastDate.getMonth()) {
            newStreak += 1;
            streakUpdated = true;
          }
        } else {
          // Streak broken
          newStreak = 1;
          streakUpdated = true;
        }
      } else {
        newStreak = 1;
        streakUpdated = true;
      }
    }

    // Add session record
    const record: SessionRecord = {
      timestamp: now.toISOString(),
      level: activeLevel.level,
      holdDuration: activeLevel.holdDuration,
      restDuration: activeLevel.restDuration,
      reps: activeLevel.reps,
      completed
    };

    progress.progressHistory.push(record);
    
    let levelUp = false;
    const oldLevel = progress.currentLevel;
    let newLevel = oldLevel;

    if (completed) {
      progress.totalSessions += 1;
      progress.lastCompletedSession = now.toISOString();
      progress.currentStreak = newStreak;

      // Auto-increase level every 5 completed sessions
      if (autoProgress && oldLevel < 6) {
        const successfulAtThisLevel = progress.progressHistory.filter(
          h => h.level === oldLevel && h.completed
        ).length;

        if (successfulAtThisLevel > 0 && successfulAtThisLevel % 5 === 0) {
          newLevel = oldLevel + 1;
          progress.currentLevel = newLevel;
          levelUp = true;
        }
      }
    }

    this.saveProgress(progress);
    return { levelUp, oldLevel, newLevel, streakUpdated };
  }

  /**
   * Obtains current active level configuration (auto or manual).
   */
  public getCurrentLevelInfo(): ProgressionLevel {
    const progress = this.getProgress();
    const config = vscode.workspace.getConfiguration('focusRecovery');
    const autoProgress = config.get<boolean>('autoProgress', true);
    
    if (autoProgress) {
      const current = progress.currentLevel;
      return PROGRESSION_LEVELS.find(l => l.level === current) || PROGRESSION_LEVELS[0];
    } else {
      const pref = config.get<string>('difficulty', "Beginner (Level 1)");
      return PROGRESSION_LEVELS.find(l => l.displayName === pref) || PROGRESSION_LEVELS[0];
    }
  }

  /**
   * Resets all progress data
   */
  public resetProgress(): void {
    this.saveProgress(this.getDefaultProgress());
  }

  /**
   * Import data string (JSON format)
   */
  public importProgress(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed.currentLevel === 'number' && Array.isArray(parsed.progressHistory)) {
        this.saveProgress(parsed);
        return true;
      }
    } catch (e) {
      // JSON format is not correct
    }
    return false;
  }
}`
  },
  {
    name: "sessionManager.ts",
    path: "src/sessionManager.ts",
    language: "typescript",
    description: "Controls the active session playback, timing repetitions, rendering status bars, and cancellation hooks.",
    content: `import * as vscode from 'vscode';
import { ProgressManager } from './progressManager';

export class SessionManager {
  private progressManager: ProgressManager;
  private isActiveSession: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(progressManager: ProgressManager) {
    this.progressManager = progressManager;
  }

  /**
   * Initiates a multi-step wellness recovery session.
   */
  public async startSession(): Promise<void> {
    if (this.isActiveSession) {
      vscode.window.showWarningMessage("A Focus Recovery session is already active.");
      return;
    }

    this.isActiveSession = true;
    const levelInfo = this.progressManager.getCurrentLevelInfo();

    vscode.window.showInformationMessage(\`Starting Focus Recovery Session: \${levelInfo.displayName}\`);

    try {
      // 1. Preparation Phase (3 seconds)
      const prepareOk = await this.countdown("Prepare", 3, "Get comfortable, breathe smoothly...");
      if (!prepareOk) {
        this.cancelSession();
        return;
      }

      // 2. Repetition Phase
      for (let rep = 1; rep <= levelInfo.reps; rep++) {
        if (!this.isActiveSession) { break; }

        // Activate Hold
        const holdOk = await this.countdown(
          \`Activate [Hold] (Repetition \${rep}/\${levelInfo.reps})\`,
          levelInfo.holdDuration,
          "Deep, quiet focus hold..."
        );
        if (!holdOk) {
          this.cancelSession();
          return;
        }

        // Relax Rest (omit for the very last rep)
        if (rep < levelInfo.reps) {
          const restOk = await this.countdown(
            \`Relax [Rest] (Repetition \${rep}/\${levelInfo.reps})\`,
            levelInfo.restDuration,
            "Release, relax posture and refocus eyes..."
          );
          if (!restOk) {
            this.cancelSession();
            return;
          }
        }
      }

      // 3. Complete Sequence
      this.isActiveSession = false;
      const results = this.progressManager.addCompletedSession(true);

      vscode.window.showInformationMessage("Focus Recovery: Session complete! Excellent job prioritizing your focus.");
      
      if (results.levelUp) {
        vscode.window.showInformationMessage(\`Focus Recovery: Congratulations! You\\'ve advanced to Level \${results.newLevel}!\`);
      }
    } catch (e) {
      this.cancelSession();
      vscode.window.showErrorMessage("Focus Recovery: Active session was interrupted.");
    }
  }

  /**
   * Handles timer intervals for phase countdowns
   */
  private countdown(phase: string, duration: number, description: string): Promise<boolean> {
    return new Promise((resolve) => {
      let secondsLeft = duration;

      const runTick = () => {
        if (!this.isActiveSession) {
          if (this.timer) { clearInterval(this.timer); }
          resolve(false);
          return;
        }

        vscode.window.setStatusBarMessage(
          \`Focus Recovery | \${phase}: \${secondsLeft}s - \${description}\`,
          1000
        );

        secondsLeft--;
        if (secondsLeft < 0) {
          if (this.timer) { clearInterval(this.timer); }
          resolve(true);
        }
      };

      runTick();
      this.timer = setInterval(runTick, 1000);
    });
  }

  /**
   * Cancels and resets state.
   */
  public cancelSession(): void {
    this.isActiveSession = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    vscode.window.setStatusBarMessage("Focus Recovery: Session was ended.", 4000);
  }

  public getIsActive(): boolean {
    return this.isActiveSession;
  }
}`
  },
  {
    name: "reminderManager.ts",
    path: "src/reminderManager.ts",
    language: "typescript",
    description: "Scheduled alarm tracking, snooze callbacks, and offline VS Code startup catch-up logic.",
    content: `import * as vscode from 'vscode';
import { ProgressManager } from './progressManager';

export class ReminderManager {
  private progressManager: ProgressManager;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastReminderDateKey = 'focusRecovery.lastReminderDate';
  private context: vscode.ExtensionContext;

  constructor(progressManager: ProgressManager, context: vscode.ExtensionContext) {
    this.progressManager = progressManager;
    this.context = context;
  }

  /**
   * Starts periodic polling for daily scheduled alarms.
   */
  public activate(): void {
    this.performStartupCatchup();
    
    // Poll every 45 seconds to check schedules
    this.checkTimer = setInterval(() => {
      this.checkSchedules();
    }, 45000);
  }

  /**
   * Cleans timers upon extension deactivation.
   */
  public deactivate(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
  }

  /**
   * Catch up if VS Code was closed during scheduled hours.
   */
  private performStartupCatchup(): void {
    const lastTrigger = this.context.globalState.get<string>(this.lastReminderDateKey);
    const todayStr = new Date().toDateString();

    if (lastTrigger !== todayStr) {
      const config = vscode.workspace.getConfiguration('focusRecovery');
      const isNotificationEnabled = config.get<boolean>('enableNotifications', true);
      if (!isNotificationEnabled) { return; }

      const morningTime = config.get<string>('morningReminder', '08:00');
      const eveningTime = config.get<string>('eveningReminder', '19:00');

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const mMin = parseTime(morningTime);
      const eMin = parseTime(eveningTime);

      // If past scheduled times on startup and no session happened today, prompt
      if (currentMinutes > mMin || currentMinutes > eMin) {
        this.triggerNotification("Focus Recovery: Welcome back! A scheduled session was missed while offline. Ready for a recovery exercise?");
        this.context.globalState.update(this.lastReminderDateKey, todayStr);
      }
    }
  }

  /**
   * Checks current system time against user-defined configurations.
   */
  private checkSchedules(): void {
    const config = vscode.workspace.getConfiguration('focusRecovery');
    const isNotificationEnabled = config.get<boolean>('enableNotifications', true);
    if (!isNotificationEnabled) { return; }

    const morningTime = config.get<string>('morningReminder', '08:00');
    const eveningTime = config.get<string>('eveningReminder', '19:00');

    const now = new Date();
    const hhmm = \`\${String(now.getHours()).padStart(2, '0')}:\${String(now.getMinutes()).padStart(2, '0')}\`;
    const todayStr = now.toDateString();

    const lastTrigger = this.context.globalState.get<string>(this.lastReminderDateKey);

    if (lastTrigger !== todayStr) {
      if (hhmm === morningTime || hhmm === eveningTime) {
        const label = hhmm === morningTime ? "Morning Focus Session" : "Evening Recovery Session";
        this.triggerNotification(\`Focus Recovery: It\\'s time for your scheduled \${label}!\`);
        this.context.globalState.update(this.lastReminderDateKey, todayStr);
      }
    }
  }

  /**
   * Fires VS Code selection alert
   */
  private triggerNotification(message: string): void {
    vscode.window.showInformationMessage(
      message,
      "Start Session",
      "Snooze 10 Minutes",
      "Snooze 30 Minutes"
    ).then(selection => {
      if (selection === "Start Session") {
        vscode.commands.executeCommand('focusRecovery.startSession');
      } else if (selection === "Snooze 10 Minutes") {
        this.snooze(10);
      } else if (selection === "Snooze 30 Minutes") {
        this.snooze(30);
      }
    });
  }

  /**
   * Sets up deferred trigger
   */
  private snooze(minutes: number): void {
    vscode.window.showInformationMessage(\`Focus Recovery: Reminder snoozed for \${minutes} minutes.\`);
    setTimeout(() => {
      this.triggerNotification("Focus Recovery: Snoozed session is ready to begin.");
    }, minutes * 60000);
  }
}`
  },
  {
    name: "dashboard.ts",
    path: "src/dashboard.ts",
    language: "typescript",
    description: "Generates the graphical dashboard (HTML/CSS wrapper) using VS Code's iframe WebviewPanel API.",
    content: `import * as vscode from 'vscode';
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

      return \`
        <div class="record-item">
          <div class="record-details">
            <span class="record-title">Level \${item.level} Session</span>
            <span class="record-subtitle">\${formattedDate} • \${item.reps} reps • \${item.holdDuration}s Hold</span>
          </div>
          <span class="badge \${badgeClass}">\${label}</span>
        </div>
      \`;
    }).join('') || '<div class="no-records">No completed sessions yet. Start your first session below!</div>';

    // Calculate progression percentage toward next level (every 5 successful sessions per level)
    const completionsAtCurrent = progress.progressHistory.filter(
      h => h.level === progress.currentLevel && h.completed
    ).length;
    const progressPercent = Math.min((completionsAtCurrent / 5) * 100, 100);

    return \`
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
            width: \${progressPercent}%;
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
            <div class="stat-val">\${activeLevel.displayName}</div>
            <div class="level-progress-bar-container">
              <div class="level-progress-bar-fill"></div>
            </div>
            <div class="progress-label">
              <span>Next Level Progress</span>
              <span>\${completionsAtCurrent}/5 Sessions</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Continuous Daily Streak</div>
            <div class="stat-val">\${progress.currentStreak} Days</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Total Completed Cycles</div>
            <div class="stat-val">\${progress.totalSessions} Sessions</div>
          </div>
        </div>

        <div class="main-content">
          <div>
            <div class="panel-title">Recent Activity Logs</div>
            \${recordsHTML}
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
    \`;
  }
}`
  },
  {
    name: "extension.ts",
    path: "src/extension.ts",
    language: "typescript",
    description: "The primary extension entry point. Regulates command registering, status bar click triggers, and settings binding hook.",
    content: `import * as vscode from 'vscode';
import { ProgressManager } from './progressManager';
import { SessionManager } from './sessionManager';
import { ReminderManager } from './reminderManager';
import { Dashboard } from './dashboard';

let reminderManager: ReminderManager | undefined;
let statusBarShortcut: vscode.StatusBarItem | undefined;

/**
 * Activates Focus Recovery extension.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Focus Recovery Extension Activated.');

  // Instantiate Modules
  const progressManager = new ProgressManager(context);
  const sessionManager = new SessionManager(progressManager);
  reminderManager = new ReminderManager(progressManager, context);
  const dashboard = new Dashboard(progressManager);

  // Activate reminder schedules
  reminderManager.activate();

  // Command 1: Start Active Session
  const startSessionCmd = vscode.commands.registerCommand('focusRecovery.startSession', () => {
    sessionManager.startSession();
  });

  // Command 2: Show Statistics Dashboard
  const showStatisticsCmd = vscode.commands.registerCommand('focusRecovery.showStatistics', () => {
    dashboard.show();
  });

  // Command 3: Change Difficulty manually
  const changeDifficultyCmd = vscode.commands.registerCommand('focusRecovery.changeDifficulty', async () => {
    const config = vscode.workspace.getConfiguration('focusRecovery');
    const autoProgress = config.get<boolean>('autoProgress', true);

    if (autoProgress) {
      const selection = await vscode.window.showWarningMessage(
        "Focus Recovery: Automatic level advancement is enabled. Change to Manual configuration?",
        "Disable Auto-Progress",
        "Keep Auto-Progress"
      );

      if (selection === "Disable Auto-Progress") {
        await config.update('autoProgress', false, vscode.ConfigurationTarget.Global);
      } else {
        return;
      }
    }

    const difficulties = [
      "Beginner (Level 1)",
      "Level 2",
      "Level 3",
      "Level 4",
      "Level 5",
      "Advanced (Level 6)"
    ];

    const pick = await vscode.window.showQuickPick(difficulties, {
      placeHolder: "Select Wellness Progression Difficulty"
    });

    if (pick) {
      await config.update('difficulty', pick, vscode.ConfigurationTarget.Global);
      
      // Update in local progress object
      const progress = progressManager.getProgress();
      progress.currentLevel = difficulties.indexOf(pick) + 1;
      progressManager.saveProgress(progress);

      vscode.window.showInformationMessage(\`Focus Recovery: Wellness level set manually to \${pick}.\`);
      dashboard.update();
    }
  });

  // Command 4: Reset Progress and Logs
  const resetProgressCmd = vscode.commands.registerCommand('focusRecovery.resetProgress', async () => {
    const confirm = await vscode.window.showWarningMessage(
      "Are you sure you want to reset your entire Focus Recovery progress and records?",
      { modal: true },
      "Yes, Reset Progress"
    );

    if (confirm === "Yes, Reset Progress") {
      progressManager.resetProgress();
      vscode.window.showInformationMessage("Focus Recovery: Progress and logs cleared successfully.");
      dashboard.update();
    }
  });

  // Command 5: Export Progress
  const exportProgressCmd = vscode.commands.registerCommand('focusRecovery.exportProgress', async () => {
    const progress = progressManager.getProgress();
    const exportedStr = JSON.stringify(progress, null, 2);

    const doc = await vscode.workspace.openTextDocument({
      content: exportedStr,
      language: 'json'
    });
    
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage("Focus Recovery: Progress configuration exported. Save this file to backup your history.");
  });

  // Command 6: Import Progress
  const importProgressCmd = vscode.commands.registerCommand('focusRecovery.importProgress', async () => {
    const backupStr = await vscode.window.showInputBox({
      prompt: "Paste your exported Focus Recovery JSON string",
      placeHolder: "JSON string..."
    });

    if (backupStr) {
      const ok = progressManager.importProgress(backupStr);
      if (ok) {
        vscode.window.showInformationMessage("Focus Recovery: History imported successfully.");
        dashboard.update();
      } else {
        vscode.window.showErrorMessage("Focus Recovery: Import failed. Invalid JSON structure.");
      }
    }
  });

  // Add Shortcut to VS Code Status Bar
  const isStatusBarEnabled = vscode.workspace.getConfiguration('focusRecovery').get<boolean>('enableStatusBar', true);
  if (isStatusBarEnabled) {
    statusBarShortcut = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarShortcut.command = 'focusRecovery.startSession';
    statusBarShortcut.text = '$(heart) Focus Recovery';
    statusBarShortcut.tooltip = 'Start Focus Recovery Session';
    statusBarShortcut.show();
    context.subscriptions.push(statusBarShortcut);
  }

  // Handle configuration changes at runtime
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('focusRecovery.enableStatusBar')) {
      const enabled = vscode.workspace.getConfiguration('focusRecovery').get<boolean>('enableStatusBar', true);
      if (enabled) {
        if (!statusBarShortcut) {
          statusBarShortcut = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
          statusBarShortcut.command = 'focusRecovery.startSession';
          statusBarShortcut.text = '$(heart) Focus Recovery';
          statusBarShortcut.tooltip = 'Start Focus Recovery Session';
        }
        statusBarShortcut.show();
      } else if (statusBarShortcut) {
        statusBarShortcut.hide();
      }
    }
    dashboard.update();
  }));

  // Context Subscription registrations
  context.subscriptions.push(
    startSessionCmd,
    showStatisticsCmd,
    changeDifficultyCmd,
    resetProgressCmd,
    exportProgressCmd,
    importProgressCmd
  );
}

/**
 * Cleanup routine
 */
export function deactivate() {
  if (reminderManager) {
    reminderManager.deactivate();
  }
}`
  },
  {
    name: "tsconfig.json",
    path: "tsconfig.json",
    language: "json",
    description: "Standard compiler settings for TypeScript, targeting ES2020 for Node runtime in VS Code.",
    content: `{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "outDir": "out",
    "lib": ["es2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}`
  },
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    description: "The official user handbook and step-by-step developer build guide for the extension.",
    content: `# Focus Recovery VS Code Extension

Focus Recovery is an interactive local wellness, posture alignment, and screen-break assistant for developers. It runs entirely inside your local VS Code editor without external connections, APIs, databases, or tracking telemetry. 

## Key Core Features
- 🧘 **Dynamic Exercises**: Follow progressive hold/relax intervals specifically crafted to stretch upper neck muscles, ease shoulder tension, and reset focal optical distance.
- ⚙️ **Automatic Adaptation**: Progress automatically through 6 levels of difficulty based on completed sessions (levels up every 5 sessions).
- 🕒 **Smart Background Schedules**: Prompt morning (8:00 AM) and evening (7:00 PM) reminders, with startup catch-up logic so you never miss a routine when VS Code opens.
- ❤️ **Status Bar Shortcut**: Quick session launchers directly placed in your status bar.
- 📊 **Local Statistics**: Visual logs, streak tracking, and manual difficulty adjustment capabilities.

---

## Detailed Build Instructions

To build, test, and run the Focus Recovery extension locally:

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Visual Studio Code](https://code.visualstudio.com/)

### 2. Setup Workspace Directories
Create a folder named \`focus-recovery\` on your drive, and populate the following structure:
\`\`\`text
focus-recovery/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── types.ts
    ├── extension.ts
    ├── progressManager.ts
    ├── sessionManager.ts
    ├── reminderManager.ts
    └── dashboard.ts
\`\`\`

### 3. Install Dependencies
Open your terminal in the \`focus-recovery\` root folder and run:
\`\`\`bash
npm install
\`\`\`

### 4. Compile Code
Compile the TypeScript code using:
\`\`\`bash
npm run compile
\`\`\`
Or run in watch mode:
\`\`\`bash
npm run watch
\`\`\`

### 5. Launch & Debug the Extension
1. Open the \`focus-recovery\` folder in Visual Studio Code.
2. Press \`F5\` on your keyboard (or go to **Run and Debug** in the side panel and click **Launch Extension**).
3. A new window called **Extension Development Host** will open.
4. Your Focus Recovery extension is active in this window!

### 6. Extension Commands
Press \`Ctrl+Shift+P\` (or \`Cmd+Shift+P\` on macOS) inside the host window to search for commands:
- \`Focus Recovery: Start Session\`
- \`Focus Recovery: Show Statistics\`
- \`Focus Recovery: Change Difficulty\`
- \`Focus Recovery: Reset Progress\`
- \`Focus Recovery: Export Progress\`
- \`Focus Recovery: Import Progress\`

---

## License
Apache-2.0 - Crafted purely for physical health and developer productivity.`
  }
];
