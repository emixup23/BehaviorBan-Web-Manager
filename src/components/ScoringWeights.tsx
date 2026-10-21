import React, { useState } from 'react';
import { BehaviorBanConfig, CustomRule } from '../types/behaviorban';
import { calculateThresholdHits } from '../utils/scriptGenerator';
import { Zap, ShieldAlert, KeyRound, Database, Globe, AlertCircle, Plus, Trash2, HelpCircle } from 'lucide-react';

interface ScoringWeightsProps {
  config: BehaviorBanConfig;
  onChange: (updated: Partial<BehaviorBanConfig>) => void;
}

export const ScoringWeights: React.FC<ScoringWeightsProps> = ({ config, onChange }) => {
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleRegex, setNewRuleRegex] = useState('');
  const [newRuleWeight, setNewRuleWeight] = useState(5);

  const addCustomRule = () => {
    if (!newRuleName.trim() || !newRuleRegex.trim()) return;
    const rule: CustomRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      regex: newRuleRegex.trim(),
      weight: newRuleWeight,
      enabled: true,
    };
    onChange({ customRules: [...(config.customRules || []), rule] });
    setNewRuleName('');
    setNewRuleRegex('');
    setNewRuleWeight(5);
  };

  const removeCustomRule = (id: string) => {
    onChange({ customRules: (config.customRules || []).filter((r) => r.id !== id) });
  };

  const toggleCustomRule = (id: string) => {
    onChange({
      customRules: (config.customRules || []).map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    });
  };

  const weights = [
    {
      key: 'wSqli' as const,
      label: 'SQL Injection Pattern',
      varName: 'W_SQLI',
      weight: config.wSqli,
      icon: Database,
      accent: 'text-rose-400',
      description: 'Triggered when decoded URI matches SQLI_REGEX (union select, sleep(), information_schema, etc.)',
      defaultVal: 15,
      recommendation: 'Keep high (>= 15). 2 attempts usually indicate deliberate vulnerability exploitation.'
    },
    {
      key: 'wSshFail' as const,
      label: 'SSH Authentication Failure',
      varName: 'W_SSH_FAIL',
      weight: config.wSshFail,
      icon: KeyRound,
      accent: 'text-amber-400',
      description: 'Triggered when auth.log reports "Failed password" or "Invalid user"',
      defaultVal: 6,
      recommendation: '6 points allows 5 failed attempts in 5 minutes before banning (30 / 6 = 5).'
    },
    {
      key: 'w4xx' as const,
      label: 'HTTP 4xx Client Error',
      varName: 'W_4XX',
      weight: config.w4xx,
      icon: Globe,
      accent: 'text-sky-400',
      description: 'Triggered on 404 Not Found, 403 Forbidden, 401 Unauthorized scans',
      defaultVal: 1,
      recommendation: 'Low weight (1 point). Protects against directory bruteforcing without punishing broken image links.'
    },
    {
      key: 'w5xx' as const,
      label: 'HTTP 5xx Server Error',
      varName: 'W_5XX',
      weight: config.w5xx,
      icon: AlertCircle,
      accent: 'text-slate-400',
      description: 'Triggered on 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable',
      defaultVal: 0,
      note: "Script author warning: Server errors are often not the client's fault.",
      recommendation: '0 is strongly advised to avoid banning legitimate users during application hiccups.'
    },
    {
      key: 'w3xx' as const,
      label: 'HTTP 3xx Redirect',
      varName: 'W_3XX',
      weight: config.w3xx,
      icon: Globe,
      accent: 'text-slate-400',
      description: 'Triggered on 301 Moved Permanently, 302 Found, 307 Temporary Redirect',
      defaultVal: 0,
      note: 'Script author warning: Redirects are normal on CS-Cart and standard CMSs.',
      recommendation: '0 is recommended. Normal browsing generates multiple redirects.'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview & Quick Ban Matrix */}
      <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Event Threat Weights & Ban Threshold Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Every matched security event adds points to the IP's sliding window ledger. Below is how many occurrences alone trigger an automatic ban at <span className="font-mono text-emerald-400 font-semibold">{config.banScore} pts</span> within <span className="font-mono text-emerald-400">{config.window}s</span>.
            </p>
          </div>
        </div>

        {/* Calculated Hits to Ban Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">SQLi Attempts</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-rose-400">
                {calculateThresholdHits(config.banScore, config.wSqli)}
              </span>
              <span className="text-xs text-slate-500">hits</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">+{config.wSqli} pts / hit</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">SSH Auth Fails</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-amber-400">
                {calculateThresholdHits(config.banScore, config.wSshFail)}
              </span>
              <span className="text-xs text-slate-500">fails</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">+{config.wSshFail} pts / hit</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">HTTP 4xx Errors</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-sky-400">
                {calculateThresholdHits(config.banScore, config.w4xx)}
              </span>
              <span className="text-xs text-slate-500">requests</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">+{config.w4xx} pts / hit</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">HTTP 5xx Errors</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-sm font-bold font-mono text-slate-400">
                {calculateThresholdHits(config.banScore, config.w5xx)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">+{config.w5xx} pts / hit</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">HTTP 3xx Redirects</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-sm font-bold font-mono text-slate-400">
                {calculateThresholdHits(config.banScore, config.w3xx)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">+{config.w3xx} pts / hit</span>
          </div>
        </div>
      </div>

      {/* Main Scoring Sliders List */}
      <div className="space-y-4">
        {weights.map((w) => {
          const Icon = w.icon;
          return (
            <div
              key={w.key}
              className="p-5 rounded-xl bg-[#0e141f] border border-slate-800 hover:border-slate-700/80 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-xl">
                  <div className={`p-2.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 ${w.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">{w.label}</h3>
                      <code className="text-xs font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {w.varName}
                      </code>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{w.description}</p>
                    {w.note && (
                      <p className="text-[11px] text-amber-300/90 mt-1.5 flex items-center gap-1.5 bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{w.note}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Slider and Input */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-36 sm:w-44">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={w.weight}
                      onChange={(e) => onChange({ [w.key]: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={w.weight}
                      onChange={(e) => onChange({ [w.key]: Math.max(0, Number(e.target.value)) })}
                      className="w-16 px-2.5 py-1 text-sm font-mono text-center bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="text-xs text-slate-500">pts</span>
                  </div>
                </div>
              </div>

              {/* Recommendation Footer */}
              <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
                <span>{w.recommendation}</span>
                <button
                  type="button"
                  onClick={() => onChange({ [w.key]: w.defaultVal })}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Reset to default ({w.defaultVal} pts)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Pattern Rules Section */}
      <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Custom Attack Probing Rules (Optional Extension)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Extend <code className="font-mono text-slate-300">handle_apache()</code> with additional regex signatures for scanning bots (e.g. WordPress, .env, phpMyAdmin).
          </p>
        </div>

        {/* Existing Custom Rules */}
        <div className="space-y-2">
          {(config.customRules || []).map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 transition-colors ${
                rule.enabled
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-slate-950/30 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleCustomRule(rule.id)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{rule.name}</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30">
                      +{rule.weight} pts
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                    {rule.regex}
                  </code>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeCustomRule(rule.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                title="Remove rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Custom Rule Form */}
        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Rule Name (e.g. Git Leak)"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Regex pattern (e.g. \.git/)"
              value={newRuleRegex}
              onChange={(e) => setNewRuleRegex(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <input
              type="number"
              min="1"
              max="50"
              placeholder="Pts"
              value={newRuleWeight}
              onChange={(e) => setNewRuleWeight(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={addCustomRule}
              disabled={!newRuleName.trim() || !newRuleRegex.trim()}
              className="w-full h-full px-2 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-md flex items-center justify-center transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
