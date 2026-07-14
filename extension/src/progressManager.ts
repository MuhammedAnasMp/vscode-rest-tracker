import * as vscode from 'vscode';
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
}
