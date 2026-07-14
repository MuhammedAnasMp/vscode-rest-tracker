import * as vscode from 'vscode';
import { ProgressManager } from './progressManager';
import { SessionManager } from './sessionManager';
import { ReminderManager } from './reminderManager';
import { Dashboard } from './dashboard';

let reminderManager: ReminderManager | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Focus Recovery is now active.');

  // Initialize Managers
  const progressManager = new ProgressManager(context);
  const sessionManager = new SessionManager(progressManager);
  const dashboard = new Dashboard(progressManager);
  
  reminderManager = new ReminderManager(progressManager, context);
  reminderManager.activate();

  // Create Status Bar Shortcut
  const config = vscode.workspace.getConfiguration('focusRecovery');
  const enableStatusBar = config.get<boolean>('enableStatusBar', true);

  if (enableStatusBar) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'focusRecovery.startSession';
    statusBarItem.text = '$(heart) Start Focus Recovery';
    statusBarItem.tooltip = 'Click to launch active wellness recovery cycle';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
  }

  // Register Commands
  const startSessionCmd = vscode.commands.registerCommand('focusRecovery.startSession', async () => {
    if (sessionManager.getIsActive()) {
      const choice = await vscode.window.showWarningMessage(
        "A Focus Recovery session is already active.",
        "Stop Active Session"
      );
      if (choice === "Stop Active Session") {
        sessionManager.cancelSession();
      }
    } else {
      await sessionManager.startSession();
      dashboard.update();
    }
  });

  const showStatsCmd = vscode.commands.registerCommand('focusRecovery.showStatistics', () => {
    dashboard.show();
  });

  const changeDifficultyCmd = vscode.commands.registerCommand('focusRecovery.changeDifficulty', async () => {
    const choices = [
      "Beginner (Level 1)",
      "Level 2",
      "Level 3",
      "Level 4",
      "Level 5",
      "Advanced (Level 6)"
    ];
    
    const selection = await vscode.window.showQuickPick(choices, {
      placeHolder: 'Select your preferred static wellness difficulty level:'
    });

    if (selection) {
      // Disable auto-progress if user manually overrides difficulty
      await vscode.workspace.getConfiguration('focusRecovery').update('autoProgress', false, vscode.ConfigurationTarget.Global);
      await vscode.workspace.getConfiguration('focusRecovery').update('difficulty', selection, vscode.ConfigurationTarget.Global);
      
      // Sync progress structure
      const progress = progressManager.getProgress();
      progress.difficultyPreference = selection;
      
      const matchedLevel = choices.indexOf(selection) + 1;
      progress.currentLevel = matchedLevel;
      progressManager.saveProgress(progress);

      dashboard.update();
      vscode.window.showInformationMessage(`Focus Recovery: Switched to static training mode (${selection}).`);
    }
  });

  const resetProgressCmd = vscode.commands.registerCommand('focusRecovery.resetProgress', async () => {
    const confirmation = await vscode.window.showWarningMessage(
      "Are you absolutely sure you want to reset all streak records, completions, and custom sessions?",
      "Yes",
      "No"
    );

    if (confirmation === "Yes") {
      progressManager.resetProgress();
      dashboard.update();
      vscode.window.showInformationMessage("Focus Recovery: Progress records successfully reset.");
    }
  });

  const exportProgressCmd = vscode.commands.registerCommand('focusRecovery.exportProgress', async () => {
    const progress = progressManager.getProgress();
    const doc = await vscode.workspace.openTextDocument({
      content: JSON.stringify(progress, null, 2),
      language: 'json'
    });
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage("Focus Recovery: Copy the opened JSON to backup your wellness data.");
  });

  const importProgressCmd = vscode.commands.registerCommand('focusRecovery.importProgress', async () => {
    const input = await vscode.window.showInputBox({
      placeHolder: 'Paste exported JSON string to sync progress...'
    });

    if (input) {
      const ok = progressManager.importProgress(input);
      if (ok) {
        dashboard.update();
        vscode.window.showInformationMessage("Focus Recovery: History synced successfully.");
      } else {
        vscode.window.showErrorMessage("Focus Recovery: Invalid backup JSON structure.");
      }
    }
  });

  context.subscriptions.push(
    startSessionCmd,
    showStatsCmd,
    changeDifficultyCmd,
    resetProgressCmd,
    exportProgressCmd,
    importProgressCmd
  );
}

export function deactivate() {
  if (reminderManager) {
    reminderManager.deactivate();
  }
}
