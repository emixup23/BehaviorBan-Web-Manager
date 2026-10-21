import React, { useState } from 'react';
import { WhitelistEntry, BannedEntry } from '../types/behaviorban';
import { ShieldCheck, Ban, Plus, Trash2, Search, Download, Upload, Copy, Check, Terminal } from 'lucide-react';

interface IpListsManagerProps {
  whitelist: WhitelistEntry[];
  bannedList: BannedEntry[];
  onAddWhitelist: (ip: string, comment: string) => Promise<void>;
  onRemoveWhitelist: (id: string) => Promise<void>;
  onAddBanned: (ip: string, reason: string) => Promise<void>;
  onUnban: (id: string, ip: string) => Promise<void>;
  whitelistFile: string;
  bannedFile: string;
}

export const IpListsManager: React.FC<IpListsManagerProps> = ({
  whitelist,
  bannedList,
  onAddWhitelist,
  onRemoveWhitelist,
  onAddBanned,
  onUnban,
  whitelistFile,
  bannedFile,
}) => {
  const [activeTab, setActiveTab] = useState<'whitelist' | 'banned'>('whitelist');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Whitelist form state
  const [wlIp, setWlIp] = useState('');
  const [wlComment, setWlComment] = useState('');
  const [showBulkWhitelist, setShowBulkWhitelist] = useState(false);
  const [bulkWlText, setBulkWlText] = useState('');

  // Banned form state
  const [banIp, setBanIp] = useState('');
  const [banReason, setBanReason] = useState('Manual administrative ban');
  const [showManualBanModal, setShowManualBanModal] = useState(false);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wlIp.trim()) return;
    await onAddWhitelist(wlIp.trim(), wlComment.trim());
    setWlIp('');
    setWlComment('');
  };

  const handleBulkWlSubmit = async () => {
    const lines = bulkWlText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [ip, ...commentParts] = trimmed.split(/[\s#]+/);
      if (ip) {
        await onAddWhitelist(ip, commentParts.join(' '));
      }
    }
    setBulkWlText('');
    setShowBulkWhitelist(false);
  };

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banIp.trim()) return;
    await onAddBanned(banIp.trim(), banReason.trim());
    setBanIp('');
    setBanReason('Manual administrative ban');
    setShowManualBanModal(false);
  };

  // Filtered entries
  const filteredWhitelist = whitelist.filter(
    (item) =>
      item.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBanned = bannedList.filter(
    (item) =>
      item.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('whitelist')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'whitelist'
                ? 'bg-slate-800 text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>IP Whitelist ({whitelist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('banned')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'banned'
                ? 'bg-slate-800 text-rose-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span>Banned IPs ({bannedList.filter((b) => b.status === 'active').length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab === 'whitelist' ? 'whitelisted' : 'banned'} IPs...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Whitelist Panel */}
      {activeTab === 'whitelist' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Whitelisted IPs & CIDR Subnets</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stored at <code className="font-mono text-emerald-400">{whitelistFile}</code>. Matching IPs bypass all scoring and are never banned.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkWhitelist(!showBulkWhitelist)}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bulk Import</span>
                </button>
              </div>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddWhitelist} className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="IP or CIDR (e.g. 192.168.1.50 or 10.0.0.0/8)"
                  value={wlIp}
                  onChange={(e) => setWlIp(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Optional Comment (e.g. Office VPN Gateway)"
                  value={wlComment}
                  onChange={(e) => setWlComment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!wlIp.trim()}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-md flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add IP</span>
                </button>
              </div>
            </form>

            {/* Bulk Import Drawer */}
            {showBulkWhitelist && (
              <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Paste Multiple IPs (one per line, # comment allowed):</span>
                  <button
                    type="button"
                    onClick={() => setShowBulkWhitelist(false)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={bulkWlText}
                  onChange={(e) => setBulkWlText(e.target.value)}
                  placeholder={`192.168.1.1 # Gateway\n10.0.0.0/8 # Internal\n1.1.1.1`}
                  className="w-full p-2.5 text-xs font-mono bg-black/60 border border-slate-800 rounded text-slate-300 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleBulkWlSubmit}
                  disabled={!bulkWlText.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
                >
                  Import All Lines
                </button>
              </div>
            )}
          </div>

          {/* Whitelist Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0e141f]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                  <th className="py-2.5 px-4">IP / CIDR</th>
                  <th className="py-2.5 px-4">Comment</th>
                  <th className="py-2.5 px-4 hidden md:table-cell">Added At</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredWhitelist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No whitelisted IPs found. Add trusted IP addresses above.
                    </td>
                  </tr>
                ) : (
                  filteredWhitelist.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-emerald-400 font-medium">
                        {entry.ip}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {entry.comment || <span className="text-slate-600 italic">None</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] hidden md:table-cell">
                        {entry.addedAt}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(entry.ip, entry.id)}
                            title="Copy IP"
                            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveWhitelist(entry.id)}
                            title="Remove from whitelist"
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Banned IPs Panel */}
      {activeTab === 'banned' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Permanently Blocked IP Addresses</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stored at <code className="font-mono text-rose-400">{bannedFile}</code>. Unbanning removes the IP and provides the exact UFW unblock command.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualBanModal(true)}
                  className="px-3 py-1.5 text-xs text-rose-200 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual Ban IP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Manual Ban Modal */}
          {showManualBanModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="w-full max-w-md p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Manual IP Ban</span>
                </h3>
                <form onSubmit={handleManualBan} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">IP Address to Block</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 198.51.100.99"
                      value={banIp}
                      onChange={(e) => setBanIp(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Ban</label>
                    <input
                      type="text"
                      placeholder="e.g. Manual security mitigation"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualBanModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors"
                    >
                      Confirm Ban
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Banned Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0e141f]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                  <th className="py-2.5 px-4">Banned IP</th>
                  <th className="py-2.5 px-4">Reason & Score</th>
                  <th className="py-2.5 px-4 hidden lg:table-cell">Mode</th>
                  <th className="py-2.5 px-4 hidden md:table-cell">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredBanned.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No banned IPs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredBanned.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        entry.status === 'unbanned' ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-rose-400">
                        {entry.ip}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-md truncate" title={entry.reason}>
                        <span className="font-mono text-slate-400">[{entry.score} pts]</span> {entry.reason}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            entry.mode === 'dry-run'
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-900/30'
                              : 'bg-rose-950/40 text-rose-300 border border-rose-900/30'
                          }`}
                        >
                          {entry.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] hidden md:table-cell">
                        {entry.bannedAt}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {entry.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => onUnban(entry.id, entry.ip)}
                            className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 border border-rose-900/60 rounded-md transition-colors"
                          >
                            Unban (ufw delete)
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Unbanned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
