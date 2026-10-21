import React, { useState } from 'react';
import { ActionLogEntry } from '../types/behaviorban';
import { Terminal, Search, Trash2, Download, Filter, RefreshCw } from 'lucide-react';

interface LogViewerProps {
  logs: ActionLogEntry[];
  onRefresh: () => void;
  onClear: () => void;
  actionLogPath: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onRefresh,
  onClear,
  actionLogPath,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isRawView, setIsRawView] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'ALL' || log.type === filterType;
    const matchesSearch =
      search === '' ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      (log.ip && log.ip.includes(search));
    return matchesType && matchesSearch;
  });

  const downloadRawLogs = () => {
    const content = logs.map((l) => `${l.timestamp} ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'behaviorban.log';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Log Header Controls */}
      <div className="p-5 rounded-xl bg-[#0e141f] border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Audit Action Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed of events logged to <code className="font-mono text-emerald-400">{actionLogPath}</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRawView(!isRawView)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors border ${
              isRawView
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {isRawView ? 'Formatted View' : 'Raw Terminal View'}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh logs"
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={downloadRawLogs}
            title="Download log file"
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClear}
            title="Clear logs"
            className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
          {['ALL', 'DRY-RUN', 'BANNED', 'UNBANNED', 'EVENT'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                filterType === t
                  ? 'bg-slate-800 text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs or IP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Logs Container */}
      {isRawView ? (
        <div className="p-4 rounded-xl bg-black/80 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px]">
          {filteredLogs.length === 0 ? (
            <span className="text-slate-600">Log file is currently empty.</span>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="py-0.5 whitespace-pre">
                <span className="text-slate-500">{log.timestamp}</span> {log.message}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0e141f]">
          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No matching action log entries found.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-900/40 transition-colors flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-slate-500 text-[11px]">{log.timestamp}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          log.type === 'BANNED'
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-900/40 font-bold'
                            : log.type === 'DRY-RUN'
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
                            : log.type === 'UNBANNED'
                            ? 'bg-sky-950/40 text-sky-300 border border-sky-900/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.type}
                      </span>
                      {log.ip && (
                        <span className="font-mono text-emerald-400 font-semibold">{log.ip}</span>
                      )}
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] break-all">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
