import React, { useState } from 'react';
import { testSqliPattern, PRESET_SQLI_VECTORS } from '../utils/sqliTester';
import { Database, CheckCircle, XCircle, Play, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import { ORIGINAL_SCRIPT_CONFIG } from '../utils/scriptGenerator';

interface SqliRegexTesterProps {
  regex: string;
  wSqli: number;
  onChange: (regex: string) => void;
}

export const SqliRegexTester: React.FC<SqliRegexTesterProps> = ({ regex, wSqli, onChange }) => {
  const [testUri, setTestUri] = useState<string>(
    '/index.php?dispatch=products.view&product_id=1%20UNION%20SELECT%20username,password%20FROM%20cscart_users--'
  );

  const testResult = testSqliPattern(testUri, regex);

  const tokens = [
    { pattern: 'union...select', desc: 'UNION ALL / UNION SELECT query chaining' },
    { pattern: 'select.+from', desc: 'Nested SELECT queries from tables' },
    { pattern: 'information_schema', desc: 'Metadata database schema reconnaissance' },
    { pattern: 'sleep(', desc: 'Time-based blind injection pause function' },
    { pattern: 'benchmark(', desc: 'Heavy CPU timing delay calculation' },
    { pattern: 'or 1=1', desc: 'Boolean authentication bypass' },
    { pattern: "' or ", desc: 'Quoted boolean tautology injection' },
    { pattern: '-- ', desc: 'SQL inline comment truncation' },
    { pattern: '; drop ', desc: 'Stacked destructive queries' },
    { pattern: 'load_file(', desc: 'Arbitrary filesystem file reads' },
    { pattern: 'into outfile', desc: 'Web shell / file writes to disk' },
    { pattern: 'extractvalue( / updatexml(', desc: 'XPath error-based data extraction' },
  ];

  return (
    <div className="space-y-8">
      {/* Pattern Editor Header */}
      <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>SQL Injection Detection Engine (SQLI_REGEX)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluated against every HTTP request URI after URL decoding and lowercase normalization.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(ORIGINAL_SCRIPT_CONFIG.sqliRegex)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Default Regex</span>
          </button>
        </div>

        {/* Regex Input Textarea */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Bash POSIX Regular Expression (<code className="text-slate-300">SQLI_REGEX</code>)
          </label>
          <textarea
            rows={3}
            value={regex}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-emerald-300 focus:outline-hidden focus:border-emerald-500 leading-relaxed resize-y"
          />
        </div>

        {/* Pattern breakdown chips */}
        <div className="pt-2 border-t border-slate-800/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Covered Attack Vectors:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {tokens.map((t, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                <code className="text-[11px] font-mono text-emerald-400 block truncate" title={t.pattern}>
                  {t.pattern}
                </code>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5" title={t.desc}>
                  {t.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Live URL / Query Tester */}
      <div className="p-6 rounded-xl bg-[#0e141f] border border-slate-800 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Interactive URI Matcher & Scoring Sandbox</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Test how the bash script processes a given URI in Apache access logs. The script decodes percent-encodings and converts to lowercase before testing.
          </p>
        </div>

        {/* URI input */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Sample HTTP Request URI / Query String
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testUri}
              onChange={(e) => setTestUri(e.target.value)}
              placeholder="e.g. /products?id=1' UNION SELECT..."
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setTestUri('')}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Live Evaluation Box */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-300">Normalized URI (Decoded & Lowercased):</span>
            <div className="flex items-center gap-2">
              {testResult.isMatch ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>SQLI MATCHED (+{wSqli} pts)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CLEAN (0 pts)</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/50 border border-slate-800 font-mono text-xs text-slate-300 break-all select-all">
            {testResult.decodedUri || <span className="text-slate-600">(empty URI)</span>}
          </div>

          {testResult.isMatch && testResult.matchedSnippet && (
            <div className="p-3 rounded bg-rose-950/20 border border-rose-900/40 text-xs text-rose-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Detected Malicious Substring:</span>
              </div>
              <code className="block p-1.5 rounded bg-black/60 font-mono text-rose-300 border border-rose-900/50 break-all">
                {testResult.matchedSnippet}
              </code>
              <p className="text-[11px] text-rose-400/80 pt-1">
                Bash action: <code className="font-mono text-slate-300">add_event &quot;$ip&quot; &quot;{wSqli}&quot; &quot;sqli pattern: {testResult.decodedUri.substring(0, 80)}&quot;</code>
              </p>
            </div>
          )}

          {testResult.error && (
            <div className="p-3 rounded bg-amber-950/20 border border-amber-900/40 text-xs text-amber-300">
              {testResult.error}
            </div>
          )}
        </div>

        {/* 1-Click OWASP Test Vectors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              1-Click Benchmark Test Payloads
            </h4>
            <span className="text-[11px] text-slate-500">Click any row to test</span>
          </div>

          <div className="divide-y divide-slate-800/70 border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/40">
            {PRESET_SQLI_VECTORS.map((vec) => (
              <button
                key={vec.id}
                type="button"
                onClick={() => setTestUri(vec.uri)}
                className="w-full p-3 text-left hover:bg-slate-900/70 transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">
                      {vec.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">[{vec.category}]</span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-400 block truncate mt-0.5">
                    {vec.uri}
                  </code>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                      vec.expectedMatch
                        ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                        : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                    }`}
                  >
                    {vec.expectedMatch ? 'Expects Ban' : 'Expects Pass'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
