import React, { useState, useEffect } from 'react';
import { BehaviorBanConfig, WhitelistEntry, BannedEntry, ActionLogEntry } from './types/behaviorban';
import { ORIGINAL_SCRIPT_CONFIG } from './utils/scriptGenerator';
import { Header } from './components/Header';
import { GeneralConfig } from './components/GeneralConfig';
import { ScoringWeights } from './components/ScoringWeights';
import { SqliRegexTester } from './components/SqliRegexTester';
import { IpListsManager } from './components/IpListsManager';
import { AttackSimulator } from './components/AttackSimulator';
import { LogViewer } from './components/LogViewer';
import { ScriptGeneratorView } from './components/ScriptGeneratorView';
import { Shield, Check, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'config' | 'scoring' | 'sqli' | 'lists' | 'simulator' | 'logs' | 'script'>('config');
  const [config, setConfig] = useState<BehaviorBanConfig>(ORIGINAL_SCRIPT_CONFIG);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [bannedList, setBannedList] = useState<BannedEntry[]>([]);
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial data from server or localStorage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, wlRes, banRes, logsRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/whitelist'),
          fetch('/api/banned'),
          fetch('/api/logs'),
        ]);

        if (configRes.ok) {
          const data = await configRes.json();
          if (data.config) setConfig(data.config);
        }
        if (wlRes.ok) {
          const data = await wlRes.json();
          if (data.whitelist) setWhitelist(data.whitelist);
        }
        if (banRes.ok) {
          const data = await banRes.json();
          if (data.banned) setBannedList(data.banned);
        }
        if (logsRes.ok) {
          const data = await logsRes.json();
          if (data.logs) setLogs(data.logs);
        }
      } catch (err) {
        console.warn('Backend API unavailable, using cached state:', err);
        const cached = localStorage.getItem('behaviorban_config');
        if (cached) {
          try {
            setConfig(JSON.parse(cached));
          } catch {}
        }
      }
    };

    fetchData();
  }, []);

  const handleConfigChange = (updated: Partial<BehaviorBanConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('behaviorban_config', JSON.stringify(next));
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        setSaveSuccess(true);
        showToast('Settings saved to behaviorban.sh configuration.');
        setTimeout(() => setSaveSuccess(false), 2500);

        // refresh logs
        const logsRes = await fetch('/api/logs');
        if (logsRes.ok) {
          const lData = await logsRes.json();
          if (lData.logs) setLogs(lData.logs);
        }
      }
    } catch {
      localStorage.setItem('behaviorban_config', JSON.stringify(config));
      setSaveSuccess(true);
      showToast('Settings saved to browser storage.');
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all parameters to original behaviorban.sh defaults?')) return;
    try {
      const res = await fetch('/api/config/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
      } else {
        setConfig(ORIGINAL_SCRIPT_CONFIG);
      }
    } catch {
      setConfig(ORIGINAL_SCRIPT_CONFIG);
    }
    localStorage.removeItem('behaviorban_config');
    showToast('Reset to default script parameters.');
  };

  const handleDownloadScript = () => {
    window.location.href = '/api/script';
  };

  const handleAddWhitelist = async (ip: string, comment: string) => {
    try {
      const res = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, comment }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.whitelist) setWhitelist(data.whitelist);
        showToast(`Added ${ip} to whitelist.`);
      }
    } catch {
      const entry: WhitelistEntry = {
        id: `wl-${Date.now()}`,
        ip,
        comment,
        addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        enabled: true,
      };
      setWhitelist((prev) => [entry, ...prev]);
      showToast(`Added ${ip} to whitelist.`);
    }
  };

  const handleRemoveWhitelist = async (id: string) => {
    try {
      const res = await fetch(`/api/whitelist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.whitelist) setWhitelist(data.whitelist);
      }
    } catch {
      setWhitelist((prev) => prev.filter((item) => item.id !== id));
    }
    showToast('Removed IP from whitelist.');
  };

  const handleAddBanned = async (ip: string, reason: string) => {
    try {
      const res = await fetch('/api/banned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, reason }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.banned) setBannedList(data.banned);
        showToast(`Manually banned ${ip}.`);
      }
    } catch {
      const entry: BannedEntry = {
        id: `ban-${Date.now()}`,
        ip,
        score: config.banScore,
        reason,
        bannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        mode: config.dryRun ? 'dry-run' : 'real',
        status: 'active',
      };
      setBannedList((prev) => [entry, ...prev]);
      showToast(`Manually banned ${ip}.`);
    }
  };

  const handleUnban = async (id: string, ip: string) => {
    try {
      const res = await fetch(`/api/banned/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.banned) setBannedList(data.banned);
      }
    } catch {
      setBannedList((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'unbanned' } : b))
      );
    }
    showToast(`Unbanned ${ip} (ufw delete deny from ${ip})`);
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/logs/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      }
    } catch {
      setLogs([]);
    }
    showToast('Action logs cleared.');
  };

  const handleRefreshLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
        showToast('Logs refreshed.');
      }
    } catch {}
  };

  const handleSimulatedBan = (ip: string, reason: string, score: number) => {
    const entry: BannedEntry = {
      id: `sim-ban-${Date.now()}`,
      ip,
      score,
      reason,
      bannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      mode: config.dryRun === 1 ? 'dry-run' : 'real',
      status: 'active',
    };
    setBannedList((prev) => [entry, ...prev]);

    const logEntry: ActionLogEntry = {
      id: `sim-log-${Date.now()}`,
      timestamp: entry.bannedAt,
      type: config.dryRun === 1 ? 'DRY-RUN' : 'BANNED',
      ip,
      message: `${config.dryRun === 1 ? 'DRY-RUN would ban' : 'BANNED'} ${ip} (${reason})`,
    };
    setLogs((prev) => [logEntry, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c1017] text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSave={handleSave}
        onReset={handleReset}
        onDownloadScript={handleDownloadScript}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'config' && (
          <GeneralConfig config={config} onChange={handleConfigChange} />
        )}

        {activeTab === 'scoring' && (
          <ScoringWeights config={config} onChange={handleConfigChange} />
        )}

        {activeTab === 'sqli' && (
          <SqliRegexTester
            regex={config.sqliRegex}
            wSqli={config.wSqli}
            onChange={(sqliRegex) => handleConfigChange({ sqliRegex })}
          />
        )}

        {activeTab === 'lists' && (
          <IpListsManager
            whitelist={whitelist}
            bannedList={bannedList}
            onAddWhitelist={handleAddWhitelist}
            onRemoveWhitelist={handleRemoveWhitelist}
            onAddBanned={handleAddBanned}
            onUnban={handleUnban}
            whitelistFile={config.whitelistFile}
            bannedFile={config.bannedFile}
          />
        )}

        {activeTab === 'simulator' && (
          <AttackSimulator
            config={config}
            whitelist={whitelist}
            bannedList={bannedList}
            onTriggerSimulatedBan={handleSimulatedBan}
          />
        )}

        {activeTab === 'logs' && (
          <LogViewer
            logs={logs}
            onRefresh={handleRefreshLogs}
            onClear={handleClearLogs}
            actionLogPath={config.actionLog}
          />
        )}

        {activeTab === 'script' && (
          <ScriptGeneratorView config={config} />
        )}
      </main>

      {/* Quiet Footer adhering to anti-slop guidelines */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BehaviorBan Web Manager</span>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>UFW Firewall Integration</span>
            <span>·</span>
            <span>Apache & SSH Log Parser</span>
            <span>·</span>
            <span>Sliding Window Scoring</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
