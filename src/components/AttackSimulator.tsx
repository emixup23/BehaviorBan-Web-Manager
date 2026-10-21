import React, { useState, useEffect } from 'react';
import { BehaviorBanConfig, WhitelistEntry, BannedEntry } from '../types/behaviorban';
import { Play, RotateCcw, ShieldCheck, Ban, Clock, Zap, ArrowRight, FastForward, Activity } from 'lucide-react';

interface AttackSimulatorProps {
  config: BehaviorBanConfig;
  whitelist: WhitelistEntry[];
  bannedList: BannedEntry[];
  onTriggerSimulatedBan: (ip: string, reason: string, score: number) => void;
}

interface SimulatedEventItem {
  id: string;
  timestamp: number; // in relative seconds
  formattedTime: string;
  weight: number;
  reason: string;
  type: 'ssh' | 'sqli' | '4xx' | '5xx' | '3xx' | 'custom';
}

export const AttackSimulator: React.FC<AttackSimulatorProps> = ({
  config,
  whitelist,
  bannedList,
  onTriggerSimulatedBan,
}) => {
  const [targetIp, setTargetIp] = useState('198.51.100.42');
  const [currentVirtualTime, setCurrentVirtualTime] = useState(0); // in seconds
  const [activeEvents, setActiveEvents] = useState<SimulatedEventItem[]>([]);
  const [simLogs, setSimLogs] = useState<{ id: string; time: string; text: string; isBan?: boolean }[]>([]);

  // Check if IP is in whitelist or already banned
  const isWhitelisted = whitelist.some((w) => w.ip === targetIp && w.enabled);
  const isAlreadyBanned = bannedList.some((b) => b.ip === targetIp && b.status === 'active');

  // Filter events within sliding window: now - ts <= WINDOW
  const validEventsInWindow = activeEvents.filter(
    (e) => currentVirtualTime - e.timestamp <= config.window
  );

  const currentScore = validEventsInWindow.reduce((acc, e) => acc + e.weight, 0);

  // Trigger event logic mimicking the exact bash add_event function
  const triggerEvent = (
    weight: number,
    reason: string,
    type: 'ssh' | 'sqli' | '4xx' | '5xx' | '3xx' | 'custom'
  ) => {
    if (weight === 0) {
      logAction(`Ignored event for ${targetIp} (${reason}): weight is 0 pts`);
      return;
    }

    if (isWhitelisted) {
      logAction(`Bypassed event for ${targetIp} (${reason}): IP is whitelisted in ${config.whitelistFile}`);
      return;
    }

    if (isAlreadyBanned) {
      logAction(`Bypassed event for ${targetIp} (${reason}): IP is already banned`);
      return;
    }

    const newEvent: SimulatedEventItem = {
      id: `ev-${Date.now()}-${Math.random()}`,
      timestamp: currentVirtualTime,
      formattedTime: formatSec(currentVirtualTime),
      weight,
      reason,
      type,
    };

    // Calculate sum for sliding window
    const updatedEvents = [...validEventsInWindow, newEvent];
    const newSum = updatedEvents.reduce((acc, e) => acc + e.weight, 0);

    logAction(`Event registered from ${targetIp}: +${weight} pts (${reason}) -> Score: ${newSum}/${config.banScore}`);

    if (newSum >= config.banScore) {
      const banReason = `score=${newSum} in ${config.window}s, last: ${reason}`;
      const banText =
        config.dryRun === 1
          ? `DRY-RUN would ban ${targetIp} (${banReason})`
          : `BANNED ${targetIp} (${banReason}) [ufw insert 1 deny]`;

      logAction(banText, true);
      onTriggerSimulatedBan(targetIp, banReason, newSum);
      setActiveEvents([]); // unset 'EVENTS[$ip]' in bash
    } else {
      setActiveEvents(updatedEvents);
    }
  };

  const advanceTime = (seconds: number) => {
    const nextTime = currentVirtualTime + seconds;
    setCurrentVirtualTime(nextTime);
    logAction(`Advanced simulation clock by +${seconds}s (Current: ${formatSec(nextTime)})`);
  };

  const logAction = (text: string, isBan = false) => {
    setSimLogs((prev) => [
      {
        id: `slog-${Date.now()}-${Math.random()}`,
        time: formatSec(currentVirtualTime),
        text,
        isBan,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `+${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const resetSimulator = () => {
    setCurrentVirtualTime(0);
    setActiveEvents([]);
    setSimLogs([]);
    logAction(`Simulator reset to t=0. Target IP: ${targetIp}`);
  };

  // Pre-configured Attack Scenario Runners
  const runScenario = (scenarioName: string) => {
    resetSimulator();
    if (scenarioName === 'sqli-burst') {
      triggerEvent(config.wSqli, 'sqli pattern: /products?id=1 UNION SELECT', 'sqli');
      setTimeout(() => {
        triggerEvent(config.wSqli, 'sqli pattern: /api?cat=sleep(5)', 'sqli');
      }, 200);
    } else if (scenarioName === 'ssh-bruteforce') {
      for (let i = 1; i <= Math.ceil(config.banScore / config.wSshFail); i++) {
        setTimeout(() => {
          triggerEvent(config.wSshFail, `ssh failure (attempt #${i})`, 'ssh');
        }, i * 200);
      }
    } else if (scenarioName === 'dir-scan') {
      for (let i = 1; i <= 8; i++) {
        setTimeout(() => {
          triggerEvent(config.w4xx, `http 404 /probe-${i}.php`, '4xx');
        }, i * 150);
      }
    }
  };

  const scorePercentage = Math.min(100, Math.round((currentScore / config.banScore) * 100));

  return (
    <div className="space-y-6">
      {/* Sandbox Header */}
      <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Sliding Window Attack & Ban Algorithm Sandbox</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Test how the bash array accumulator evaluates timestamps, prunes aged events, and triggers bans.
            </p>
          </div>
          <button
            type="button"
            onClick={resetSimulator}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Simulation</span>
          </button>
        </div>

        {/* IP and Target Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-300">Simulate IP:</label>
            <input
              type="text"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-emerald-400 w-36 focus:outline-hidden focus:border-emerald-500"
            />
            {isWhitelisted && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Whitelisted (immune)</span>
              </span>
            )}
            {isAlreadyBanned && (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" />
                <span>Currently Banned</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Virtual Time:</span>
            <span className="font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              {formatSec(currentVirtualTime)}
            </span>
            <button
              type="button"
              onClick={() => advanceTime(30)}
              className="px-2 py-1 text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors"
            >
              +30s
            </button>
            <button
              type="button"
              onClick={() => advanceTime(60)}
              className="px-2 py-1 text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors"
            >
              +1m
            </button>
            <button
              type="button"
              onClick={() => advanceTime(config.window)}
              className="px-2 py-1 text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors flex items-center gap-1"
            >
              <FastForward className="w-3 h-3" />
              <span>Expire Window (+{config.window}s)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Threat Gauge & Sliding Window Accumulator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Threat Level Meter */}
        <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Current IP Threat Score</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${currentScore >= config.banScore ? 'text-rose-400' : currentScore > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {currentScore}
              </span>
              <span className="text-sm font-mono text-slate-500">/ {config.banScore} pts</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-950 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  currentScore >= config.banScore
                    ? 'bg-rose-500'
                    : currentScore > config.banScore * 0.6
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${scorePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>0 pts</span>
              <span>Threshold: {config.banScore} pts</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
            {currentScore >= config.banScore ? (
              <span className="text-rose-400 font-medium">Banned: Threshold reached!</span>
            ) : (
              <span>Remaining: <strong className="font-mono text-slate-200">{config.banScore - currentScore} pts</strong> until ban</span>
            )}
          </div>
        </div>

        {/* Event Injector Controls */}
        <div className="md:col-span-2 p-5 rounded-xl bg-[#0e141f] border border-slate-800 space-y-3">
          <span className="text-xs font-semibold text-slate-400 block">Inject Simulated Events for {targetIp}:</span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => triggerEvent(config.wSqli, 'sqli pattern: /index.php?id=1 UNION SELECT', 'sqli')}
              className="p-2.5 text-left rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 group-hover:text-rose-400">SQLi Attempt</span>
                <span className="text-xs font-mono font-bold text-rose-400">+{config.wSqli}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">UNION SELECT attack</span>
            </button>

            <button
              type="button"
              onClick={() => triggerEvent(config.wSshFail, 'ssh failure', 'ssh')}
              className="p-2.5 text-left rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 group-hover:text-amber-400">SSH Failure</span>
                <span className="text-xs font-mono font-bold text-amber-400">+{config.wSshFail}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Failed password/Invalid user</span>
            </button>

            <button
              type="button"
              onClick={() => triggerEvent(config.w4xx, 'http 404 /admin.php', '4xx')}
              className="p-2.5 text-left rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 group-hover:text-sky-400">HTTP 404 Scan</span>
                <span className="text-xs font-mono font-bold text-sky-400">+{config.w4xx}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Client probe error</span>
            </button>

            <button
              type="button"
              onClick={() => triggerEvent(config.w5xx, 'http 500 Internal Server Error', '5xx')}
              className="p-2.5 text-left rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">HTTP 500 Error</span>
                <span className="text-xs font-mono font-bold text-slate-400">+{config.w5xx}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Server error (benign)</span>
            </button>

            <button
              type="button"
              onClick={() => triggerEvent(config.w3xx, 'http 301 Redirect', '3xx')}
              className="p-2.5 text-left rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">HTTP 301 Redirect</span>
                <span className="text-xs font-mono font-bold text-slate-400">+{config.w3xx}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">CMS redirect (benign)</span>
            </button>

            {/* Quick preset scenario button */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Preset Scenarios:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => runScenario('sqli-burst')}
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors w-full"
                >
                  2x SQLi
                </button>
                <button
                  type="button"
                  onClick={() => runScenario('ssh-bruteforce')}
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors w-full"
                >
                  SSH Burst
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Events in Sliding Window vs Expired */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Window Events */}
        <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active in Sliding Window ({validEventsInWindow.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">now - ts &lt;= {config.window}s</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {validEventsInWindow.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active events in window for {targetIp}.
              </div>
            ) : (
              validEventsInWindow.map((e) => {
                const age = currentVirtualTime - e.timestamp;
                const remaining = config.window - age;
                return (
                  <div
                    key={e.id}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{e.reason}</span>
                        <span className="font-mono text-emerald-400 font-bold">+{e.weight} pts</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Logged at {e.formattedTime} · Expires in {remaining}s
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Simulation Audit Log */}
        <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulated Action Log Output</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">{config.actionLog}</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 font-mono text-[11px]">
            {simLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-sans">
                Click event injection buttons above to observe real-time audit logging.
              </div>
            ) : (
              simLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded ${
                    log.isBan
                      ? config.dryRun === 1
                        ? 'bg-amber-950/30 text-amber-300 border border-amber-900/40'
                        : 'bg-rose-950/30 text-rose-300 border border-rose-900/40 font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-900'
                  }`}
                >
                  <span className="text-slate-500 mr-2">{log.time}</span>
                  <span>{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
