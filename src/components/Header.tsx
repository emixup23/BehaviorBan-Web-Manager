import React from 'react';
import { Shield, Play, Eye, RotateCcw, Download, Check, Save } from 'lucide-react';
import { BehaviorBanConfig } from '../types/behaviorban';

interface HeaderProps {
  config: BehaviorBanConfig;
  activeTab: 'config' | 'scoring' | 'sqli' | 'lists' | 'simulator' | 'logs' | 'script';
  setActiveTab: (tab: 'config' | 'scoring' | 'sqli' | 'lists' | 'simulator' | 'logs' | 'script') => void;
  onSave: () => void;
  onReset: () => void;
  onDownloadScript: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  onSave,
  onReset,
  onDownloadScript,
  isSaving,
  saveSuccess,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0c1017]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Bar Zone Contract: Zone 1 (Brand) - Zone 2 (Nav Links) - Zone 3 (Primary Action) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single Brand element */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            BehaviorBan
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {[
            { id: 'config', label: 'General' },
            { id: 'scoring', label: 'Weights' },
            { id: 'sqli', label: 'SQLi Regex' },
            { id: 'lists', label: 'IP Control' },
            { id: 'simulator', label: 'Simulator' },
            { id: 'logs', label: 'Action Log' },
            { id: 'script', label: 'Script & Service' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700/60 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Quick Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onReset}
            title="Reset to original script defaults"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-md transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onDownloadScript}
            title="Download behaviorban.sh script"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Download .sh</span>
          </button>

          <button
            onClick={onSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-xs'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Clean Status & Context Strip */}
      <div className="border-t border-slate-800/50 bg-[#090d14]/70 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Active Policy:</span>
            <span className={config.dryRun === 1 ? 'text-amber-400' : 'text-rose-400'}>
              {config.dryRun === 1 ? 'DRY-RUN (Log Only)' : 'ENFORCE (UFW Ban Active)'}
            </span>
            <span className="text-slate-600">·</span>
            <span>Window: <span className="font-mono text-slate-300">{config.window}s</span></span>
            <span className="text-slate-600">·</span>
            <span>Threshold: <span className="font-mono text-slate-300">{config.banScore} pts</span></span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline">SQLi: <span className="font-mono text-slate-300">+{config.wSqli}</span></span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline">SSH Fail: <span className="font-mono text-slate-300">+{config.wSshFail}</span></span>
          </div>

          {/* Mobile Tab Scroller */}
          <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            {[
              { id: 'config', label: 'General' },
              { id: 'scoring', label: 'Weights' },
              { id: 'sqli', label: 'SQLi' },
              { id: 'lists', label: 'IPs' },
              { id: 'simulator', label: 'Sim' },
              { id: 'logs', label: 'Logs' },
              { id: 'script', label: 'Script' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-2 py-0.5 text-xs rounded transition-colors whitespace-nowrap ${
                  activeTab === item.id ? 'bg-slate-700 text-emerald-400' : 'text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
