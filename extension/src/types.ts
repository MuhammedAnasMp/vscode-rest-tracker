/**
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
}
