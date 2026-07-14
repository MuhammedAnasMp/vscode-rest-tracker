import * as vscode from 'vscode';
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
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toDateString();

    const lastTrigger = this.context.globalState.get<string>(this.lastReminderDateKey);

    if (lastTrigger !== todayStr) {
      if (hhmm === morningTime || hhmm === eveningTime) {
        const label = hhmm === morningTime ? "Morning Focus Session" : "Evening Recovery Session";
        this.triggerNotification(`Focus Recovery: It's time for your scheduled ${label}!`);
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
    vscode.window.showInformationMessage(`Focus Recovery: Reminder snoozed for ${minutes} minutes.`);
    setTimeout(() => {
      this.triggerNotification("Focus Recovery: Snoozed session is ready to begin.");
    }, minutes * 60000);
  }
}
