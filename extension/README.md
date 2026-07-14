# Focus Recovery - VS Code Extension

A physical workspace wellness, posture alignment, and visual recovery assistant built directly for developers inside Visual Studio Code.

## Key Features

- ❤️ **Adaptive Progression System:** Starts at Beginner (Level 1) (10 reps of 3s hold / 3s rest) and dynamically advances to Advanced (Level 6) (25 reps of 10s hold / 3s rest) as you complete sessions.
- ⏰ **Double Alarms:** Configurable morning and evening alert notifications for routine posture/optical resets.
- 🛌 **Soundless Focus Notifications:** Integrated alarms with snooze choices that respect your active focus state.
- 🔄 **Offline-first Catch-up:** Automatically alerts you to missed scheduled sessions when you launch VS Code after being offline.
- 📊 **Visual Webview Dashboard:** View live stats, streaks, history, and wellness posture instructions inside the editor.

---

## How to Install and Run Locally

Follow these instructions to load and test this extension inside your native VS Code:

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (v16.x or newer).
2. Install [Visual Studio Code](https://code.visualstudio.com/).

### Installation Steps

1. **Extract/Move the code:**
   Make sure the `/extension` directory is copied into its own standalone folder on your local computer.

2. **Open the directory in VS Code:**
   Launch VS Code, go to `File -> Open Folder...` and select the folder containing these files.

3. **Install developer dependencies:**
   Open a terminal in VS Code (`Ctrl+~` or `Cmd+~`) and run:
   ```bash
   npm install
   ```

4. **Compile the extension:**
   Compile the TypeScript code using the build task:
   ```bash
   npm run compile
   ```

5. **Debug or Side-Load the extension:**
   - Press **F5** (or go to `Run and Debug` tab and click `Run Extension`).
   - This opens a new VS Code window called **[Extension Development Host]**.
   - In this new window, you have access to all the commands and features!

---

## Command Palette Shortcuts

In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
- `Focus Recovery: Start Session` - Launches the exercise timer phase.
- `Focus Recovery: Show Statistics` - Opens the interactive visual dashboard.
- `Focus Recovery: Change Difficulty` - Manually overrides the current training difficulty level.
- `Focus Recovery: Reset Progress` - Completely cleans session statistics and streaks.
- `Focus Recovery: Export Progress` - Generates a backup JSON of your progress.
- `Focus Recovery: Import Progress` - Syncs your records using exported JSON backups.

---

## Configuration Settings

Go to `File -> Preferences -> Settings` (or `Cmd+,` on macOS) and search for `Focus Recovery` to configure:
- **Morning Reminder:** (`focusRecovery.morningReminder`) Default: `08:00`.
- **Evening Reminder:** (`focusRecovery.eveningReminder`) Default: `19:00`.
- **Auto Progress:** (`focusRecovery.autoProgress`) Default: `true`.
- **Difficulty Overrides:** (`focusRecovery.difficulty`) Set custom levels when Auto Progress is off.
- **Enable Notifications:** (`focusRecovery.enableNotifications`) Turn alert notifications on/off.
- **Enable Status Bar shortcut:** (`focusRecovery.enableStatusBar`) Enable or disable the quick heart launch icon.

---

Enjoy your sessions and stay healthy while coding!
