import * as vscode from 'vscode';
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

    vscode.window.showInformationMessage(`Starting Focus Recovery Session: ${levelInfo.displayName}`);

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
          `Activate [Hold] (Repetition ${rep}/${levelInfo.reps})`,
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
            `Relax [Rest] (Repetition ${rep}/${levelInfo.reps})`,
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
        vscode.window.showInformationMessage(`Focus Recovery: Congratulations! You've advanced to Level ${results.newLevel}!`);
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
          `Focus Recovery | ${phase}: ${secondsLeft}s - ${description}`,
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
}
