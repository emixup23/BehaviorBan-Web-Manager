import React, { useState } from 'react';
import { BehaviorBanConfig } from '../types/behaviorban';
import { AlertTriangle, Clock, ShieldAlert, Folder, Plus, X, Info } from 'lucide-react';

interface GeneralConfigProps {
  config: BehaviorBanConfig;
  onChange: (updated: Partial<BehaviorBanConfig>) => void;
}

export const GeneralConfig: React.FC<GeneralConfigProps> = ({ config, onChange }) => {
  const [newLogPath, setNewLogPath] = useState('');

  const windowPresets = [
    { label: '1 min', value: 60 },
    { label: '3 min', value: 180 },
    { label: '5 min (Default)', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
    { label: '1 hour', value: 3600 },
  ];

  const scorePresets = [
    { label: '15 (Strict)', value: 15 },
    { label: '30 (Default)', value: 30 },
    { label: '50 (Moderate)', value: 50 },
    { label: '100 (Lenient)', value: 100 },
  ];

  const addApacheLog = () => {
    if (!newLogPath.trim()) return;
    const clean = newLogPath.trim();
    if (!config.apacheLogs.includes(clean)) {
      onChange({ apacheLogs: [...config.apacheLogs, clean] });
    }
    setNewLogPath('');
  };

  const removeApacheLog = (index: number) => {
    const updated = config.apacheLogs.filter((_, i) => i !== index);
    onChange({ apacheLogs: updated });
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Daemon Operating Parameters</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Controls how <code className="text-emerald-400 font-mono text-xs">behaviorban.sh</code> aggregates threat scores, detects attacks, and interfaces with UFW.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Requires: <strong className="text-slate-200">bash &gt;= 5.0</strong></span>
          <span>·</span>
          <span><strong className="text-slate-200">ufw</strong></span>
          <span>·</span>
          <span><strong className="text-slate-200">root</strong></span>
        </div>
      </div>

      {/* Primary Operation Mode (DRY_RUN) */}
      <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">Enforcement Mode</h3>
              <span className="font-mono text-xs text-slate-400">DRY_RUN</span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Choose whether offending IPs are actually denied in the Linux kernel via UFW or only logged for inspection and fine-tuning.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ dryRun: 1 })}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                config.dryRun === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DRY_RUN=1 (Log Only)
            </button>
            <button
              type="button"
              onClick={() => onChange({ dryRun: 0 })}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                config.dryRun === 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DRY_RUN=0 (Real UFW Ban)
            </button>
          </div>
        </div>

        {config.dryRun === 1 ? (
          <div className="mt-4 p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 flex items-start gap-3 text-xs text-amber-200/90">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Safe Simulation Mode Active:</strong> When an IP exceeds the score threshold within the sliding window, the script outputs <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">DRY-RUN would ban &lt;IP&gt;</code> to <code className="font-mono text-amber-300">{config.actionLog}</code>. No UFW firewall rules are inserted.
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-950/20 border border-rose-800/40 flex items-start gap-3 text-xs text-rose-200/90">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong>Production Enforcement Active:</strong> Offending IPs will be permanently blocked using <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-rose-300">ufw insert 1 deny from $ip to any comment &quot;behaviorban&quot;</code> and appended to <code className="font-mono text-rose-300">{config.bannedFile}</code>. Ensure your management IP is in the whitelist!
            </div>
          </div>
        )}
      </div>

      {/* Threshold & Sliding Window Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sliding Window */}
        <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">Sliding Window</h3>
              </div>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded">
                WINDOW={config.window}s
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Time period in seconds during which threat points accumulate. Events older than {config.window}s automatically expire from memory.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="30"
                  max="1800"
                  step="30"
                  value={config.window}
                  onChange={(e) => onChange({ window: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <input
                  type="number"
                  min="10"
                  max="86400"
                  value={config.window}
                  onChange={(e) => onChange({ window: Math.max(1, Number(e.target.value)) })}
                  className="w-24 px-2.5 py-1 text-sm font-mono text-right bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500">Presets:</span>
                {windowPresets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onChange({ window: p.value })}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      config.window === p.value
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-slate-500 flex justify-between">
            <span>Human-readable duration</span>
            <span className="font-mono text-slate-300">
              {Math.floor(config.window / 60)} min {config.window % 60 > 0 ? `${config.window % 60}s` : ''}
            </span>
          </div>
        </div>

        {/* Ban Score Threshold */}
        <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">Ban Score Threshold</h3>
              </div>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded">
                BAN_SCORE={config.banScore}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              When an IP accumulates points <code className="font-mono text-slate-300">&gt;= {config.banScore}</code> within the sliding window, it is banned and its event counter is cleared.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={config.banScore}
                  onChange={(e) => onChange({ banScore: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.banScore}
                  onChange={(e) => onChange({ banScore: Math.max(1, Number(e.target.value)) })}
                  className="w-24 px-2.5 py-1 text-sm font-mono text-right bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500">Presets:</span>
                {scorePresets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onChange({ banScore: p.value })}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      config.banScore === p.value
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-slate-500 flex justify-between">
            <span>Points required to trigger ban</span>
            <span className="font-mono text-slate-300">{config.banScore} pts</span>
          </div>
        </div>
      </div>

      {/* Log Files & System Paths */}
      <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span>Log & State File Paths</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Specify the log files monitored by <code className="font-mono text-slate-300">tail -Fn0</code> and the local database locations for whitelist and bans.
          </p>
        </div>

        <div className="space-y-4">
          {/* AUTH_LOG */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <span>SSH Auth Log Path</span>
                <span className="font-mono text-[11px] text-slate-500">AUTH_LOG</span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onChange({ authLog: '/var/log/auth.log' })}
                  className="text-slate-400 hover:text-emerald-400 hover:underline"
                >
                  Ubuntu/Debian
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => onChange({ authLog: '/var/log/secure' })}
                  className="text-slate-400 hover:text-emerald-400 hover:underline"
                >
                  RHEL/CentOS
                </button>
              </div>
            </div>
            <input
              type="text"
              value={config.authLog}
              onChange={(e) => onChange({ authLog: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
              placeholder="/var/log/auth.log"
            />
          </div>

          {/* APACHE_LOGS Multi-Pattern */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <span>Web Access Logs (Globs / Paths)</span>
                <span className="font-mono text-[11px] text-slate-500">APACHE_LOGS</span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (!config.apacheLogs.includes('/var/log/apache2/*access*.log')) {
                      onChange({ apacheLogs: [...config.apacheLogs, '/var/log/apache2/*access*.log'] });
                    }
                  }}
                  className="text-slate-400 hover:text-emerald-400 hover:underline"
                >
                  + Apache2
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!config.apacheLogs.includes('/var/log/nginx/*access*.log')) {
                      onChange({ apacheLogs: [...config.apacheLogs, '/var/log/nginx/*access*.log'] });
                    }
                  }}
                  className="text-slate-400 hover:text-emerald-400 hover:underline"
                >
                  + Nginx
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!config.apacheLogs.includes('/var/log/httpd/*access*.log')) {
                      onChange({ apacheLogs: [...config.apacheLogs, '/var/log/httpd/*access*.log'] });
                    }
                  }}
                  className="text-slate-400 hover:text-emerald-400 hover:underline"
                >
                  + RHEL httpd
                </button>
              </div>
            </div>

            {/* Existing log paths */}
            <div className="space-y-2 mb-2">
              {config.apacheLogs.map((logPath, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={logPath}
                    onChange={(e) => {
                      const updated = [...config.apacheLogs];
                      updated[index] = e.target.value;
                      onChange({ apacheLogs: updated });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeApacheLog(index)}
                    title="Remove path"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new log path */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLogPath}
                onChange={(e) => setNewLogPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addApacheLog()}
                placeholder="/var/log/apache2/*access*.log or /var/log/nginx/*access.log"
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950/60 border border-dashed border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addApacheLog}
                disabled={!newLogPath.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-md flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Path</span>
              </button>
            </div>
          </div>

          {/* Database & State Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Whitelist File <span className="font-mono text-slate-500 text-[10px]">WHITELIST_FILE</span>
              </label>
              <input
                type="text"
                value={config.whitelistFile}
                onChange={(e) => onChange({ whitelistFile: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Banned IPs List <span className="font-mono text-slate-500 text-[10px]">BANNED_FILE</span>
              </label>
              <input
                type="text"
                value={config.bannedFile}
                onChange={(e) => onChange({ bannedFile: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Action Audit Log <span className="font-mono text-slate-500 text-[10px]">ACTION_LOG</span>
              </label>
              <input
                type="text"
                value={config.actionLog}
                onChange={(e) => onChange({ actionLog: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
