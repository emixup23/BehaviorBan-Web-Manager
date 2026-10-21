import React, { useState } from 'react';
import { BehaviorBanConfig } from '../types/behaviorban';
import { generateBashScript, generateSystemdUnit, generateLogrotate, compareConfigDiffs } from '../utils/scriptGenerator';
import { Code2, Copy, Check, Download, FileText, Server, GitCompare, ExternalLink, Terminal } from 'lucide-react';

interface ScriptGeneratorViewProps {
  config: BehaviorBanConfig;
}

export const ScriptGeneratorView: React.FC<ScriptGeneratorViewProps> = ({ config }) => {
  const [activeSubTab, setActiveSubTab] = useState<'bash' | 'systemd' | 'logrotate' | 'install' | 'diff'>('bash');
  const [copied, setCopied] = useState<string | null>(null);

  const bashScript = generateBashScript(config);
  const systemdService = generateSystemdUnit();
  const logrotateConf = generateLogrotate();
  const diffs = compareConfigDiffs(config);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
          {[
            { id: 'bash', label: 'behaviorban.sh', icon: Code2 },
            { id: 'systemd', label: 'behaviorban.service', icon: Server },
            { id: 'logrotate', label: 'logrotate.d', icon: FileText },
            { id: 'install', label: 'Deployment Guide', icon: Terminal },
            { id: 'diff', label: 'Config Diffs', icon: GitCompare },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubTab === item.id
                    ? 'bg-slate-800 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'bash' && (
            <>
              <button
                type="button"
                onClick={() => copyText(bashScript, 'bash')}
                className="px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
              >
                {copied === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'bash' ? 'Copied' : 'Copy Script'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadFile(bashScript, 'behaviorban.sh')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sh</span>
              </button>
            </>
          )}

          {activeSubTab === 'systemd' && (
            <>
              <button
                type="button"
                onClick={() => copyText(systemdService, 'systemd')}
                className="px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
              >
                {copied === 'systemd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'systemd' ? 'Copied' : 'Copy Unit'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadFile(systemdService, 'behaviorban.service')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .service</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bash Script Tab */}
      {activeSubTab === 'bash' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-black/90">
          <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">/usr/local/bin/behaviorban.sh</span>
            <span>Target: Ubuntu 20.04+ (bash 5.0+)</span>
          </div>
          <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300 max-h-[600px] select-all">
            <code>{bashScript}</code>
          </pre>
        </div>
      )}

      {/* Systemd Service Unit Tab */}
      {activeSubTab === 'systemd' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0e141f] border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-200">Systemd Service Unit Configuration</p>
            <p>Save this file to <code className="font-mono text-emerald-400">/etc/systemd/system/behaviorban.service</code> to run the script as a resilient background service managed by systemd.</p>
          </div>
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-black/90">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">/etc/systemd/system/behaviorban.service</span>
              <span>Restart=always</span>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300 max-h-[450px] select-all">
              <code>{systemdService}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Logrotate Tab */}
      {activeSubTab === 'logrotate' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0e141f] border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-200">Logrotate Configuration</p>
            <p>Save this configuration to <code className="font-mono text-emerald-400">/etc/logrotate.d/behaviorban</code> to ensure <code className="font-mono text-slate-300">{config.actionLog}</code> is automatically rotated daily and compressed without unbounded disk growth.</p>
          </div>
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-black/90">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">/etc/logrotate.d/behaviorban</span>
              <span>daily rotate 14</span>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300 max-h-[300px] select-all">
              <code>{logrotateConf}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Deployment Guide Tab */}
      {activeSubTab === 'install' && (
        <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Production Installation & Setup Guide</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Step-by-step instructions to deploy BehaviorBan on your Ubuntu / Debian server.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Step 1 */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">1. Install script to /usr/local/bin</span>
                <button
                  onClick={() => copyText('sudo curl -sSL "$APP_URL/api/script" -o /usr/local/bin/behaviorban.sh && sudo chmod +x /usr/local/bin/behaviorban.sh', 'step1')}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copied === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black/60 font-mono text-slate-300 overflow-x-auto">
                sudo chmod +x /usr/local/bin/behaviorban.sh
              </pre>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">2. Create Directories & Initial Whitelist</span>
                <button
                  onClick={() => copyText(`sudo mkdir -p /etc/behaviorban /var/lib/behaviorban\nsudo touch /etc/behaviorban/whitelist.txt /var/lib/behaviorban/banned.list\necho "127.0.0.1" | sudo tee -a /etc/behaviorban/whitelist.txt`, 'step2')}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copied === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black/60 font-mono text-slate-300 overflow-x-auto">
{`sudo mkdir -p /etc/behaviorban /var/lib/behaviorban
sudo touch /etc/behaviorban/whitelist.txt /var/lib/behaviorban/banned.list
echo "127.0.0.1 # Localhost" | sudo tee -a /etc/behaviorban/whitelist.txt`}
              </pre>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">3. Register and Start Systemd Daemon</span>
                <button
                  onClick={() => copyText(`sudo systemctl daemon-reload\nsudo systemctl enable --now behaviorban.service\nsudo systemctl status behaviorban`, 'step3')}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copied === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black/60 font-mono text-slate-300 overflow-x-auto">
{`sudo systemctl daemon-reload
sudo systemctl enable --now behaviorban.service
sudo systemctl status behaviorban`}
              </pre>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">4. Tail Live Audit Logs</span>
                <button
                  onClick={() => copyText('sudo tail -f /var/log/behaviorban.log', 'step4')}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copied === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black/60 font-mono text-slate-300 overflow-x-auto">
                sudo tail -f /var/log/behaviorban.log
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Config Diffs Tab */}
      {activeSubTab === 'diff' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0e141f]">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Configuration Changes vs Default Script</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {diffs.filter((d) => d.changed).length} modified parameters
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 font-semibold">
                <th className="py-2.5 px-4">Parameter</th>
                <th className="py-2.5 px-4">Default Value</th>
                <th className="py-2.5 px-4">Current Custom Value</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {diffs.map((d) => (
                <tr key={d.key} className={d.changed ? 'bg-emerald-950/15' : 'hover:bg-slate-900/30'}>
                  <td className="py-2.5 px-4 text-slate-300 font-sans font-medium">
                    {d.label}
                    <code className="block text-[10px] text-slate-500 font-mono">{d.key}</code>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{d.originalVal}</td>
                  <td className={`py-2.5 px-4 font-semibold ${d.changed ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {d.currentVal}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {d.changed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                        Modified
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">Default</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
