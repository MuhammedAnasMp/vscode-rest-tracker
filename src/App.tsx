/**
 * Focus Recovery - VS Code Extension Developer Workspace & Simulator
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Settings, 
  Files, 
  Terminal, 
  Play, 
  Check, 
  Clock, 
  RotateCcw, 
  Download, 
  Copy, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  File, 
  FileText, 
  Search, 
  X, 
  Sparkles, 
  Bell, 
  AlertCircle, 
  Sliders, 
  User, 
  BookOpen,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EXTENSION_FILES, ExtensionFile } from './codeFiles';

// Type definitions for user stats
interface LevelConfig {
  level: number;
  displayName: string;
  holdDuration: number;
  restDuration: number;
  reps: number;
}

const PROGRESSION_LEVELS: LevelConfig[] = [
  { level: 1, displayName: "Beginner (Level 1)", holdDuration: 3, restDuration: 3, reps: 10 },
  { level: 2, displayName: "Level 2", holdDuration: 4, restDuration: 3, reps: 12 },
  { level: 3, displayName: "Level 3", holdDuration: 5, restDuration: 3, reps: 15 },
  { level: 4, displayName: "Level 4", holdDuration: 6, restDuration: 3, reps: 18 },
  { level: 5, displayName: "Level 5", holdDuration: 8, restDuration: 3, reps: 20 },
  { level: 6, displayName: "Advanced (Level 6)", holdDuration: 10, restDuration: 3, reps: 25 },
];

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actions?: { label: string; action: () => void }[];
}

interface ActivityRecord {
  timestamp: string;
  level: number;
  reps: number;
  completed: boolean;
  holdDuration: number;
}

export default function App() {
  // Navigation & UI tabs
  const [activeSidebarTab, setActiveSidebarTab] = useState<'explorer' | 'stats' | 'settings' | 'terminal' | 'readme'>('explorer');
  const [openTabs, setOpenTabs] = useState<string[]>(['README.md', '❤️ Dashboard']);
  const [activeTab, setActiveTab] = useState<string>('README.md');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
    src: true,
  });

  // Settings state (synchronizes config variables)
  const [morningReminder, setMorningReminder] = useState<string>('08:00');
  const [eveningReminder, setEveningReminder] = useState<string>('19:00');
  const [autoProgress, setAutoProgress] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<string>('Beginner (Level 1)');
  const [enableNotifications, setEnableNotifications] = useState<boolean>(true);
  const [enableStatusBar, setEnableStatusBar] = useState<boolean>(true);

  // Statistics State
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [lastCompletedSession, setLastCompletedSession] = useState<string | null>(null);
  const [history, setHistory] = useState<ActivityRecord[]>([]);

  // Simulation playback engine
  const [isSessionRunning, setIsSessionRunning] = useState<boolean>(false);
  const [sessionPhase, setSessionPhase] = useState<'prepare' | 'hold' | 'rest' | 'complete' | 'none'>('none');
  const [sessionRep, setSessionRep] = useState<number>(1);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Toast Alerts & Telemetry Log entries
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [commandPaletteSearch, setCommandPaletteSearch] = useState<string>('');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[Focus Recovery] Developer Environment Bootstrapped successfully.",
    "[Focus Recovery] Pure installable VS Code Extension source code created in '/extension/' directory.",
    "[Focus Recovery] Reminder monitors activated for local morning and evening alarms."
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Load stats from LocalStorage
  useEffect(() => {
    const savedLevel = localStorage.getItem('fr_current_level');
    const savedStreak = localStorage.getItem('fr_current_streak');
    const savedTotal = localStorage.getItem('fr_total_sessions');
    const savedLast = localStorage.getItem('fr_last_completed');
    const savedHistory = localStorage.getItem('fr_history');
    
    const savedMorning = localStorage.getItem('fr_morning');
    const savedEvening = localStorage.getItem('fr_evening');
    const savedAuto = localStorage.getItem('fr_auto_progress');
    const savedDiff = localStorage.getItem('fr_difficulty');
    const savedNotifs = localStorage.getItem('fr_enable_notifs');
    const savedStatus = localStorage.getItem('fr_enable_status');

    if (savedLevel) { setCurrentLevel(parseInt(savedLevel)); }
    if (savedStreak) { setCurrentStreak(parseInt(savedStreak)); }
    if (savedTotal) { setTotalSessions(parseInt(savedTotal)); }
    if (savedLast) { setLastCompletedSession(savedLast); }
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { setHistory([]); }
    }

    if (savedMorning) { setMorningReminder(savedMorning); }
    if (savedEvening) { setEveningReminder(savedEvening); }
    if (savedAuto) { setAutoProgress(savedAuto === 'true'); }
    if (savedDiff) { setDifficulty(savedDiff); }
    if (savedNotifs) { setEnableNotifications(savedNotifs === 'true'); }
    if (savedStatus) { setEnableStatusBar(savedStatus === 'true'); }
  }, []);

  const saveStatsToLocal = (lvl: number, strk: number, tot: number, last: string | null, hist: ActivityRecord[]) => {
    localStorage.setItem('fr_current_level', lvl.toString());
    localStorage.setItem('fr_current_streak', strk.toString());
    localStorage.setItem('fr_total_sessions', tot.toString());
    if (last) { localStorage.setItem('fr_last_completed', last); }
    localStorage.setItem('fr_history', JSON.stringify(hist));
  };

  const saveConfigToLocal = (key: string, value: any) => {
    localStorage.setItem(`fr_${key}`, value.toString());
  };

  // Add Terminal Log helper
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Show simulated VS Code notification
  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', actions?: { label: string; action: () => void }[]) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, actions }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7000);
  };

  // Sound generator to mimic extension soundless/visual alerts with light feedback
  const playSound = (freq: number, type: 'sine' | 'triangle' | 'sawtooth' = 'sine', duration = 0.15) => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored browser context limits
    }
  };

  // Progression calculation configuration
  const activeLevelConfig = autoProgress 
    ? PROGRESSION_LEVELS.find(l => l.level === currentLevel) || PROGRESSION_LEVELS[0]
    : PROGRESSION_LEVELS.find(l => l.displayName === difficulty) || PROGRESSION_LEVELS[0];

  // Active Simulation Ticker
  useEffect(() => {
    let timerId: any = null;

    if (isSessionRunning) {
      if (sessionTimeRemaining > 0) {
        timerId = setInterval(() => {
          setSessionTimeRemaining(prev => prev - 1);
        }, 1000);
      } else {
        if (sessionPhase === 'prepare') {
          playSound(660, 'triangle', 0.25);
          setSessionPhase('hold');
          setSessionTimeRemaining(activeLevelConfig.holdDuration);
          addLog(`Session Step: Hold active for repetition ${sessionRep}/${activeLevelConfig.reps}`);
        } else if (sessionPhase === 'hold') {
          if (sessionRep >= activeLevelConfig.reps) {
            handleSessionCompleted(true);
          } else {
            playSound(440, 'sine', 0.2);
            setSessionPhase('rest');
            setSessionTimeRemaining(activeLevelConfig.restDuration);
            addLog(`Session Step: Relax posture & refocus eyes for repetition ${sessionRep}/${activeLevelConfig.reps}`);
          }
        } else if (sessionPhase === 'rest') {
          playSound(523, 'triangle', 0.2);
          setSessionRep(prev => prev + 1);
          setSessionPhase('hold');
          setSessionTimeRemaining(activeLevelConfig.holdDuration);
          addLog(`Session Step: Hold active for repetition ${sessionRep + 1}/${activeLevelConfig.reps}`);
        }
      }
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isSessionRunning, sessionPhase, sessionTimeRemaining, sessionRep, activeLevelConfig]);

  const startRecoverySession = () => {
    setIsSessionRunning(true);
    setSessionPhase('prepare');
    setSessionRep(1);
    setSessionTimeRemaining(3); // 3s preparation countdown
    addLog(`Command Trigger: Started Focus Recovery Session (${activeLevelConfig.displayName})`);
    playSound(440, 'sawtooth', 0.15);

    if (!openTabs.includes('❤️ Dashboard')) {
      setOpenTabs(prev => [...prev, '❤️ Dashboard']);
    }
    setActiveTab('❤️ Dashboard');
  };

  const cancelActiveSession = () => {
    setIsSessionRunning(false);
    setSessionPhase('none');
    addLog("Session Cancelled: Interrupted by developer simulation controller.");
    showToast("Active Focus Recovery session was cancelled.", "warning");
    playSound(220, 'sine', 0.4);
  };

  const handleSessionCompleted = (completed: boolean) => {
    setIsSessionRunning(false);
    setSessionPhase('none');
    playSound(880, 'triangle', 0.3);
    setTimeout(() => playSound(1318, 'triangle', 0.4), 150);

    const now = new Date();
    const isoString = now.toISOString();

    let newStreak = currentStreak;
    if (completed) {
      if (lastCompletedSession) {
        const lastDate = new Date(lastCompletedSession);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          if (now.getDate() !== lastDate.getDate() || now.getMonth() !== lastDate.getMonth()) {
            newStreak += 1;
          }
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
    }

    const record: ActivityRecord = {
      timestamp: isoString,
      level: activeLevelConfig.level,
      reps: activeLevelConfig.reps,
      completed: true,
      holdDuration: activeLevelConfig.holdDuration
    };

    const updatedHistory = [...history, record];
    const newTotal = totalSessions + 1;

    let leveledUp = false;
    let finalLevel = currentLevel;
    if (autoProgress && currentLevel < 6) {
      const completionsAtThisLevel = updatedHistory.filter(
        h => h.level === currentLevel && h.completed
      ).length;

      if (completionsAtThisLevel > 0 && completionsAtThisLevel % 5 === 0) {
        finalLevel = currentLevel + 1;
        leveledUp = true;
      }
    }

    setHistory(updatedHistory);
    setTotalSessions(newTotal);
    setLastCompletedSession(isoString);
    setCurrentStreak(newStreak);
    
    if (leveledUp) {
      setCurrentLevel(finalLevel);
      addLog(`Progression Advanced: Reached Level ${finalLevel}! Posture capacity and hold limits increased.`);
      showToast(`Congratulations! You've advanced to Level ${finalLevel} (${PROGRESSION_LEVELS[finalLevel-1].displayName}).`, 'success');
    } else {
      addLog(`Session Complete: Completed cycle logged. Total cycles: ${newTotal}`);
      showToast("Focus Recovery cycle complete! Great job stretching and relaxing eyes.", "success");
    }

    saveStatsToLocal(finalLevel, newStreak, newTotal, isoString, updatedHistory);
  };

  const handleToggleAutoProgress = () => {
    const nextVal = !autoProgress;
    setAutoProgress(nextVal);
    saveConfigToLocal('auto_progress', nextVal);
    addLog(`Configuration updated: focusRecovery.autoProgress set to ${nextVal}`);
    showToast(`Auto-progression is now ${nextVal ? 'enabled' : 'disabled'}.`);
  };

  const handleChangeManualDifficulty = (val: string) => {
    setDifficulty(val);
    saveConfigToLocal('difficulty', val);
    
    const index = PROGRESSION_LEVELS.findIndex(l => l.displayName === val);
    if (index !== -1) {
      setCurrentLevel(index + 1);
      saveStatsToLocal(index + 1, currentStreak, totalSessions, lastCompletedSession, history);
    }
    
    addLog(`Configuration updated: focusRecovery.difficulty override set to '${val}'`);
    showToast(`Manual level override set to: ${val}`);
  };

  const handleResetProgress = () => {
    if (window.confirm("Reset extension statistics, streak counts, and activity logs? This operation cannot be undone.")) {
      setCurrentLevel(1);
      setCurrentStreak(0);
      setTotalSessions(0);
      setLastCompletedSession(null);
      setHistory([]);
      saveStatsToLocal(1, 0, 0, null, []);
      addLog("Database Reset: Local globalState data files successfully cleared.");
      showToast("Focus Recovery history records have been reset.", "warning");
    }
  };

  // Download individual file dynamically in browser
  const downloadSingleFile = (file: ExtensionFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`Export: Downloaded file '${file.name}'`);
    showToast(`Downloaded ${file.name} to your local drive!`, 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.currentLevel !== undefined && Array.isArray(parsed.history)) {
            setCurrentLevel(parsed.currentLevel);
            setCurrentStreak(parsed.currentStreak || 0);
            setTotalSessions(parsed.totalSessions || 0);
            setLastCompletedSession(parsed.lastCompletedSession);
            setHistory(parsed.history);
            if (parsed.autoProgress !== undefined) { setAutoProgress(parsed.autoProgress); }
            if (parsed.difficulty !== undefined) { setDifficulty(parsed.difficulty); }
            
            saveStatsToLocal(
              parsed.currentLevel, 
              parsed.currentStreak || 0, 
              parsed.totalSessions || 0, 
              parsed.lastCompletedSession, 
              parsed.history
            );
            addLog("Import Success: Refreshed statistics and histories.");
            showToast("Focus Recovery history loaded successfully!", "success");
          } else {
            showToast("Invalid JSON data format.", "error");
          }
        } catch (err) {
          showToast("Failed to parse JSON backup.", "error");
        }
      };
    }
  };

  const renderWeeklyActivityChart = () => {
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const completionsMap = [3, 4, 2, 5, 4, 3, 2];
    const realSessionsToday = history.filter(h => {
      const d = new Date(h.timestamp);
      return d.toDateString() === new Date().toDateString();
    }).length;
    completionsMap[6] = Math.max(completionsMap[6], realSessionsToday);
    const maxVal = Math.max(...completionsMap, 5);

    return (
      <div className="flex items-end justify-between h-40 pt-4 px-2 border-b border-[#2d2d2d] pb-2">
        {weekDays.map((day, i) => {
          const heightPercent = (completionsMap[i] / maxVal) * 80 + 10;
          return (
            <div key={day} className="flex flex-col items-center flex-1 gap-1">
              <div className="text-[10px] text-zinc-500 font-mono">{completionsMap[i]}</div>
              <div className="w-full max-w-[22px] bg-indigo-950/40 rounded border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/20 transition-all duration-300 flex items-end overflow-hidden" style={{ height: '100px' }}>
                <div 
                  className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-sm"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-[#888] font-sans mt-1">{day}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const copyFileToClipboard = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    showToast(`Copied source code for ${filename} to clipboard!`, "success");
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const selectTab = (name: string) => {
    if (!openTabs.includes(name)) {
      setOpenTabs(prev => [...prev, name]);
    }
    setActiveTab(name);
  };

  const closeTab = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== name);
    setOpenTabs(newTabs);
    if (activeTab === name && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1]);
    }
  };

  const executeVSCodeCommand = (commandName: string) => {
    setCommandPaletteOpen(false);
    addLog(`Command Trigger: vscode.commands.executeCommand('${commandName}')`);
    
    switch (commandName) {
      case 'Focus Recovery: Start Session':
        startRecoverySession();
        break;
      case 'Focus Recovery: Show Statistics':
        selectTab('❤️ Dashboard');
        break;
      case 'Focus Recovery: Change Difficulty':
        selectTab('⚙️ Settings');
        break;
      case 'Focus Recovery: Reset Progress':
        handleResetProgress();
        break;
      case 'Focus Recovery: Show Source Code Explorer':
        setActiveSidebarTab('explorer');
        break;
      case 'Focus Recovery: Read Developer Manual':
        selectTab('README.md');
        break;
      default:
        break;
    }
  };

  const simulateAlarm = (type: 'morning' | 'evening') => {
    const label = type === 'morning' ? "Morning Focus and Wellness" : "Evening Focus Recovery";
    const timeLabel = type === 'morning' ? morningReminder : eveningReminder;
    
    playSound(440, 'triangle', 0.2);
    setTimeout(() => playSound(554, 'triangle', 0.2), 150);
    setTimeout(() => playSound(659, 'triangle', 0.3), 300);

    showToast(
      `[Alarm Schedule] It's ${timeLabel}. Your scheduled ${label} is active. Ready to stretch?`,
      'info',
      [
        { label: "Start Session", action: () => startRecoverySession() },
        { label: "Snooze 10m", action: () => {
          showToast("Reminder snoozed for 10 minutes.", "info");
          addLog("Alarm snoozed by user.");
        }}
      ]
    );
  };

  // Stylized Syntax Highlighting parser
  function highlightCodeHTML(code: string, language: string) {
    if (language === 'json') {
      return code
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '<span class="text-[#ce9178]">$1</span>')
        .replace(/(true|false)/g, '<span class="text-[#569cd6]">$1</span>')
        .replace(/(null)/g, '<span class="text-[#569cd6]">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="text-[#b5cea8]">$1</span>')
        .replace(/(".*?")\s*:/g, '<span class="text-[#9cdcfe]">$1</span>:');
    }
    if (language === 'typescript') {
      return code
        .replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="text-[#6a9955]">$1</span>')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\'])*'|`[\s\S]*?`)/g, '<span class="text-[#ce9178]">$1</span>')
        .replace(/\b(import|export|const|let|var|function|class|interface|type|extends|implements|return|if|else|for|while|try|catch|new|this|async|await|private|public|static|readonly|from|as|default|string|number|boolean|void|any|interface|export)\b/g, '<span class="text-[#569cd6]">$1</span>')
        .replace(/\b(vscode|ProgressManager|SessionManager|ReminderManager|Dashboard|EXTENSION_FILES|UserProgress|SessionRecord|ProgressionLevel|PROGRESSION_LEVELS|clearInterval|setInterval|setTimeout)\b/g, '<span class="text-[#4ec9b0]">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="text-[#b5cea8]">$1</span>');
    }
    return code;
  }

  // Keybindings handler (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // UI Code View Rendering Helper
  const renderFileEditor = (file: ExtensionFile) => {
    const highlighted = highlightCodeHTML(file.content, file.language);
    const lineCount = file.content.split('\n').length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
      <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs overflow-hidden">
        {/* Sub-header actions */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#252526] border-b border-[#2d2d2d] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-indigo-400 font-sans font-bold px-1.5 py-0.5 bg-indigo-950/40 rounded border border-indigo-800/20 uppercase tracking-wider text-[10px]">
              {file.language}
            </span>
            <span className="text-[#a1a1aa] font-sans text-[11px] italic hidden sm:inline">{file.description}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => copyFileToClipboard(file.name, file.content)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2d2d2d] hover:bg-[#333333] text-[#cccccc] font-sans font-medium rounded transition border border-[#3e4147] cursor-pointer"
            >
              {copiedFile === file.name ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copiedFile === file.name ? "Copied" : "Copy Code"}</span>
            </button>
            <button 
              onClick={() => downloadSingleFile(file)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2d2d2d] hover:bg-[#333333] text-indigo-400 font-sans font-medium rounded transition border border-indigo-900/30 cursor-pointer"
              title="Download standalone file directly"
            >
              <Download size={11} />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Highlighted code pane */}
        <div className="flex flex-1 overflow-auto leading-relaxed p-4 select-text selection:bg-indigo-900/50">
          <div className="text-right text-[#5a5a5a] pr-4 select-none border-r border-[#2d2d2d] shrink-0 text-[11px] leading-5 min-w-[2rem]">
            {lineNumbers.map(n => <div key={n}>{n}</div>)}
          </div>
          <pre className="pl-4 overflow-x-auto text-[12px] leading-5 w-full select-text whitespace-pre scrollbar-none" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      </div>
    );
  };

  // Progress Percent calculation
  const completionsAtCurrent = history.filter(
    h => h.level === currentLevel && h.completed
  ).length;
  const progressPercent = Math.min((completionsAtCurrent / 5) * 100, 100);

  return (
    <div className="flex flex-col h-screen bg-[#181818] text-[#cccccc] font-sans overflow-hidden select-none">
      
      {/* 1. TOP UTILITY STATUS BAR AND SEARCH CONTROL */}
      <header className="flex items-center justify-between h-12 bg-[#2d2d2d] border-b border-[#1a1a1a] px-4 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-7 h-7 bg-indigo-900 rounded text-indigo-300 border border-indigo-500/30">
            <Heart size={14} className={isSessionRunning ? "animate-pulse text-red-400" : "text-indigo-400"} />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-2">
              FOCUS RECOVERY <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 bg-indigo-950/60 text-indigo-300 rounded border border-indigo-700/20">EXTENSION DEV HUB</span>
            </span>
            <p className="text-[10px] text-zinc-500 font-mono -mt-0.5">Physical Posture, Wellness & Breaks inside VS Code</p>
          </div>
        </div>

        {/* Command Palette trigger */}
        <div className="relative w-full max-w-sm sm:max-w-md mx-3">
          <button 
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full h-7 px-3 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3e4147] rounded text-left text-xs text-zinc-400 transition"
          >
            <div className="flex items-center gap-2">
              <Search size={12} className="text-zinc-500" />
              <span>Search Extension Commands...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] bg-[#2d2d2d] border border-[#444] rounded text-zinc-400 font-mono select-none">
              Ctrl+Shift+P
            </kbd>
          </button>

          <AnimatePresence>
            {commandPaletteOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCommandPaletteOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.1 }}
                  className="absolute left-0 right-0 top-8 bg-[#252526] border border-[#3e4147] rounded-md shadow-2xl z-50 overflow-hidden text-xs text-[#cccccc]"
                >
                  <div className="p-2 border-b border-[#3e4147] bg-[#1e1e1e]">
                    <input 
                      type="text"
                      placeholder="Type extension command name..."
                      value={commandPaletteSearch}
                      onChange={(e) => setCommandPaletteSearch(e.target.value)}
                      className="w-full h-7 px-2.5 bg-[#252526] text-white border border-[#3e4147] rounded outline-none focus:border-indigo-500 text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {[
                      { label: "Focus Recovery: Start Session", desc: "Launches the posture & break visual countdown" },
                      { label: "Focus Recovery: Show Statistics", desc: "Opens the visual analytics logs & streak metrics dashboard" },
                      { label: "Focus Recovery: Change Difficulty", desc: "Allows selection between progressive difficulty tiers" },
                      { label: "Focus Recovery: Reset Progress", desc: "Clears tracked records and restores beginner configurations" },
                      { label: "Focus Recovery: Show Source Code Explorer", desc: "Navigates workspace explorer displaying native TS files" },
                      { label: "Focus Recovery: Read Developer Manual", desc: "Loads installation guide" }
                    ]
                      .filter(cmd => cmd.label.toLowerCase().includes(commandPaletteSearch.toLowerCase()))
                      .map((cmd) => (
                        <button
                          key={cmd.label}
                          onClick={() => executeVSCodeCommand(cmd.label)}
                          className="w-full px-4 py-2 text-left border-b border-[#2d2d2d] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-100">{cmd.label}</span>
                            <span className="text-[10px] text-zinc-400">{cmd.desc}</span>
                          </div>
                          <ChevronRight size={11} className="text-zinc-600" />
                        </button>
                      ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => simulateAlarm('morning')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 border border-amber-900/30 rounded font-medium transition cursor-pointer"
          >
            <Clock size={11} />
            <span className="hidden sm:inline">Test Morning Alarm</span>
          </button>
          <button 
            onClick={() => simulateAlarm('evening')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-300 border border-indigo-900/30 rounded font-medium transition cursor-pointer"
          >
            <Clock size={11} />
            <span className="hidden sm:inline">Test Evening Alarm</span>
          </button>
        </div>
      </header>

      {/* 2. BODY SECTION */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ACTIVITY SIDE-RAIL */}
        <nav className="w-12 bg-[#181818] flex flex-col justify-between items-center py-3 border-r border-[#1a1a1a] shrink-0">
          <div className="flex flex-col gap-4 w-full items-center">
            <button 
              onClick={() => setActiveSidebarTab('explorer')}
              className={`relative p-2.5 rounded transition ${activeSidebarTab === 'explorer' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="File Explorer (Native Source)"
            >
              {activeSidebarTab === 'explorer' && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500" />}
              <Files size={18} />
            </button>

            <button 
              onClick={() => {
                setActiveSidebarTab('stats');
                selectTab('❤️ Dashboard');
              }}
              className={`relative p-2.5 rounded transition ${activeSidebarTab === 'stats' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Visual Dashboard Simulator"
            >
              {activeSidebarTab === 'stats' && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500" />}
              <Heart size={18} className={isSessionRunning ? "animate-pulse text-rose-500" : ""} />
            </button>

            <button 
              onClick={() => {
                setActiveSidebarTab('settings');
                selectTab('⚙️ Settings');
              }}
              className={`relative p-2.5 rounded transition ${activeSidebarTab === 'settings' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Extension Preferences"
            >
              {activeSidebarTab === 'settings' && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500" />}
              <Settings size={18} />
            </button>

            <button 
              onClick={() => setActiveSidebarTab('terminal')}
              className={`relative p-2.5 rounded transition ${activeSidebarTab === 'terminal' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Terminal Console Log Logs"
            >
              {activeSidebarTab === 'terminal' && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500" />}
              <Terminal size={18} />
            </button>

            <button 
              onClick={() => {
                setActiveSidebarTab('readme');
                selectTab('README.md');
              }}
              className={`relative p-2.5 rounded transition ${activeSidebarTab === 'readme' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Developer User Guide"
            >
              {activeSidebarTab === 'readme' && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500" />}
              <BookOpen size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-300 text-xs font-semibold" title="VS Code Extension Dev">
              <User size={13} />
            </div>
          </div>
        </nav>

        {/* SIDEBAR VIEWPORT */}
        <aside className="w-60 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col overflow-hidden shrink-0">
          
          {/* File Explorer tab */}
          {activeSidebarTab === 'explorer' && (
            <div className="flex flex-col h-full text-xs">
              <div className="px-4 py-2 border-b border-[#2d2d2d] font-bold text-[#888888] uppercase tracking-wider text-[10px] flex justify-between items-center bg-[#1e1e1e]">
                <span>Extension Code Files</span>
                <span className="text-[9px] px-1 bg-[#2b2b2b] rounded">SRC</span>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <div 
                  onClick={() => setExpandedFolders(prev => ({ ...prev, root: !prev.root }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer font-bold text-white font-mono text-[11px]"
                >
                  {expandedFolders.root ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <FolderOpen size={13} className="text-indigo-400" />
                  <span>focus-recovery</span>
                </div>

                {expandedFolders.root && (
                  <div className="pl-4">
                    {/* manifest */}
                    <div 
                      onClick={() => selectTab('package.json')}
                      className={`flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2a2a] cursor-pointer font-mono ${activeTab === 'package.json' ? 'bg-[#2d2d2d] text-indigo-400 border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                    >
                      <FileText size={12} className="text-amber-500" />
                      <span>package.json</span>
                    </div>

                    {/* compiler config */}
                    <div 
                      onClick={() => selectTab('tsconfig.json')}
                      className={`flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2a2a] cursor-pointer font-mono ${activeTab === 'tsconfig.json' ? 'bg-[#2d2d2d] text-indigo-400 border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                    >
                      <File size={12} className="text-emerald-400" />
                      <span>tsconfig.json</span>
                    </div>

                    {/* read manual */}
                    <div 
                      onClick={() => selectTab('README.md')}
                      className={`flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2a2a] cursor-pointer font-mono ${activeTab === 'README.md' ? 'bg-[#2d2d2d] text-indigo-400 border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                    >
                      <FileText size={12} className="text-sky-400" />
                      <span>README.md</span>
                    </div>

                    {/* src folder */}
                    <div 
                      onClick={() => setExpandedFolders(prev => ({ ...prev, src: !prev.src }))}
                      className="flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2a2a] cursor-pointer text-[#cccccc] mt-1 font-bold font-mono"
                    >
                      {expandedFolders.src ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <Folder size={13} className="text-indigo-400" />
                      <span>src</span>
                    </div>

                    {expandedFolders.src && (
                      <div className="pl-3 border-l border-[#2d2d2d] ml-4">
                        {[
                          { name: 'types.ts', color: 'text-sky-400' },
                          { name: 'progressManager.ts', color: 'text-indigo-400' },
                          { name: 'sessionManager.ts', color: 'text-indigo-400' },
                          { name: 'reminderManager.ts', color: 'text-indigo-400' },
                          { name: 'dashboard.ts', color: 'text-indigo-400' },
                          { name: 'extension.ts', color: 'text-amber-400' }
                        ].map(f => (
                          <div 
                            key={f.name}
                            onClick={() => selectTab(`src/${f.name}`)}
                            className={`flex items-center gap-1.5 px-2 py-1 hover:bg-[#2a2a2a] cursor-pointer font-mono ${activeTab === `src/${f.name}` ? 'bg-[#2d2d2d] text-indigo-400 border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                          >
                            <FileText size={11} className={f.color} />
                            <span>{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#181818] border-t border-[#2d2d2d] flex flex-col gap-2">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-sans">
                  <Info size={10} />
                  <span>Download zip or export layout</span>
                </div>
                <button 
                  onClick={startRecoverySession}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition text-[11px] cursor-pointer"
                >
                  <Play size={10} fill="currentColor" />
                  <span>Test Run Extension</span>
                </button>
              </div>
            </div>
          )}

          {/* Stats Dashboard tab */}
          {activeSidebarTab === 'stats' && (
            <div className="flex flex-col h-full text-xs p-4 gap-4">
              <span className="font-bold text-[#888888] uppercase tracking-wider text-[10px]">Extension Metrics</span>
              
              <div className="p-3 bg-[#181818] border border-[#2d2d2d] rounded flex flex-col gap-1">
                <span className="text-zinc-500 text-[10px]">CURRENT LEVEL</span>
                <span className="text-base font-bold text-white">{activeLevelConfig.displayName}</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1">Hold: {activeLevelConfig.holdDuration}s • Reps: {activeLevelConfig.reps}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#181818] border border-[#2d2d2d] rounded flex flex-col">
                  <span className="text-zinc-500 text-[9px] uppercase">STREAK</span>
                  <span className="text-sm font-bold text-white">{currentStreak} Days</span>
                </div>
                <div className="p-2.5 bg-[#181818] border border-[#2d2d2d] rounded flex flex-col">
                  <span className="text-zinc-500 text-[9px] uppercase">CYCLES</span>
                  <span className="text-sm font-bold text-white">{totalSessions} Sessions</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <span className="text-zinc-500 text-[10px] font-bold block mb-2 uppercase">Exercise Guidelines</span>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded text-[11px] leading-relaxed text-zinc-400">
                  Follow hold durations carefully to align the spine, release upper traps, and perform eye focus adjustments during rest.
                </div>
              </div>

              <button 
                onClick={startRecoverySession}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-[11px] transition cursor-pointer"
              >
                Launch Simulated Cycle
              </button>
            </div>
          )}

          {/* Settings Tab */}
          {activeSidebarTab === 'settings' && (
            <div className="flex flex-col h-full text-xs p-4 gap-3">
              <span className="font-bold text-[#888888] uppercase tracking-wider text-[10px] mb-1">Configuration Settings</span>

              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 font-mono text-[10px]">focusRecovery.morningReminder</span>
                <input 
                  type="text" 
                  value={morningReminder} 
                  onChange={(e) => {
                    setMorningReminder(e.target.value);
                    saveConfigToLocal('morning', e.target.value);
                    addLog(`Config changed: morningReminder = '${e.target.value}'`);
                  }}
                  className="w-full bg-[#181818] border border-[#3e4147] rounded p-1.5 text-white outline-none focus:border-indigo-500 text-[11px] font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 font-mono text-[10px]">focusRecovery.eveningReminder</span>
                <input 
                  type="text" 
                  value={eveningReminder} 
                  onChange={(e) => {
                    setEveningReminder(e.target.value);
                    saveConfigToLocal('evening', e.target.value);
                    addLog(`Config changed: eveningReminder = '${e.target.value}'`);
                  }}
                  className="w-full bg-[#181818] border border-[#3e4147] rounded p-1.5 text-white outline-none focus:border-indigo-500 text-[11px] font-mono"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[#2d2d2d] mt-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Adaptive Progression</span>
                  <p className="text-[9px] text-zinc-500 leading-tight">Increases level every 5 sessions</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoProgress} 
                  onChange={handleToggleAutoProgress}
                  className="cursor-pointer accent-indigo-500"
                />
              </div>

              {!autoProgress && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-zinc-400 font-mono text-[10px]">focusRecovery.difficulty override</span>
                  <select 
                    value={difficulty}
                    onChange={(e) => handleChangeManualDifficulty(e.target.value)}
                    className="w-full bg-[#181818] border border-[#3e4147] rounded p-1.5 text-white outline-none text-[11px]"
                  >
                    {PROGRESSION_LEVELS.map(l => (
                      <option key={l.displayName} value={l.displayName}>{l.displayName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-t border-[#2d2d2d]">
                <span className="font-semibold text-white">Soundless Alarms</span>
                <input 
                  type="checkbox" 
                  checked={enableNotifications} 
                  onChange={(e) => {
                    setEnableNotifications(e.target.checked);
                    saveConfigToLocal('enable_notifs', e.target.checked);
                    addLog(`Config changed: enableNotifications = ${e.target.checked}`);
                  }}
                  className="cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[#2d2d2d]">
                <span className="font-semibold text-white">Status Bar Heart</span>
                <input 
                  type="checkbox" 
                  checked={enableStatusBar} 
                  onChange={(e) => {
                    setEnableStatusBar(e.target.checked);
                    saveConfigToLocal('enable_status', e.target.checked);
                    addLog(`Config changed: enableStatusBar = ${e.target.checked}`);
                  }}
                  className="cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-[#2d2d2d] flex flex-col gap-1.5 mt-2">
                <button 
                  onClick={handleResetProgress}
                  className="w-full py-1 text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 rounded text-[10px] transition cursor-pointer"
                >
                  Clear Extension History
                </button>
              </div>
            </div>
          )}

          {/* Terminal tab info */}
          {activeSidebarTab === 'terminal' && (
            <div className="flex flex-col h-full text-xs p-4 gap-3">
              <span className="font-bold text-[#888888] uppercase tracking-wider text-[10px]">Active Developer Console</span>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Check runtime notifications, event triggers, telemetry loops, and local data compilation logs here.
              </p>
              <button 
                onClick={() => setTerminalLogs(["[Focus Recovery] Terminal logs cleared."])}
                className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] text-zinc-300 border border-zinc-700 transition cursor-pointer"
              >
                Clear Terminal Stream
              </button>
            </div>
          )}

          {/* User manual quick links */}
          {activeSidebarTab === 'readme' && (
            <div className="flex flex-col h-full text-xs p-4 gap-3">
              <span className="font-bold text-[#888888] uppercase tracking-wider text-[10px]">Developer Guide</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Learn how to compile, side-load, and test this extension directly on your computer's native VS Code setup.
              </p>
              <button 
                onClick={() => selectTab('README.md')}
                className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-indigo-400 border border-zinc-700 transition font-medium cursor-pointer"
              >
                Open README.md Manual
              </button>
            </div>
          )}
        </aside>

        {/* 3. CENTER / RIGHT WORKSPACE */}
        <main className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
          
          {/* TAB HEADER BAR */}
          <div className="flex items-center justify-between h-9 bg-[#252526] border-b border-[#181818] overflow-x-auto scrollbar-none shrink-0">
            <div className="flex items-center h-full">
              {openTabs.map(tab => {
                const isActive = activeTab === tab;
                return (
                  <div 
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab.includes('src/')) {
                        setActiveSidebarTab('explorer');
                      } else if (tab === '❤️ Dashboard') {
                        setActiveSidebarTab('stats');
                      } else if (tab === '⚙️ Settings') {
                        setActiveSidebarTab('settings');
                      } else if (tab === 'README.md') {
                        setActiveSidebarTab('readme');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-4 h-full border-r border-[#1e1e1e] cursor-pointer text-xs transition-colors ${isActive ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-indigo-500' : 'bg-[#2d2d2d] hover:bg-[#282828] text-zinc-400'}`}
                  >
                    <span className="text-[11px] font-mono">{tab.replace('src/', '')}</span>
                    <button 
                      onClick={(e) => closeTab(e, tab)}
                      className="p-0.5 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-300 transition"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE TAB MAIN RENDER CONTAINER */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* README View tab */}
              {activeTab === 'README.md' && (
                <motion.div 
                  key="readme"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6 md:p-10 text-zinc-300 leading-relaxed bg-[#1e1e1e]"
                >
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="border-b border-[#2d2d2d] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          ❤️ Focus Recovery Extension
                        </h1>
                        <p className="text-zinc-400 text-xs mt-1">A pure installable Visual Studio Code extension for workspace physical wellness.</p>
                      </div>
                      <button 
                        onClick={() => {
                          EXTENSION_FILES.forEach(file => downloadSingleFile(file));
                          showToast("Downloaded all extension files in a batch!", "success");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-xs transition cursor-pointer shrink-0"
                      >
                        <Download size={13} />
                        <span>Download Extension Bundle</span>
                      </button>
                    </div>

                    <div className="bg-indigo-950/20 border border-indigo-800/20 rounded-lg p-4 flex gap-3 text-xs text-indigo-300">
                      <AlertCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block mb-1">Local Development Workspace</span>
                        This interface lets you explore the complete extension architecture, copy individual file sources, and test the code interactively before compiling. To export the full bundle, use the AI Studio **Export as ZIP** option in the settings menu or batch download using the button above.
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">How to Install & Run Privately in VS Code</h2>
                      <ol className="list-decimal pl-5 text-xs text-zinc-400 space-y-3.5">
                        <li>
                          <strong className="text-zinc-200">Extract Workspace:</strong> Copy the code files from this explorer or download the standalone bundle ZIP.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Open Directory in VS Code:</strong> Go to <code className="px-1 py-0.5 bg-zinc-800 rounded font-mono text-[11px] text-zinc-300">File &gt; Open Folder...</code> and open the standalone directory.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Install Dependencies:</strong> Launch the VS Code terminal (<code className="px-1 py-0.5 bg-zinc-800 rounded font-mono text-[11px]">Ctrl+~</code>) and run:
                          <pre className="mt-1.5 p-2 bg-[#121212] rounded text-indigo-300 font-mono text-[11px] select-all">npm install</pre>
                        </li>
                        <li>
                          <strong className="text-zinc-200">Compile Source Code:</strong> Compile TypeScript files:
                          <pre className="mt-1.5 p-2 bg-[#121212] rounded text-indigo-300 font-mono text-[11px] select-all">npm run compile</pre>
                        </li>
                        <li>
                          <strong className="text-zinc-200">Debug and Run:</strong> Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300 text-[10px]">F5</kbd> on your keyboard. This opens a sandbox **[Extension Development Host]** window with the active extension running!
                        </li>
                      </ol>
                    </div>

                    <div className="pt-4 space-y-3">
                      <h2 className="text-base font-bold text-white border-l-2 border-indigo-500 pl-3">Testing Commands Inside Host</h2>
                      <p className="text-xs text-zinc-400">
                        In the newly launched extension development host window, open the Command Palette with <code className="px-1 py-0.5 bg-zinc-800 rounded font-mono text-[11px]">Ctrl+Shift+P</code> (or <code className="px-1 py-0.5 bg-zinc-800 rounded font-mono text-[11px]">Cmd+Shift+P</code> on macOS) to trigger these actions:
                      </p>
                      <ul className="list-disc pl-5 text-xs text-zinc-400 space-y-2">
                        <li><strong className="text-zinc-200">Focus Recovery: Start Session</strong> - Initiates holding intervals.</li>
                        <li><strong className="text-zinc-200">Focus Recovery: Show Statistics</strong> - Opens the integrated visual webview statistics dashboard.</li>
                        <li><strong className="text-zinc-200">Focus Recovery: Change Difficulty</strong> - Configures static difficulty levels manually.</li>
                        <li><strong className="text-zinc-200">Focus Recovery: Export Progress</strong> - Generates backup JSON.</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Stats Visual Webview Panel Simulator */}
              {activeTab === '❤️ Dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-4 md:p-6 bg-[#1e1e1e] text-[#cccccc]"
                >
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Simulator Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-lg font-bold text-white">❤️ Focus Recovery Dashboard</h1>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950/60 text-emerald-300 border border-emerald-800/30 rounded-full">Webview Simulator</span>
                        </div>
                        <p className="text-zinc-500 text-xs">High-fidelity webview rendering exactly as displayed in VS Code's editor columns.</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isSessionRunning ? (
                          <button 
                            onClick={cancelActiveSession}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-xs transition cursor-pointer"
                          >
                            Cancel Active Session
                          </button>
                        ) : (
                          <button 
                            onClick={startRecoverySession}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-xs transition cursor-pointer"
                          >
                            Start Focus Session
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setActiveSidebarTab('settings');
                            selectTab('⚙️ Settings');
                          }}
                          className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#333333] text-zinc-300 rounded text-xs transition border border-[#3e4147]"
                        >
                          Settings
                        </button>
                      </div>
                    </div>

                    {/* Timer Interface during active simulation */}
                    {isSessionRunning && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                            <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                              Active Routine Phase: {sessionPhase.toUpperCase()}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-white mt-1">
                            {sessionPhase === 'prepare' && "Prepare Body & Get Ready..."}
                            {sessionPhase === 'hold' && `HOLD Phase (Repetition ${sessionRep}/${activeLevelConfig.reps})`}
                            {sessionPhase === 'rest' && `RELAX & Look Away (Repetition ${sessionRep}/${activeLevelConfig.reps})`}
                          </h2>
                          <p className="text-zinc-400 text-xs mt-0.5">
                            {sessionPhase === 'prepare' && "Find a neutral spine alignment. Lower shoulders."}
                            {sessionPhase === 'hold' && "Hold the active physical stretching position silently."}
                            {sessionPhase === 'rest' && "Release hold, relax upper traps, and focus eyes on a distant point."}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="text-3xl font-extrabold text-white font-mono tracking-tight bg-[#121212] px-4 py-2 rounded-lg border border-zinc-800">
                              {sessionTimeRemaining}s
                            </span>
                          </div>
                          <button 
                            onClick={cancelActiveSession}
                            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-950/60 text-red-400 rounded-lg border border-red-900/30 text-xs font-semibold transition"
                          >
                            Abrupt End
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Stats Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-[#252526] border border-[#2d2d2d] rounded-lg">
                        <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">Current Target Goal</span>
                        <span className="text-xl font-extrabold text-white block mt-1">{activeLevelConfig.displayName}</span>
                        <div className="h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[10px] text-zinc-500">
                          <span>Next Level Progress</span>
                          <span>{completionsAtCurrent} / 5 Sessions</span>
                        </div>
                      </div>

                      <div className="p-4 bg-[#252526] border border-[#2d2d2d] rounded-lg">
                        <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">Daily Habit Streak</span>
                        <span className="text-xl font-extrabold text-white block mt-1">{currentStreak} Days</span>
                        <p className="text-[10px] text-zinc-500 mt-2">Maintain physical fitness daily inside your local workspace.</p>
                      </div>

                      <div className="p-4 bg-[#252526] border border-[#2d2d2d] rounded-lg">
                        <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">Completed Sessions</span>
                        <span className="text-xl font-extrabold text-white block mt-1">{totalSessions} Sessions</span>
                        <p className="text-[10px] text-zinc-500 mt-2">Last completion: {lastCompletedSession ? new Date(lastCompletedSession).toLocaleDateString() : 'Never'}</p>
                      </div>
                    </div>

                    {/* Charts & Guidelines split layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-4">
                        <div className="p-4 bg-[#252526] border border-[#2d2d2d] rounded-lg">
                          <span className="text-zinc-400 text-xs font-bold block uppercase tracking-wider mb-2">Simulated Week Overview</span>
                          {renderWeeklyActivityChart()}
                        </div>

                        {/* Recent History log */}
                        <div className="p-4 bg-[#252526] border border-[#2d2d2d] rounded-lg">
                          <span className="text-zinc-400 text-xs font-bold block uppercase tracking-wider mb-3">Recent Activity Logs</span>
                          <div className="space-y-2">
                            {history.length > 0 ? (
                              history.slice(-4).reverse().map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2.5 bg-[#1e1e1e] border border-[#2d2d2d] rounded">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-white">Level {item.level} Session</span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString()} • {item.reps} reps
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold tracking-wide text-emerald-400 px-2 py-0.5 bg-emerald-950/40 rounded border border-emerald-900/20 uppercase">
                                    COMPLETED
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-6 text-zinc-500 text-xs italic">
                                No completed cycles logged. Click Start Session to log physical cycles.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Side instructions manual */}
                      <div className="space-y-4">
                        <div className="p-4 bg-indigo-950/10 border border-indigo-900/20 rounded-lg text-xs leading-relaxed">
                          <span className="text-white font-bold block mb-2">Posture Guidelines</span>
                          <ol className="space-y-3.5 text-zinc-400 list-decimal pl-4">
                            <li><strong className="text-zinc-200">Align Spine:</strong> Tuck chin slightly, pull shoulders back and down. Don't slouch.</li>
                            <li><strong className="text-zinc-200">Hold Duration:</strong> Keep eyes active, breathing deeply through the chest.</li>
                            <li><strong className="text-zinc-200">Optical Rest:</strong> Look away from monitors and focus on distant object (&gt;20 feet away) to ease ocular focus fatigue.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Settings preferences view tab */}
              {activeTab === '⚙️ Settings' && (
                <div className="h-full overflow-y-auto p-6 md:p-10 text-zinc-300">
                  <div className="max-w-xl mx-auto space-y-6">
                    <div>
                      <h1 className="text-lg font-bold text-white">⚙️ Focus Recovery Preferences</h1>
                      <p className="text-zinc-500 text-xs">Local VS Code configurations mapping to user settings.</p>
                    </div>

                    <div className="p-4 bg-[#252526] border border-[#2d2d2d] rounded-lg space-y-4 text-xs">
                      <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-3">
                        <div>
                          <span className="text-white font-bold block">Morning Wellness Alarm</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Time of morning reminders.</p>
                        </div>
                        <input 
                          type="text" 
                          value={morningReminder} 
                          onChange={(e) => {
                            setMorningReminder(e.target.value);
                            saveConfigToLocal('morning', e.target.value);
                            addLog(`Config updated: morningReminder = '${e.target.value}'`);
                          }}
                          className="bg-[#1e1e1e] border border-[#3e4147] rounded p-1.5 text-white outline-none focus:border-indigo-500 text-[11px] font-mono text-center w-20"
                        />
                      </div>

                      <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-3">
                        <div>
                          <span className="text-white font-bold block">Evening Wellness Alarm</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Time of evening focus recovery prompts.</p>
                        </div>
                        <input 
                          type="text" 
                          value={eveningReminder} 
                          onChange={(e) => {
                            setEveningReminder(e.target.value);
                            saveConfigToLocal('evening', e.target.value);
                            addLog(`Config updated: eveningReminder = '${e.target.value}'`);
                          }}
                          className="bg-[#1e1e1e] border border-[#3e4147] rounded p-1.5 text-white outline-none focus:border-indigo-500 text-[11px] font-mono text-center w-20"
                        />
                      </div>

                      <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-3">
                        <div>
                          <span className="text-white font-bold block">Adaptive Progression Logic</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Automatically advances level every 5 completions.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={autoProgress} 
                          onChange={handleToggleAutoProgress}
                          className="cursor-pointer accent-indigo-500 w-4 h-4"
                        />
                      </div>

                      {!autoProgress && (
                        <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-3">
                          <div>
                            <span className="text-white font-bold block">Manual Override Level</span>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Select difficulty override level.</p>
                          </div>
                          <select 
                            value={difficulty}
                            onChange={(e) => handleChangeManualDifficulty(e.target.value)}
                            className="bg-[#1e1e1e] border border-[#3e4147] rounded p-1 text-white outline-none text-[11px]"
                          >
                            {PROGRESSION_LEVELS.map(l => (
                              <option key={l.displayName} value={l.displayName}>{l.displayName}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white font-bold block">Soundless Alarms notifications</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Trigger visual popup alerts without sound.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={enableNotifications} 
                          onChange={(e) => {
                            setEnableNotifications(e.target.checked);
                            saveConfigToLocal('enable_notifs', e.target.checked);
                            addLog(`Config updated: enableNotifications = ${e.target.checked}`);
                          }}
                          className="cursor-pointer accent-indigo-500 w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Files tab content rendering */}
              {activeTab.includes('src/') || activeTab === 'package.json' || activeTab === 'tsconfig.json' ? (
                (() => {
                  const matchedFile = EXTENSION_FILES.find(f => f.path === activeTab.replace('src/', 'src/'));
                  const realFile = matchedFile || EXTENSION_FILES.find(f => f.name === activeTab);
                  return realFile ? renderFileEditor(realFile) : <div className="p-10 text-zinc-500 italic">File not found.</div>;
                })()
              ) : null}
            </AnimatePresence>
          </div>

          {/* 4. BOTTOM DOCKED DEVELOPER CONSOLE LOGS */}
          <footer className="h-36 bg-[#181818] border-t border-[#2d2d2d] flex flex-col shrink-0 overflow-hidden text-xs">
            <div className="h-8 bg-[#1e1e1e] border-b border-[#2d2d2d] px-4 flex justify-between items-center text-[#999999]">
              <span className="font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                <Terminal size={11} className="text-zinc-500" />
                <span>Simulated VS Code Output Logs</span>
              </span>
              <button 
                onClick={() => setTerminalLogs(["[Focus Recovery] Stream refreshed."])}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium font-sans cursor-pointer"
              >
                Clear Log
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-zinc-400 bg-[#121212] space-y-1 select-text scrollbar-none">
              {terminalLogs.map((log, index) => (
                <div key={index} className="leading-5">
                  <span className="text-indigo-400 font-semibold select-none mr-2">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </footer>

          {/* SIMULATED STATUS BAR SHORTCUT (Right Column Corner) */}
          {enableStatusBar && (
            <div className="h-5 bg-[#007acc] text-white text-[11px] flex items-center justify-between px-3 absolute bottom-0 left-0 right-0 z-10 font-sans">
              <span className="font-medium">Developer Active Mode</span>
              <button 
                onClick={isSessionRunning ? cancelActiveSession : startRecoverySession}
                className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition font-mono text-[10px]"
              >
                <Heart size={10} fill="currentColor" className="text-rose-200" />
                <span>{isSessionRunning ? `Focus Phase (${sessionTimeRemaining}s)` : "Start Focus Recovery"}</span>
              </button>
            </div>
          )}

          {/* Hidden import launcher */}
          <input 
            type="file" 
            id="hidden-import-input" 
            className="hidden" 
            accept=".json" 
            onChange={handleImportData}
          />
        </main>
      </div>

      {/* 5. FLOATING VS CODE NOTIFICATION TOAST POPUPS */}
      <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#252526] border border-[#3e4147] text-[#cccccc] shadow-2xl p-4 rounded-md pointer-events-auto flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5">
                <Bell size={14} className="text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="text-xs font-sans leading-relaxed text-zinc-100">{toast.message}</div>
              </div>
              {toast.actions && toast.actions.length > 0 && (
                <div className="flex gap-2 justify-end mt-1">
                  {toast.actions.map(act => (
                    <button 
                      key={act.label}
                      onClick={() => {
                        act.action();
                        setToasts(prev => prev.filter(t => t.id !== toast.id));
                      }}
                      className="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[10px] font-semibold rounded font-sans cursor-pointer transition"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
