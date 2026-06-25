/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  Plus, 
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
  ChevronUp, 
  AlertCircle, 
  Cpu, 
  Sliders, 
  Volume2, 
  VolumeX, 
  User, 
  TrendingUp, 
  Calendar,
  FastForward,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EXTENSION_FILES, ExtensionFile } from './codeFiles';

// Wellness / Progression Level definitions
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
  // --- STATE ---
  const [activeSidebarTab, setActiveSidebarTab] = useState<'explorer' | 'stats' | 'settings' | 'terminal' | 'readme'>('explorer');
  const [openTabs, setOpenTabs] = useState<string[]>(['README.md', '❤️ Dashboard']);
  const [activeTab, setActiveTab] = useState<string>('README.md');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
    src: true,
  });

  // Settings state (mirrors focusRecovery.* settings)
  const [morningReminder, setMorningReminder] = useState<string>('08:00');
  const [eveningReminder, setEveningReminder] = useState<string>('19:00');
  const [autoProgress, setAutoProgress] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<string>('Beginner (Level 1)');
  const [enableNotifications, setEnableNotifications] = useState<boolean>(true);
  const [enableStatusBar, setEnableStatusBar] = useState<boolean>(true);

  // User Stats & History (stored locally)
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [lastCompletedSession, setLastCompletedSession] = useState<string | null>(null);
  const [history, setHistory] = useState<ActivityRecord[]>([]);

  // Active Session Player
  const [isSessionRunning, setIsSessionRunning] = useState<boolean>(false);
  const [sessionPhase, setSessionPhase] = useState<'prepare' | 'hold' | 'rest' | 'complete' | 'none'>('none');
  const [sessionRep, setSessionRep] = useState<number>(1);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [isFastForward, setIsFastForward] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // UI state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [commandPaletteSearch, setCommandPaletteSearch] = useState<string>('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[Focus Recovery] Starting development host...",
    "[Focus Recovery] Extension loaded locally without cloud dependence.",
    "[Focus Recovery] Active listener loaded for scheduled reminders (08:00 AM, 07:00 PM)."
  ]);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- LOCAL PERSISTENCE ---
  useEffect(() => {
    // Load state from localStorage
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

    if (savedLevel) {setCurrentLevel(parseInt(savedLevel));}
    if (savedStreak) {setCurrentStreak(parseInt(savedStreak));}
    if (savedTotal) {setTotalSessions(parseInt(savedTotal));}
    if (savedLast) {setLastCompletedSession(savedLast);}
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        setHistory([]);
      }
    }

    if (savedMorning) {setMorningReminder(savedMorning);}
    if (savedEvening) {setEveningReminder(savedEvening);}
    if (savedAuto) {setAutoProgress(savedAuto === 'true');}
    if (savedDiff) {setDifficulty(savedDiff);}
    if (savedNotifs) {setEnableNotifications(savedNotifs === 'true');}
    if (savedStatus) {setEnableStatusBar(savedStatus === 'true');}
  }, []);

  const saveStatsToLocal = (lvl: number, strk: number, tot: number, last: string | null, hist: ActivityRecord[]) => {
    localStorage.setItem('fr_current_level', lvl.toString());
    localStorage.setItem('fr_current_streak', strk.toString());
    localStorage.setItem('fr_total_sessions', tot.toString());
    if (last) {localStorage.setItem('fr_last_completed', last);}
    localStorage.setItem('fr_history', JSON.stringify(hist));
  };

  const saveConfigToLocal = (key: string, value: any) => {
    localStorage.setItem(`fr_${key}`, value.toString());
  };

  // --- LOGGING ---
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // --- TOAST NOTIFICATIONS ---
  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', actions?: { label: string; action: () => void }[]) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, actions }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  };

  // --- CHIME AUDIO FEEDBACK ---
  const playSound = (freq: number, type: 'sine' | 'triangle' | 'sawtooth' = 'sine', duration = 0.15) => {
    if (isMuted) {return;}
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
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  };

  // --- ACTIVE SESSION PLAYBACK CORE ENGINE ---
  const activeLevelConfig = autoProgress 
    ? PROGRESSION_LEVELS.find(l => l.level === currentLevel) || PROGRESSION_LEVELS[0]
    : PROGRESSION_LEVELS.find(l => l.displayName === difficulty) || PROGRESSION_LEVELS[0];

  useEffect(() => {
    let intervalId: any = null;

    if (isSessionRunning) {
      if (sessionTimeRemaining > 0) {
        const speed = isFastForward ? 100 : 1000;
        intervalId = setInterval(() => {
          setSessionTimeRemaining(prev => prev - 1);
        }, speed);
      } else {
        // Handle phase transitions
        if (sessionPhase === 'prepare') {
          // Prepared, start hold 1
          playSound(660, 'triangle', 0.25);
          setSessionPhase('hold');
          setSessionTimeRemaining(activeLevelConfig.holdDuration);
          addLog(`Session Step: Hold posture active for Repetition ${sessionRep}/${activeLevelConfig.reps}`);
        } else if (sessionPhase === 'hold') {
          // Hold done, check if final rep
          if (sessionRep >= activeLevelConfig.reps) {
            // All reps completed!
            handleSessionCompleted(true);
          } else {
            // Relax Rest
            playSound(440, 'sine', 0.2);
            setSessionPhase('rest');
            setSessionTimeRemaining(activeLevelConfig.restDuration);
            addLog(`Session Step: Relaxing posture and ocular refocusing for Repetition ${sessionRep}/${activeLevelConfig.reps}`);
          }
        } else if (sessionPhase === 'rest') {
          // Rest done, start next hold
          playSound(523.25, 'triangle', 0.2);
          setSessionRep(prev => prev + 1);
          setSessionPhase('hold');
          setSessionTimeRemaining(activeLevelConfig.holdDuration);
          addLog(`Session Step: Hold posture active for Repetition ${sessionRep + 1}/${activeLevelConfig.reps}`);
        }
      }
    }

    return () => {
      if (intervalId) {clearInterval(intervalId);}
    };
  }, [isSessionRunning, sessionPhase, sessionTimeRemaining, isFastForward, sessionRep, activeLevelConfig]);

  const startRecoverySession = () => {
    setIsSessionRunning(true);
    setSessionPhase('prepare');
    setSessionRep(1);
    setSessionTimeRemaining(3); // 3 seconds preparation countdown
    addLog(`Initiating session: ${activeLevelConfig.displayName}. Prepare phase active.`);
    playSound(440, 'sawtooth', 0.15);

    // Auto-open Dashboard/Stats to see session or open a dedicated session editor tab
    if (!openTabs.includes('❤️ Dashboard')) {
      setOpenTabs(prev => [...prev, '❤️ Dashboard']);
    }
    setActiveTab('❤️ Dashboard');
  };

  const cancelActiveSession = () => {
    setIsSessionRunning(false);
    setSessionPhase('none');
    addLog("Active recovery session aborted by user request.");
    showToast("Focus Recovery session was cancelled.", "warning");
    playSound(220, 'sine', 0.4);
  };

  const handleSessionCompleted = (completed: boolean) => {
    setIsSessionRunning(false);
    setSessionPhase('none');
    playSound(880, 'triangle', 0.3);
    setTimeout(() => playSound(1318.51, 'triangle', 0.4), 150);

    const now = new Date();
    const isoString = now.toISOString();

    // Streak checking
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

    // Check level-up logic: increase level every 5 completed sessions under auto-progress
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

    // Update States
    setHistory(updatedHistory);
    setTotalSessions(newTotal);
    setLastCompletedSession(isoString);
    setCurrentStreak(newStreak);
    if (leveledUp) {
      setCurrentLevel(finalLevel);
      addLog(`CONGRATULATIONS: You advanced to Level ${finalLevel}! Your posture capacity is increasing.`);
      showToast(`Level Advanced! You are now Level ${finalLevel} (${PROGRESSION_LEVELS[finalLevel-1].displayName}).`, 'success');
    } else {
      addLog(`Focus recovery session logged successfully. Completed sessions: ${newTotal}`);
      showToast("Wellness recovery session completed! Wonderful job.", "success");
    }

    saveStatsToLocal(finalLevel, newStreak, newTotal, isoString, updatedHistory);
  };

  // --- MANUAL SETTINGS HANDLERS ---
  const handleToggleAutoProgress = () => {
    const nextVal = !autoProgress;
    setAutoProgress(nextVal);
    saveConfigToLocal('auto_progress', nextVal);
    addLog(`Config Update: focusRecovery.autoProgress set to ${nextVal}`);
    showToast(`Auto-progression is now ${nextVal ? 'enabled' : 'disabled'}.`);
  };

  const handleChangeManualDifficulty = (val: string) => {
    setDifficulty(val);
    saveConfigToLocal('difficulty', val);
    
    // Synchronize currentLevel with selected manual level index
    const index = PROGRESSION_LEVELS.findIndex(l => l.displayName === val);
    if (index !== -1) {
      setCurrentLevel(index + 1);
      saveStatsToLocal(index + 1, currentStreak, totalSessions, lastCompletedSession, history);
    }
    
    addLog(`Config Update: focusRecovery.difficulty override set to ${val}`);
    showToast(`Manual level set to ${val}`);
  };

  const handleResetProgress = () => {
    if (confirm("Reset focus progress, streak counts, and activity logs? This operation cannot be undone.")) {
      setCurrentLevel(1);
      setCurrentStreak(0);
      setTotalSessions(0);
      setLastCompletedSession(null);
      setHistory([]);
      saveStatsToLocal(1, 0, 0, null, []);
      addLog("Database Reset: Local statistics and globalState files successfully cleared.");
      showToast("Focus Recovery history has been completely reset.", "warning");
    }
  };

  const handleExportData = () => {
    const dataObj = {
      currentLevel,
      currentStreak,
      totalSessions,
      lastCompletedSession,
      autoProgress,
      difficulty,
      history
    };
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focus-recovery-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog("Export Complete: focusRecovery.globalState progress manifest outputted successfully.");
    showToast("Statistics export file downloaded.", "success");
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
            if (parsed.autoProgress !== undefined) {setAutoProgress(parsed.autoProgress);}
            if (parsed.difficulty !== undefined) {setDifficulty(parsed.difficulty);}
            
            saveStatsToLocal(
              parsed.currentLevel, 
              parsed.currentStreak || 0, 
              parsed.totalSessions || 0, 
              parsed.lastCompletedSession, 
              parsed.history
            );
            addLog("Import Success: GlobalState files imported correctly. Refreshed UI dashboard.");
            showToast("Focus Recovery history loaded successfully!", "success");
          } else {
            showToast("Invalid data structure inside JSON file.", "error");
          }
        } catch (err) {
          showToast("Failed to parse JSON file.", "error");
        }
      };
    }
  };

  // --- TAB CONTROLLER ---
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

  // --- DIRECT FILE REPLICATORS COPIERS ---
  const copyFileToClipboard = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    showToast(`Copied the source code for ${filename} to your clipboard!`, "success");
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // --- COMMAND PALETTE COMMAND ACTIONS ---
  const executeVSCodeCommand = (commandName: string) => {
    setCommandPaletteOpen(false);
    addLog(`Command Trigger: vscode.commands.executeCommand('${commandName}')`);
    
    switch (commandName) {
      case 'Focus Recovery: Start Session':
        startRecoverySession();
        break;
      case 'Focus Recovery: Show Statistics':
        selectTab('❤️ Dashboard');
        setActiveSidebarTab('stats');
        break;
      case 'Focus Recovery: Change Difficulty':
        selectTab('⚙️ Settings');
        setActiveSidebarTab('settings');
        break;
      case 'Focus Recovery: Reset Progress':
        handleResetProgress();
        break;
      case 'Focus Recovery: Export Progress':
        handleExportData();
        break;
      case 'Focus Recovery: Import Progress':
        document.getElementById('hidden-import-input')?.click();
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

  // --- CODE VIEWER REGEX PARSER FOR STYLIZED TEXT ---
  function highlightCodeHTML(code: string, language: string) {
    if (language === 'json') {
      return code
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '<span class="text-[#ce9178]">$1</span>') // strings
        .replace(/(true|false)/g, '<span class="text-[#569cd6]">$1</span>') // booleans
        .replace(/(null)/g, '<span class="text-[#569cd6]">$1</span>') // null
        .replace(/\b(\d+)\b/g, '<span class="text-[#b5cea8]">$1</span>') // numbers
        .replace(/(".*?")\s*:/g, '<span class="text-[#9cdcfe]">$1</span>:'); // keys
    }
    if (language === 'typescript') {
      return code
        .replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="text-[#6a9955]">$1</span>') // comments
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\'])*'|`[\s\S]*?`)/g, '<span class="text-[#ce9178]">$1</span>') // strings
        .replace(/\b(import|export|const|let|var|function|class|interface|type|extends|implements|return|if|else|for|while|try|catch|new|this|async|await|private|public|static|readonly|from|as|default|string|number|boolean|void|any|interface|export)\b/g, '<span class="text-[#569cd6]">$1</span>') // keywords
        .replace(/\b(vscode|ProgressManager|SessionManager|ReminderManager|Dashboard|EXTENSION_FILES|UserProgress|SessionRecord|ProgressionLevel|PROGRESSION_LEVELS|clearInterval|setInterval|setTimeout)\b/g, '<span class="text-[#4ec9b0]">$1</span>') // classes/types/globals
        .replace(/\b(\d+)\b/g, '<span class="text-[#b5cea8]">$1</span>'); // numbers
    }
    return code; // markdown
  }

  // Handle hotkeys (Ctrl+Shift+P)
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

  // --- SIMULATED ALARM CLOCK ---
  const simulateAlarm = (type: 'morning' | 'evening') => {
    const timeLabel = type === 'morning' ? morningReminder : eveningReminder;
    const nameLabel = type === 'morning' ? "Morning Focus Refresh" : "Evening Refocus Recovery";
    playSound(440, 'triangle', 0.2);
    setTimeout(() => playSound(554.37, 'triangle', 0.2), 150);
    setTimeout(() => playSound(659.25, 'triangle', 0.3), 300);

    showToast(
      `[Alarm Schedule] It's ${timeLabel}. Time for your offline ${nameLabel}! Ready for your postural, focal and break exercise?`,
      'info',
      [
        { label: "Start Session", action: () => startRecoverySession() },
        { label: "Snooze 10m", action: () => {
          showToast("Focus Recovery reminder snoozed for 10 minutes.", "info");
          addLog("Alarm Event: Reminders snoozed 10 minutes by developer override.");
        }}
      ]
    );
  };

  // --- RENDER CODE COMPONENT ---
  const renderCodeEditor = (file: ExtensionFile) => {
    const highlighted = highlightCodeHTML(file.content, file.language);
    const lineCount = file.content.split('\n').length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
      <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm overflow-hidden select-text">
        {/* File Description header */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#252526] border-b border-[#2d2d2d] shrink-0 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-sans font-medium px-2 py-0.5 bg-emerald-950/50 rounded border border-emerald-800/30">
              {file.language.toUpperCase()}
            </span>
            <span className="text-[#a1a1aa] font-sans italic">{file.description}</span>
          </div>
          <button 
            onClick={() => copyFileToClipboard(file.name, file.content)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2f3136] hover:bg-[#3f4248] text-[#cccccc] font-sans font-medium rounded transition border border-[#3e4147]"
          >
            {copiedFile === file.name ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedFile === file.name ? "Copied!" : "Copy Source"}
          </button>
        </div>

        {/* Scrollable code block */}
        <div className="flex flex-1 overflow-auto leading-relaxed p-4 select-text">
          <div className="text-right text-[#5a5a5a] pr-4 select-none border-r border-[#2d2d2d] shrink-0 text-[12px] leading-5 min-w-[2.5rem]">
            {lineNumbers.map(n => <div key={n}>{n}</div>)}
          </div>
          <pre className="pl-4 overflow-x-auto text-[13px] leading-5 w-full select-text selection:bg-[#264f78]" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      </div>
    );
  };

  // --- RENDER DAMPENED SVG DASHBOARD GRAPHS ---
  const renderWeeklyActivityChart = () => {
    // Mon-Sun logs
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    // Simulate some completions for days of the week based on history
    const completionsMap = [3, 4, 2, 5, 4, 3, 2]; // default simulated data
    // Add real session history logs to Sunday
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
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-sm"
                />
              </div>
              <div className="text-[10px] text-[#888] font-sans mt-1">{day}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#181818] text-[#cccccc] font-sans overflow-hidden select-none">
      
      {/* 1. TOP HEADER / BRANDING BANNER AND SEARCH BAR (COMMAND PALETTE LAUNCHER) */}
      <header className="flex items-center justify-between h-12 bg-[#2d2d2d] border-b border-[#181818] px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Animated custom visual brand */}
          <div className="relative flex items-center justify-center w-7 h-7 bg-indigo-900 rounded-lg text-indigo-200 border border-indigo-500 shadow-md">
            <Heart size={14} className="animate-pulse text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide">FOCUS RECOVERY</span>
            <span className="text-[9px] text-[#888888] font-mono">VS CODE EXTENSION BUILD SANDBOX</span>
          </div>
        </div>

        {/* Top Centered Command Launcher */}
        <div className="relative w-full max-w-md mx-4">
          <button 
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full h-7 px-3 bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#3c3c3c] rounded text-left text-xs text-zinc-400 transition"
          >
            <div className="flex items-center gap-2">
              <Search size={12} className="text-zinc-500" />
              <span>Search Focus Recovery Commands...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-[#2d2d2d] border border-[#444] rounded text-zinc-400 font-mono select-none">
              Ctrl+Shift+P
            </kbd>
          </button>

          {/* Interactive Command Palette Dropdown */}
          <AnimatePresence>
            {commandPaletteOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCommandPaletteOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-9 bg-[#252526] border border-[#3c3c3c] rounded shadow-2xl z-50 overflow-hidden text-xs"
                >
                  <div className="p-2 border-b border-[#3c3c3c] bg-[#1e1e1e]">
                    <input 
                      type="text"
                      placeholder="Type a command to execute..."
                      value={commandPaletteSearch}
                      onChange={(e) => setCommandPaletteSearch(e.target.value)}
                      className="w-full h-7 px-2.5 bg-[#252526] text-white border border-[#3c3c3c] rounded outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {[
                      { label: "Focus Recovery: Start Session", desc: "Launches the posture & break visual countdown intervals" },
                      { label: "Focus Recovery: Show Statistics", desc: "Opens dashboard highlighting your streaks, logs and level metrics" },
                      { label: "Focus Recovery: Change Difficulty", desc: "Allows selection between progressive training levels" },
                      { label: "Focus Recovery: Reset Progress", desc: "Clears tracked history and restores beginner presets" },
                      { label: "Focus Recovery: Export Progress", desc: "Saves a local JSON state backup file on your device" },
                      { label: "Focus Recovery: Import Progress", desc: "Imports a previously exported globalState backup" },
                      { label: "Focus Recovery: Show Source Code Explorer", desc: "Active workspace editor showing typescript/JSON files" },
                      { label: "Focus Recovery: Read Developer Manual", desc: "Loads user installation handbook" }
                    ]
                      .filter(cmd => cmd.label.toLowerCase().includes(commandPaletteSearch.toLowerCase()))
                      .map((cmd) => (
                        <button
                          key={cmd.label}
                          onClick={() => executeVSCodeCommand(cmd.label)}
                          className="w-full px-4 py-2.5 text-left border-b border-[#2d2d2d] hover:bg-indigo-600 hover:text-white group flex justify-between items-center transition"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-100 group-hover:text-white">{cmd.label}</span>
                            <span className="text-[10px] text-zinc-400 group-hover:text-indigo-200">{cmd.desc}</span>
                          </div>
                          <ChevronRight size={12} className="text-zinc-600 group-hover:text-indigo-200" />
                        </button>
                      ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => simulateAlarm('morning')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 border border-amber-800/40 rounded transition"
            title="Simulate 8:00 AM Morning Schedule Alarm"
          >
            <Clock size={12} />
            <span className="hidden md:inline font-medium">Test Morning Alarm</span>
          </button>
          <button 
            onClick={() => simulateAlarm('evening')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-indigo-950/30 hover:bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 rounded transition"
            title="Simulate 7:00 PM Evening Schedule Alarm"
          >
            <Clock size={12} />
            <span className="hidden md:inline font-medium">Test Evening Alarm</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ACTIVITY BAR (Extreme Left Rail) */}
        <nav className="w-14 bg-[#181818] flex flex-col justify-between items-center py-4 border-r border-[#101010] shrink-0">
          <div className="flex flex-col gap-5 w-full items-center">
            {/* Explorer icon */}
            <button 
              onClick={() => setActiveSidebarTab('explorer')}
              className={`relative p-2 rounded transition-colors group ${activeSidebarTab === 'explorer' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="File Explorer (Extension Code)"
            >
              {activeSidebarTab === 'explorer' && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-r" />}
              <Files size={20} />
            </button>

            {/* Statistics / Interactive Dashboard icon */}
            <button 
              onClick={() => {
                setActiveSidebarTab('stats');
                selectTab('❤️ Dashboard');
              }}
              className={`relative p-2 rounded transition-colors group ${activeSidebarTab === 'stats' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Focus Recovery Dashboard"
            >
              {activeSidebarTab === 'stats' && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-r" />}
              <Heart size={20} className={isSessionRunning ? "animate-pulse text-rose-500" : ""} />
            </button>

            {/* Configs Settings icon */}
            <button 
              onClick={() => {
                setActiveSidebarTab('settings');
                selectTab('⚙️ Settings');
              }}
              className={`relative p-2 rounded transition-colors group ${activeSidebarTab === 'settings' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Extension Settings (focusRecovery.*)"
            >
              {activeSidebarTab === 'settings' && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-r" />}
              <Settings size={20} />
            </button>

            {/* Output terminal icon */}
            <button 
              onClick={() => setActiveSidebarTab('terminal')}
              className={`relative p-2 rounded transition-colors group ${activeSidebarTab === 'terminal' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Developer Terminal logs"
            >
              {activeSidebarTab === 'terminal' && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-r" />}
              <Terminal size={20} />
            </button>

            {/* Readme Manual icon */}
            <button 
              onClick={() => {
                setActiveSidebarTab('readme');
                selectTab('README.md');
              }}
              className={`relative p-2 rounded transition-colors group ${activeSidebarTab === 'readme' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Developer Manual & README"
            >
              {activeSidebarTab === 'readme' && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-r" />}
              <BookOpen size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-300 text-xs font-semibold" title="Sandbox User">
              <User size={14} />
            </div>
            <button 
              onClick={() => {
                setActiveSidebarTab('settings');
                selectTab('⚙️ Settings');
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="VS Code Preferences"
            >
              <Sliders size={18} />
            </button>
          </div>
        </nav>

        {/* SIDEBAR CONTAINER */}
        <aside className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col overflow-hidden shrink-0">
          
          {/* File Explorer Content */}
          {activeSidebarTab === 'explorer' && (
            <div className="flex flex-col h-full">
              <div className="px-4 py-2.5 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#2d2d2d] bg-[#1e1e1e] flex justify-between items-center">
                <span>VS Code Explorer</span>
                <span className="text-[10px] text-zinc-600">WORKSPACE</span>
              </div>
              <div className="flex-1 overflow-y-auto py-2 text-xs">
                {/* Folder Header */}
                <div 
                  onClick={() => setExpandedFolders(prev => ({ ...prev, root: !prev.root }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer text-[#cccccc]"
                >
                  {expandedFolders.root ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FolderOpen size={14} className="text-indigo-400 shrink-0" />
                  <span className="font-bold tracking-tight text-white font-mono text-[11px]">focus-recovery</span>
                </div>

                {expandedFolders.root && (
                  <div className="pl-4">
                    {/* package.json */}
                    <div 
                      onClick={() => selectTab('package.json')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'package.json' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                    >
                      <FileText size={14} className="text-amber-500 shrink-0" />
                      <span className="font-mono">package.json</span>
                    </div>

                    {/* tsconfig.json */}
                    <div 
                      onClick={() => selectTab('tsconfig.json')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'tsconfig.json' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                    >
                      <File size={14} className="text-[#4ec9b0] shrink-0" />
                      <span className="font-mono">tsconfig.json</span>
                    </div>

                    {/* README.md */}
                    <div 
                      onClick={() => selectTab('README.md')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'README.md' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                    >
                      <FileText size={14} className="text-sky-500 shrink-0" />
                      <span className="font-mono">README.md</span>
                    </div>

                    {/* src Folder */}
                    <div 
                      onClick={() => setExpandedFolders(prev => ({ ...prev, src: !prev.src }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer text-[#cccccc] mt-1"
                    >
                      {expandedFolders.src ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Folder size={14} className="text-indigo-400 shrink-0" />
                      <span className="font-bold font-mono text-[11px]">src</span>
                    </div>

                    {expandedFolders.src && (
                      <div className="pl-4">
                        {/* src/types.ts */}
                        <div 
                          onClick={() => selectTab('src/types.ts')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'src/types.ts' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                        >
                          <FileText size={14} className="text-sky-400 shrink-0" />
                          <span className="font-mono">types.ts</span>
                        </div>

                        {/* src/progressManager.ts */}
                        <div 
                          onClick={() => selectTab('src/progressManager.ts')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'src/progressManager.ts' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                        >
                          <FileText size={14} className="text-[#3b82f6] shrink-0" />
                          <span className="font-mono">progressManager.ts</span>
                        </div>

                        {/* src/sessionManager.ts */}
                        <div 
                          onClick={() => selectTab('src/sessionManager.ts')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'src/sessionManager.ts' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                        >
                          <FileText size={14} className="text-[#3b82f6] shrink-0" />
                          <span className="font-mono">sessionManager.ts</span>
                        </div>

                        {/* src/reminderManager.ts */}
                        <div 
                          onClick={() => selectTab('src/reminderManager.ts')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'src/reminderManager.ts' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                        >
                          <FileText size={14} className="text-[#3b82f6] shrink-0" />
                          <span className="font-mono">reminderManager.ts</span>
                        </div>

                        {/* src/dashboard.ts */}
                        <div 
                          onClick={() => selectTab('src/dashboard.ts')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'src/dashboard.ts' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                        >
                          <FileText size={14} className="text-[#3b82f6] shrink-0" />
                          <span className="font-mono">dashboard.ts</span>
                        </div>

                        {/* src/extension.ts */}
                        <div 
                          onClick={() => selectTab('src/extension.ts')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2a2a] cursor-pointer ${activeTab === 'src/extension.ts' ? 'bg-[#2d2d2d] text-white border-l-2 border-indigo-500' : 'text-zinc-400'}`}
                        >
                          <FileText size={14} className="text-amber-400 shrink-0" />
                          <span className="font-mono">extension.ts</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-[#181818] border-t border-[#2d2d2d]">
                <button 
                  onClick={startRecoverySession}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition text-xs border border-indigo-500"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Start Session</span>
                </button>
              </div>
            </div>
          )}

          {/* Statistics Dashboard sidebar info quick-view */}
          {activeSidebarTab === 'stats' && (
            <div className="flex flex-col h-full text-xs">
              <div className="px-4 py-2.5 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#2d2d2d] bg-[#1e1e1e]">
                <span>Status Metrics</span>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="bg-[#252526] p-3 rounded border border-[#2d2d2d]">
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold mb-1">Active Progression</div>
                  <div className="text-sm font-bold text-white">{activeLevelConfig.displayName}</div>
                  <div className="mt-2 text-[10px] text-zinc-400">
                    Hold: {activeLevelConfig.holdDuration}s • Rest: {activeLevelConfig.restDuration}s • Reps: {activeLevelConfig.reps}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#252526] p-2.5 rounded border border-[#2d2d2d] text-center">
                    <div className="text-[9px] uppercase text-zinc-500 font-semibold">Streak</div>
                    <div className="text-lg font-extrabold text-white">{currentStreak} Days</div>
                  </div>
                  <div className="bg-[#252526] p-2.5 rounded border border-[#2d2d2d] text-center">
                    <div className="text-[9px] uppercase text-zinc-500 font-semibold">Completed</div>
                    <div className="text-lg font-extrabold text-white">{totalSessions}</div>
                  </div>
                </div>

                <div className="bg-[#252526] p-3 rounded border border-[#2d2d2d] text-[11px]">
                  <div className="font-semibold text-zinc-300 mb-2">Daily Reminders</div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-zinc-500">Morning alarm:</span>
                    <span className="font-mono text-zinc-200">{morningReminder}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Evening alarm:</span>
                    <span className="font-mono text-zinc-200">{eveningReminder}</span>
                  </div>
                </div>

                <button 
                  onClick={() => selectTab('❤️ Dashboard')}
                  className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border border-[#3c3c3c] rounded text-center font-medium transition"
                >
                  Show Graphical Webview
                </button>
              </div>
            </div>
          )}

          {/* Extension settings Sidebar tab */}
          {activeSidebarTab === 'settings' && (
            <div className="flex flex-col h-full text-xs">
              <div className="px-4 py-2.5 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#2d2d2d] bg-[#1e1e1e] flex justify-between items-center">
                <span>EXTENSION SETTINGS</span>
                <Sliders size={12} className="text-zinc-500" />
              </div>
              <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-300">Morning Reminder (HH:MM)</label>
                  <input 
                    type="time" 
                    value={morningReminder}
                    onChange={(e) => {
                      setMorningReminder(e.target.value);
                      saveConfigToLocal('morning', e.target.value);
                      addLog(`focusRecovery.morningReminder updated to ${e.target.value}`);
                    }}
                    className="bg-[#2d2d2d] text-white border border-[#3c3c3c] px-2 py-1 rounded"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-300">Evening Reminder (HH:MM)</label>
                  <input 
                    type="time" 
                    value={eveningReminder}
                    onChange={(e) => {
                      setEveningReminder(e.target.value);
                      saveConfigToLocal('evening', e.target.value);
                      addLog(`focusRecovery.eveningReminder updated to ${e.target.value}`);
                    }}
                    className="bg-[#2d2d2d] text-white border border-[#3c3c3c] px-2 py-1 rounded"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-[#2d2d2d] mt-2">
                  <div className="flex flex-col pr-2">
                    <span className="font-semibold text-zinc-300">Auto Progress</span>
                    <span className="text-[10px] text-zinc-500">Scale level every 5 sessions</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={autoProgress}
                    onChange={handleToggleAutoProgress}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                {!autoProgress && (
                  <div className="flex flex-col gap-1.5 border-t border-[#2d2d2d] pt-2">
                    <label className="font-semibold text-zinc-300">Difficulty Level Override</label>
                    <select
                      value={difficulty}
                      onChange={(e) => handleChangeManualDifficulty(e.target.value)}
                      className="bg-[#2d2d2d] text-white border border-[#3c3c3c] px-2 py-1 rounded cursor-pointer"
                    >
                      {PROGRESSION_LEVELS.map(l => (
                        <option key={l.level} value={l.displayName}>{l.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-t border-[#2d2d2d]">
                  <div className="flex flex-col pr-2">
                    <span className="font-semibold text-zinc-300">Enable Notifications</span>
                    <span className="text-[10px] text-zinc-500">Triggers alert overlays</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={enableNotifications}
                    onChange={(e) => {
                      setEnableNotifications(e.target.checked);
                      saveConfigToLocal('enable_notifs', e.target.checked);
                      addLog(`focusRecovery.enableNotifications set to ${e.target.checked}`);
                    }}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-[#2d2d2d]">
                  <div className="flex flex-col pr-2">
                    <span className="font-semibold text-zinc-300">Status Bar Heart</span>
                    <span className="text-[10px] text-zinc-500">Show status bar shortcut</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={enableStatusBar}
                    onChange={(e) => {
                      setEnableStatusBar(e.target.checked);
                      saveConfigToLocal('enable_status', e.target.checked);
                      addLog(`focusRecovery.enableStatusBar set to ${e.target.checked}`);
                    }}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t border-[#2d2d2d] flex flex-col gap-2">
                  <button 
                    onClick={handleResetProgress}
                    className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded transition text-center font-semibold"
                  >
                    Reset Progress
                  </button>
                  <button 
                    onClick={handleExportData}
                    className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#3a3d41] text-zinc-300 border border-[#3c3c3c] rounded transition text-center font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download size={12} />
                    <span>Export JSON Backups</span>
                  </button>
                  <div className="relative">
                    <input 
                      id="hidden-import-input"
                      type="file" 
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                    <button 
                      onClick={() => document.getElementById('hidden-import-input')?.click()}
                      className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#3a3d41] text-zinc-300 border border-[#3c3c3c] rounded transition text-center font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Plus size={12} />
                      <span>Import JSON Backup</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Developer logs console sidebar tab */}
          {activeSidebarTab === 'terminal' && (
            <div className="flex flex-col h-full text-xs">
              <div className="px-4 py-2.5 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#2d2d2d] bg-[#1e1e1e] flex justify-between items-center">
                <span>DEVELOPER LOGGER</span>
                <button onClick={() => setTerminalLogs([])} className="text-zinc-500 hover:text-zinc-300" title="Clear logs">
                  <RotateCcw size={12} />
                </button>
              </div>
              <div className="p-3 bg-[#121212] flex-1 overflow-y-auto font-mono text-[11px] text-zinc-400 leading-relaxed flex flex-col-reverse gap-2">
                {[...terminalLogs].reverse().map((log, i) => (
                  <div key={i} className="border-b border-[#1c1c1c] pb-1 break-all">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Guide Sidebar tab */}
          {activeSidebarTab === 'readme' && (
            <div className="flex flex-col h-full text-xs">
              <div className="px-4 py-2.5 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#2d2d2d] bg-[#1e1e1e]">
                <span>EXTENSION MANUAL</span>
              </div>
              <div className="p-4 flex flex-col gap-3.5 flex-1 overflow-y-auto leading-relaxed text-zinc-400">
                <h4 className="font-bold text-zinc-200 text-sm">Focus Recovery</h4>
                <p>An auxiliary assistant crafted to guide developers through physical posture, visual, and screen-break recovery intervals without external tracking.</p>
                
                <h5 className="font-bold text-zinc-200 mt-2">Active Phases</h5>
                <ul className="list-disc pl-4 flex flex-col gap-1">
                  <li><strong>Prepare:</strong> A 3s warm-up to align spine, balance weight.</li>
                  <li><strong>Activate (Hold):</strong> Deep spinal alignment and neck traction hold for hold duration.</li>
                  <li><strong>Relax (Rest):</strong> Complete release of hold and visual refocus away from screens.</li>
                </ul>

                <h5 className="font-bold text-zinc-200 mt-2">Progression</h5>
                <p>Every 5 completed sessions automatically unlocks the next difficulty level. You can toggle auto-progression off in the settings tab to specify your level manually.</p>
              </div>
            </div>
          )}
        </aside>

        {/* 3. WORKSPACE EDITOR CONTAINER */}
        <main className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
          
          {/* EDITOR TABS ROW */}
          <div className="h-9 bg-[#2d2d2d] border-b border-[#181818] flex items-center overflow-x-auto shrink-0 scrollbar-none">
            {openTabs.map((tabName) => {
              const isActive = activeTab === tabName;
              return (
                <div 
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  className={`flex items-center gap-2 h-full px-4 border-r border-[#1e1e1e] cursor-pointer text-xs transition-colors ${isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-indigo-500' : 'bg-[#252526] hover:bg-[#2a2a2a] text-zinc-500'}`}
                >
                  {tabName.startsWith('❤️') ? <Heart size={12} className="text-rose-500 shrink-0" /> : 
                   tabName.startsWith('⚙️') ? <Settings size={12} className="text-indigo-400 shrink-0" /> : 
                   tabName.endsWith('.json') ? <FileText size={12} className="text-amber-500 shrink-0" /> : 
                   tabName.endsWith('.md') ? <FileText size={12} className="text-sky-500 shrink-0" /> :
                   <FileText size={12} className="text-sky-400 shrink-0" />}
                  <span className="font-mono">{tabName.split('/').pop()}</span>
                  <button 
                    onClick={(e) => closeTab(e, tabName)}
                    className="p-0.5 hover:bg-[#3c3c3c] rounded text-zinc-600 hover:text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ACTIVE TAB WORKSPACE CONTENT */}
          <div className="flex-1 overflow-hidden relative select-text">
            {/* IF NO TABS OPEN DISPLAY FALLBACK */}
            {openTabs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                <Heart size={40} className="text-zinc-600 mb-2 animate-pulse" />
                <span className="text-sm font-semibold">Workspace Empty</span>
                <span className="text-xs text-zinc-600">Select a file in the File Explorer sidebar to show source code</span>
              </div>
            )}

            {/* EXTENSION INTERACTIVE DASHBOARD VIEW */}
            {activeTab === '❤️ Dashboard' && (
              <div className="h-full overflow-y-auto bg-[#1e1e1e] text-[#cccccc] p-8 select-none">
                
                {/* Dashboard top header summary banner */}
                <div className="max-w-4xl mx-auto flex flex-col gap-6">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[#2d2d2d]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                          <Heart fill="currentColor" size={24} className="text-indigo-500 animate-pulse" />
                          Focus Recovery Assistant
                        </h1>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                          Active State
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        A clean, offline-first development companion for posture, optical focus, and breathing recoveries.
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={startRecoverySession}
                        disabled={isSessionRunning}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-xs font-semibold rounded shadow-md border border-indigo-500 transition-all duration-200"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Start Recovery Session</span>
                      </button>
                      <button 
                        onClick={() => {
                          setActiveSidebarTab('settings');
                          selectTab('⚙️ Settings');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 text-xs font-semibold rounded border border-[#3c3c3c] transition-all duration-200"
                      >
                        <Sliders size={13} />
                        <span>Configure Parameters</span>
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE RECOVERY SEQUENCE CONTROLLER OR STATS PANEL */}
                  {isSessionRunning ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-zinc-950/70 border border-indigo-500/30 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden"
                    >
                      {/* Interactive background ambient light glow */}
                      <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent pointer-events-none" />

                      {/* Speed up test and sound controls */}
                      <div className="absolute top-4 right-4 flex items-center gap-3">
                        <button 
                          onClick={() => setIsMuted(prev => !prev)}
                          className="p-2 text-zinc-400 hover:text-white bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg transition"
                          title={isMuted ? "Unmute audio alerts" : "Mute audio alerts"}
                        >
                          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <button 
                          onClick={() => setIsFastForward(prev => !prev)}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded border transition ${isFastForward ? 'bg-amber-950/40 text-amber-400 border-amber-800/60' : 'bg-[#1a1a1a] text-zinc-400 border-[#2d2d2d] hover:text-white'}`}
                          title="Speed up timers for testing"
                        >
                          <FastForward size={12} className={isFastForward ? "animate-bounce" : ""} />
                          <span>Simulate 10x Speed</span>
                        </button>
                      </div>

                      {/* Header progression labels */}
                      <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono mb-1">
                        Active Workout Cycle • {activeLevelConfig.displayName}
                      </div>
                      
                      {/* Simulated Large Respiratory Visual Indicator Ring */}
                      <div className="relative w-44 h-44 my-6 flex items-center justify-center">
                        {/* Static outer ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-950" />
                        
                        {/* Dynamic animated breathing expanding rings */}
                        <AnimatePresence mode="popLayout">
                          {sessionPhase === 'prepare' && (
                            <motion.div 
                              key="prepare-ring"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: [0.8, 1.1, 0.8], opacity: 0.6 }}
                              transition={{ repeat: Infinity, duration: 2.5 }}
                              className="absolute inset-1 rounded-full border-2 border-dashed border-amber-500"
                            />
                          )}
                          {sessionPhase === 'hold' && (
                            <motion.div 
                              key="hold-ring"
                              initial={{ scale: 0.7 }}
                              animate={{ scale: 1.15 }}
                              transition={{ duration: isFastForward ? activeLevelConfig.holdDuration / 10 : activeLevelConfig.holdDuration, ease: "easeInOut" }}
                              className="absolute inset-1 rounded-full bg-emerald-500/10 border-4 border-emerald-500"
                            />
                          )}
                          {sessionPhase === 'rest' && (
                            <motion.div 
                              key="rest-ring"
                              initial={{ scale: 1.15 }}
                              animate={{ scale: 0.75 }}
                              transition={{ duration: isFastForward ? activeLevelConfig.restDuration / 10 : activeLevelConfig.restDuration, ease: "easeInOut" }}
                              className="absolute inset-1 rounded-full bg-sky-500/10 border-4 border-sky-400"
                            />
                          )}
                        </AnimatePresence>

                        {/* Centered Phase Display text */}
                        <div className="flex flex-col items-center justify-center z-10">
                          <span className="text-2xl font-bold font-mono text-white tracking-tight">
                            {sessionTimeRemaining}s
                          </span>
                          <span className={`text-xs font-extrabold uppercase mt-1 tracking-wider ${
                            sessionPhase === 'prepare' ? 'text-amber-400' :
                            sessionPhase === 'hold' ? 'text-emerald-400' : 'text-sky-400'
                          }`}>
                            {sessionPhase === 'prepare' ? "Prepare" :
                             sessionPhase === 'hold' ? "Activate" : "Relax"}
                          </span>
                        </div>
                      </div>

                      {/* Phase instructions */}
                      <div className="h-14 max-w-sm mb-4">
                        <AnimatePresence mode="wait">
                          <motion.p 
                            key={sessionPhase}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-xs text-zinc-300 leading-relaxed font-sans"
                          >
                            {sessionPhase === 'prepare' && "Breathe cleanly. Align your spinal support and adjust your lower shoulders."}
                            {sessionPhase === 'hold' && "Deep spinal traction: pull shoulder blades down, push neck gently back, expand chest. Deep core hold."}
                            {sessionPhase === 'rest' && "Release support muscles. Look completely away from screens, focusing on a far distance object (>20ft)."}
                          </motion.p>
                        </AnimatePresence>
                      </div>

                      {/* Session Details */}
                      <div className="flex gap-4 mb-6 text-xs text-zinc-400 bg-zinc-900 px-4 py-2 rounded-lg border border-[#2d2d2d] font-mono">
                        <div>Repetition: <strong className="text-white">{sessionRep} / {activeLevelConfig.reps}</strong></div>
                        <div className="text-zinc-600">|</div>
                        <div>Set: <strong className="text-white">1 / 1</strong></div>
                        <div className="text-zinc-600">|</div>
                        <div>Goal: <strong className="text-white">{activeLevelConfig.displayName}</strong></div>
                      </div>

                      {/* Controls Buttons */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            // Simple manual step skip
                            setSessionTimeRemaining(0);
                            playSound(600, 'sine', 0.1);
                          }}
                          className="px-4 py-1.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#3c3c3c] text-xs text-zinc-300 hover:text-white rounded transition"
                        >
                          Skip State
                        </button>
                        <button 
                          onClick={cancelActiveSession}
                          className="px-4 py-1.5 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/40 text-xs text-rose-300 hover:text-rose-200 rounded transition font-semibold"
                        >
                          Cancel Workout
                        </button>
                      </div>

                    </motion.div>
                  ) : (
                    <>
                      {/* STATS HIGHLIGHT GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#252526] p-5 rounded-lg border border-[#2d2d2d] flex flex-col gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Goal Target Level</span>
                          <span className="text-lg font-bold text-white">{activeLevelConfig.displayName}</span>
                          <div className="h-1.5 bg-[#2d2d2d] rounded-full overflow-hidden mt-1.5">
                            {/* Completions percent toward next level */}
                            {(() => {
                              const comps = history.filter(h => h.level === currentLevel && h.completed).length;
                              const pct = Math.min((comps / 5) * 100, 100);
                              return (
                                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              );
                            })()}
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                            <span>Adaptive Progress</span>
                            <span>{history.filter(h => h.level === currentLevel && h.completed).length % 5} / 5 Sessions</span>
                          </div>
                        </div>

                        <div className="bg-[#252526] p-5 rounded-lg border border-[#2d2d2d] flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Continuous Streak</span>
                          <span className="text-3xl font-extrabold text-white mt-1">{currentStreak} Days</span>
                          <span className="text-[10px] text-zinc-400 mt-auto flex items-center gap-1">
                            <TrendingUp size={12} className="text-indigo-400" />
                            Keep doing 1 session daily to build muscle memory
                          </span>
                        </div>

                        <div className="bg-[#252526] p-5 rounded-lg border border-[#2d2d2d] flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completed Sessions</span>
                          <span className="text-3xl font-extrabold text-white mt-1">{totalSessions} Sessions</span>
                          <span className="text-[10px] text-zinc-400 mt-auto flex items-center gap-1">
                            <Calendar size={12} className="text-indigo-400" />
                            {lastCompletedSession ? `Last: ${new Date(lastCompletedSession).toLocaleDateString()}` : "No completed sessions"}
                          </span>
                        </div>
                      </div>

                      {/* LOWER GRAPHICS AND HISTORIC LOGS SECTION */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Activity visualizer block */}
                        <div className="bg-[#252526] p-5 rounded-lg border border-[#2d2d2d] flex flex-col">
                          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-indigo-400" />
                            Weekly Completed Load Analysis
                          </h3>
                          {renderWeeklyActivityChart()}
                          <p className="text-[10px] text-zinc-500 italic mt-3 text-center">
                            Calculated across standard morning and evening interval triggers.
                          </p>
                        </div>

                        {/* Recent workouts table logs */}
                        <div className="bg-[#252526] p-5 rounded-lg border border-[#2d2d2d] flex flex-col">
                          <h3 className="text-sm font-semibold text-white mb-4">
                            History Logs
                          </h3>
                          <div className="flex-1 overflow-y-auto max-h-[160px] flex flex-col gap-2 pr-1">
                            {history.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-6">
                                <AlertCircle size={18} className="text-zinc-600 mb-1" />
                                <span className="text-xs italic">No workout history logged.</span>
                              </div>
                            ) : (
                              [...history].reverse().slice(0, 4).map((h, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#1e1e1e] p-2.5 rounded border border-[#2d2d2d] text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-white">Level {h.level} Recovery Routine</span>
                                    <span className="text-[10px] text-zinc-500">
                                      {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">{h.reps} Reps • {h.holdDuration}s Hold</span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                      Completed
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* INFORMATIVE EXERCISE TUTORIALS PANEL */}
                      <div className="bg-[#252526]/50 rounded-lg p-5 border border-[#2d2d2d] flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Sparkles size={14} className="text-indigo-400" />
                          Focus Recovery Wellness Protocols
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="p-3 bg-[#1e1e1e] rounded border border-[#2d2d2d]">
                            <strong className="text-indigo-300 block mb-1">🧘 Upper Spine & Cervical Traction</strong>
                            Pull shoulder blades down, lift lower neck, pull chin inward (military posture). Retract neck 1 inch backward. Holds spinal support and combats forward-head slouching.
                          </div>
                          <div className="p-3 bg-[#1e1e1e] rounded border border-[#2d2d2d]">
                            <strong className="text-indigo-300 block mb-1">👀 Focal Optical Reset</strong>
                            Direct eyes completely away from light screens. Focus clearly on an object at least 20 feet away to relax ciliary ocular lens muscles and combat digital eye strain.
                          </div>
                          <div className="p-3 bg-[#1e1e1e] rounded border border-[#2d2d2d]">
                            <strong className="text-indigo-300 block mb-1">🫁 Lower Costal Breathing</strong>
                            Conduct slow, diaphragmatic breaths. Retaining air deep in the lungs for holds enhances local cellular oxygenation, clearing cognitive fatigue during screen intervals.
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </div>
            )}

            {/* EXTENSION SETTINGS TABS VIEW */}
            {activeTab === '⚙️ Settings' && (
              <div className="h-full overflow-y-auto bg-[#1e1e1e] p-8">
                <div className="max-w-2xl mx-auto flex flex-col gap-6 select-none">
                  <div className="border-b border-[#2d2d2d] pb-4">
                    <h1 className="text-xl font-bold text-white">Focus Recovery User Preferences</h1>
                    <p className="text-xs text-zinc-400 mt-1">
                      Customize local schedules and reminder times. Values modify VS Code globalState files.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5 text-sm bg-[#252526] p-6 rounded-lg border border-[#2d2d2d]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-zinc-200">focusRecovery.morningReminder</label>
                        <span className="text-[11px] text-zinc-500">Morning alarm scheduled time. Default is 08:00 AM.</span>
                        <input 
                          type="time" 
                          value={morningReminder}
                          onChange={(e) => {
                            setMorningReminder(e.target.value);
                            saveConfigToLocal('morning', e.target.value);
                            addLog(`focusRecovery.morningReminder updated to ${e.target.value}`);
                          }}
                          className="bg-[#1e1e1e] text-white border border-[#3c3c3c] px-3 py-1.5 rounded outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-zinc-200">focusRecovery.eveningReminder</label>
                        <span className="text-[11px] text-zinc-500">Evening alarm scheduled time. Default is 07:00 PM.</span>
                        <input 
                          type="time" 
                          value={eveningReminder}
                          onChange={(e) => {
                            setEveningReminder(e.target.value);
                            saveConfigToLocal('evening', e.target.value);
                            addLog(`focusRecovery.eveningReminder updated to ${e.target.value}`);
                          }}
                          className="bg-[#1e1e1e] text-white border border-[#3c3c3c] px-3 py-1.5 rounded outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-[#2d2d2d] mt-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200">focusRecovery.autoProgress</span>
                        <span className="text-xs text-zinc-500 max-w-md">
                          When checked, the extension automatically increases difficulty level every 5 completed sessions.
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={autoProgress}
                        onChange={handleToggleAutoProgress}
                        className="w-4 h-4 rounded text-indigo-500 focus:ring-0 cursor-pointer bg-[#1e1e1e]"
                      />
                    </div>

                    {!autoProgress && (
                      <div className="flex flex-col gap-1.5 border-t border-[#2d2d2d] pt-3">
                        <label className="font-semibold text-zinc-200">focusRecovery.difficulty</label>
                        <span className="text-xs text-zinc-500 mb-1">Specify difficulty preset manual level override.</span>
                        <select
                          value={difficulty}
                          onChange={(e) => handleChangeManualDifficulty(e.target.value)}
                          className="bg-[#1e1e1e] text-white border border-[#3c3c3c] px-3 py-2 rounded cursor-pointer outline-none focus:border-indigo-500"
                        >
                          {PROGRESSION_LEVELS.map(l => (
                            <option key={l.level} value={l.displayName}>{l.displayName}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-3 border-t border-[#2d2d2d]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200">focusRecovery.enableNotifications</span>
                        <span className="text-xs text-zinc-500 max-w-md">
                          Enables desktop notifications and background alarms during active scheduled hours.
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={enableNotifications}
                        onChange={(e) => {
                          setEnableNotifications(e.target.checked);
                          saveConfigToLocal('enable_notifs', e.target.checked);
                          addLog(`focusRecovery.enableNotifications set to ${e.target.checked}`);
                        }}
                        className="w-4 h-4 rounded text-indigo-500 focus:ring-0 cursor-pointer bg-[#1e1e1e]"
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-[#2d2d2d]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200">focusRecovery.enableStatusBar</span>
                        <span className="text-xs text-zinc-500 max-w-md">
                          Adds quick-shortcut Heart icon in VS Code status bar for starting a session.
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={enableStatusBar}
                        onChange={(e) => {
                          setEnableStatusBar(e.target.checked);
                          saveConfigToLocal('enable_status', e.target.checked);
                          addLog(`focusRecovery.enableStatusBar set to ${e.target.checked}`);
                        }}
                        className="w-4 h-4 rounded text-indigo-500 focus:ring-0 cursor-pointer bg-[#1e1e1e]"
                      />
                    </div>
                  </div>

                  <div className="bg-[#252526] p-6 rounded-lg border border-[#2d2d2d] flex flex-col gap-4">
                    <h3 className="font-semibold text-white">Database Operations & Progress Recovery</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      All your statistics, streaks and histories are saved completely locally using VS Code's local 
                      <code>globalState</code> cache storage without a central server. You can export or import backups below.
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                      <button 
                        onClick={handleExportData}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow-sm border border-indigo-500 transition"
                      >
                        <Download size={13} />
                        <span>Export Progress Backup</span>
                      </button>
                      <button 
                        onClick={() => document.getElementById('hidden-import-input-settings')?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 text-xs font-semibold rounded border border-[#3c3c3c] transition"
                      >
                        <Plus size={13} />
                        <span>Import Progress Backup</span>
                      </button>
                      <input 
                        id="hidden-import-input-settings"
                        type="file" 
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                      />
                      <button 
                        onClick={handleResetProgress}
                        className="px-4 py-2 bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 text-xs font-semibold rounded border border-rose-800/40 transition ml-auto"
                      >
                        Clear Database Progress
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DIRECT CODE FILES RENDER VIEWPORTS */}
            {EXTENSION_FILES.map(file => {
              if (activeTab === file.path || activeTab === file.name) {
                return (
                  <div key={file.path} className="h-full">
                    {renderCodeEditor(file)}
                  </div>
                );
              }
              return null;
            })}

            {/* RENDER README TAB MANUALLY FOR BETTER LAYOUT */}
            {activeTab === 'README.md' && (
              <div className="h-full overflow-y-auto bg-[#1e1e1e] p-8 leading-relaxed select-text text-sm">
                <div className="max-w-3xl mx-auto text-[#cccccc]">
                  
                  {/* File descriptions / Top buttons */}
                  <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#2d2d2d]">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-sky-500 shrink-0" />
                      <div>
                        <h1 className="text-lg font-bold text-white font-mono">README.md</h1>
                        <p className="text-xs text-zinc-400">Extension Setup and Local Compiling Guide</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => copyFileToClipboard("README.md", EXTENSION_FILES.find(f => f.name === "README.md")?.content || "")}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#2f3136] hover:bg-[#3f4248] text-xs font-semibold rounded border border-[#3e4147] text-white"
                    >
                      <Copy size={12} />
                      <span>Copy README</span>
                    </button>
                  </div>

                  <div className="prose prose-invert max-w-none text-zinc-300">
                    <h1 className="text-2xl font-bold text-white mb-2">🧘 Focus Recovery Extension</h1>
                    <p className="text-zinc-400 mb-6 text-sm">
                      A beautifully polished Visual Studio Code wellness assistant. It automates spinal posture correction alignment, focal optical resetting breaks, and breathing cycles completely locally. <strong>No cloud. No telemetry. No APIs. No tracking.</strong>
                    </p>

                    <h2 className="text-lg font-bold text-white mt-6 mb-3 border-b border-[#2d2d2d] pb-1">Features</h2>
                    <ul className="list-disc pl-5 flex flex-col gap-2 mb-6 text-sm">
                      <li><strong>Progression Training Protocols</strong>: Supports 6 adaptive wellness levels containing calibrated hold durations, rest durations, and rep limits (from Level 1 Beginner to Level 6 Advanced).</li>
                      <li><strong>Adaptive Difficulty Escalation</strong>: Tracks successful completions and increments active difficulty every 5 successful sessions. Override option is supportable inside configurations.</li>
                      <li><strong>Schedules and Alarm Timers</strong>: Morning reminder at 8:00 AM and Evening reminder at 7:00 PM. Includes offline startup catch-up logic so missed schedules alert upon subsequent IDE launch.</li>
                      <li><strong>Quick Status Shortcuts</strong>: Simple heart indicator shortcuts placed inside the status bar for instant routine starts.</li>
                    </ul>

                    <h2 className="text-lg font-bold text-white mt-6 mb-3 border-b border-[#2d2d2d] pb-1">Developer Compilation & Installation Guide</h2>
                    <ol className="list-decimal pl-5 flex flex-col gap-3 mb-6 text-sm">
                      <li>
                        <strong>Create Project Workspace</strong>: Establish a folder named <code>focus-recovery</code> on your local disk.
                      </li>
                      <li>
                        <strong>Replicate File Structure</strong>: Copy and save the files in the file explorer sidebar into their exact path structures.
                      </li>
                      <li>
                        <strong>Install Modules</strong>: Open a system terminal in the project directory and run <code>npm install</code>.
                      </li>
                      <li>
                        <strong>Build and Compile</strong>: Run <code>npm run compile</code> to trigger the TypeScript compiler.
                      </li>
                      <li>
                        <strong>Launch Debugger Host</strong>: Press <code>F5</code> in VS Code (or navigate to Run Control side-rail and select "Launch Extension"). A secondary <strong>Extension Development Host</strong> window will open.
                      </li>
                      <li>
                        <strong>Run Commands</strong>: Press <code>Ctrl+Shift+P</code> inside the development host window and run <code>Focus Recovery: Start Session</code>!
                      </li>
                    </ol>

                    <div className="bg-indigo-950/20 border border-indigo-800/30 p-4 rounded-lg mt-6 flex items-start gap-3">
                      <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed text-indigo-300">
                        <strong>Developer Hint:</strong> Explore the other files in the left sidebar explorer (like <code>extension.ts</code> or <code>sessionManager.ts</code>) to view the complete production implementation code. You can copy the code directly!
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* SIMULATED VS CODE NOTIFICATION TOAST OVERLAYS */}
          <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="bg-[#252526] text-white border border-[#3c3c3c] rounded shadow-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-indigo-900/10"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="pt-0.5">
                      {toast.type === 'info' && <Bell size={15} className="text-indigo-400" />}
                      {toast.type === 'success' && <Check size={15} className="text-emerald-400" />}
                      {toast.type === 'warning' && <AlertCircle size={15} className="text-amber-400" />}
                      {toast.type === 'error' && <X size={15} className="text-rose-400" />}
                    </div>
                    <span className="text-xs text-zinc-100 font-sans leading-relaxed">{toast.message}</span>
                    <button 
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="ml-auto text-zinc-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {toast.actions && toast.actions.length > 0 && (
                    <div className="flex gap-2 justify-end border-t border-[#3c3c3c] pt-2.5">
                      {toast.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            act.action();
                            setToasts(prev => prev.filter(t => t.id !== toast.id));
                          }}
                          className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                            idx === 0 
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                              : 'bg-[#2f3136] hover:bg-[#3f4248] text-zinc-300'
                          }`}
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

        </main>
      </div>

      {/* 4. VS CODE STATUS BAR (Bottom Indicator Bar) */}
      <footer className="h-6 bg-indigo-600 text-white text-xs px-3 flex items-center justify-between shrink-0 font-mono relative z-20">
        <div className="flex items-center gap-4 h-full">
          {/* Heart Status Item click starts session */}
          {enableStatusBar && (
            <button 
              onClick={startRecoverySession}
              className="flex items-center gap-1.5 h-full px-2 hover:bg-indigo-700 transition font-sans text-[11px] font-semibold text-white animate-pulse"
              title="Click to start Focus Recovery Session"
            >
              <Heart fill="currentColor" size={12} className="text-white" />
              <span>Focus Recovery</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-indigo-200 text-[10px]">
            <span>Branch:</span>
            <strong className="text-white">main</strong>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-indigo-200 text-[10px]">
            <Cpu size={12} className="text-indigo-200" />
            <span>Sandbox Mode Active</span>
          </div>
        </div>

        <div className="flex items-center gap-4 h-full text-[10px] text-indigo-100">
          <div className="hidden lg:block">Ln 1, Col 1</div>
          <div className="hidden md:block">Spaces: 2</div>
          <div>UTF-8</div>
          <div>LF</div>
          <div className="flex items-center gap-1.5 h-full px-2 hover:bg-indigo-700 transition cursor-pointer">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>TypeScript JSX</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
