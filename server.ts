import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Default configuration based on behaviorban.sh
const DEFAULT_CONFIG = {
  dryRun: 1, // 1 = log only, 0 = really ban
  authLog: "/var/log/auth.log",
  apacheLogs: ["/var/log/apache2/*access*.log"],
  whitelistFile: "/etc/behaviorban/whitelist.txt",
  bannedFile: "/var/lib/behaviorban/banned.list",
  actionLog: "/var/log/behaviorban.log",
  window: 300, // sliding window in seconds
  banScore: 30, // ban when score within WINDOW >= this value
  wSshFail: 6,
  wSqli: 15,
  w4xx: 1,
  w5xx: 0,
  w3xx: 0,
  sqliRegex: "union[[:space:]+]*(all[[:space:]+]*)?select|select.+from|information_schema|sleep\\(|benchmark\\(|or[[:space:]+]+1=1|(')[[:space:]]*or[[:space:]]|--[[:space:]]|;[[:space:]]*drop[[:space:]]|load_file\\(|into[[:space:]]+outfile|extractvalue\\(|updatexml\\(",
  customRules: [
    { id: "rule-wp-login", name: "WordPress Login Probe", regex: "wp-login\\.php|xmlrpc\\.php", weight: 3, enabled: false },
    { id: "rule-env-probe", name: "Env / Config Leak Probe", regex: "\\.env|\\.git/config|web\\.config", weight: 8, enabled: false }
  ]
};

const DEFAULT_WHITELIST = [
  { id: "wl-1", ip: "127.0.0.1", comment: "Localhost", addedAt: "2026-10-20 10:00:00", enabled: true },
  { id: "wl-2", ip: "10.0.0.0/8", comment: "Internal VPC Network", addedAt: "2026-10-20 10:00:00", enabled: true },
  { id: "wl-3", ip: "192.168.1.0/24", comment: "Office Admin Subnet", addedAt: "2026-10-20 10:00:00", enabled: true },
  { id: "wl-4", ip: "1.1.1.1", comment: "Cloudflare DNS / Healthcheck", addedAt: "2026-10-20 10:00:00", enabled: true }
];

const DEFAULT_BANNED = [
  { id: "ban-1", ip: "198.51.100.23", score: 32, reason: "score=32 in 300s, last: sqli pattern: /products?id=1%20UNION%20SELECT", bannedAt: "2026-10-21 02:14:09", mode: "dry-run", status: "active" },
  { id: "ban-2", ip: "203.0.113.88", score: 36, reason: "score=36 in 300s, last: ssh failure (6 fails)", bannedAt: "2026-10-21 04:31:22", mode: "real", status: "active" },
  { id: "ban-3", ip: "192.0.2.145", score: 31, reason: "score=31 in 300s, last: http 404 (31 scans)", bannedAt: "2026-10-21 06:12:44", mode: "dry-run", status: "active" },
  { id: "ban-4", ip: "198.51.100.99", score: 30, reason: "score=30 in 300s, last: sqli pattern: /auth?user=admin'--", bannedAt: "2026-10-20 22:45:00", mode: "real", status: "unbanned" }
];

const DEFAULT_LOGS = [
  { id: "log-1", timestamp: "2026-10-21 00:00:01", type: "STARTED", message: "started (DRY_RUN=1, WINDOW=300, BAN_SCORE=30)" },
  { id: "log-2", timestamp: "2026-10-21 02:14:09", type: "DRY-RUN", ip: "198.51.100.23", message: "DRY-RUN would ban 198.51.100.23 (score=32 in 300s, last: sqli pattern: /products?id=1%20UNION%20SELECT)" },
  { id: "log-3", timestamp: "2026-10-21 04:31:22", type: "BANNED", ip: "203.0.113.88", message: "BANNED 203.0.113.88 (score=36 in 300s, last: ssh failure)" },
  { id: "log-4", timestamp: "2026-10-21 06:12:44", type: "DRY-RUN", ip: "192.0.2.145", message: "DRY-RUN would ban 192.0.2.145 (score=31 in 300s, last: http 404)" },
  { id: "log-5", timestamp: "2026-10-21 07:05:18", type: "EVENT", ip: "198.51.100.44", message: "ssh failure from 198.51.100.44 (+6 pts, total=12/30)" }
];

// Persistent state in memory (with fallback file support if running as actual daemon)
let currentConfig = { ...DEFAULT_CONFIG };
let currentWhitelist = [...DEFAULT_WHITELIST];
let currentBanned = [...DEFAULT_BANNED];
let currentLogs = [...DEFAULT_LOGS];

// Generate bash script from config
function generateBashScript(cfg: typeof DEFAULT_CONFIG): string {
  const apacheLogsFormatted = cfg.apacheLogs.length > 0 
    ? cfg.apacheLogs.join(" ") 
    : "/var/log/apache2/*access*.log";

  return `#!/usr/bin/env bash
# behaviorban.sh - score IPs from auth.log + Apache logs, permanently ban via ufw
# Requires bash >= 5 (Ubuntu 20.04+), ufw, root.
# Generated via BehaviorBan Web Manager on ${new Date().toISOString()}

# ---------- CONFIG ----------
DRY_RUN=${cfg.dryRun}                                  # 1 = log only, 0 = really ban
AUTH_LOG="${cfg.authLog}"
APACHE_LOGS=(${apacheLogsFormatted})
WHITELIST_FILE="${cfg.whitelistFile}"   # one IP per line
BANNED_FILE="${cfg.bannedFile}"
ACTION_LOG="${cfg.actionLog}"

WINDOW=${cfg.window}          # sliding window in seconds
BAN_SCORE=${cfg.banScore}        # ban when score within WINDOW >= this value

# points per event
W_SSH_FAIL=${cfg.wSshFail}
W_SQLI=${cfg.wSqli}
W_4XX=${cfg.w4xx}
W_5XX=${cfg.w5xx}             # see warning: server errors are often not the client's fault
W_3XX=${cfg.w3xx}             # redirects are normal on CS-Cart
# ----------------------------

SQLI_REGEX='${cfg.sqliRegex.replace(/'/g, "'\\''")}'

declare -A EVENTS BANNED WL

log() { echo "$(date '+%F %T') $*" | tee -a "$ACTION_LOG" >/dev/null; }

load_state() {
    mkdir -p "$(dirname "$BANNED_FILE")" "$(dirname "$WHITELIST_FILE")"
    touch "$BANNED_FILE" "$WHITELIST_FILE" "$ACTION_LOG"
    local ip
    while read -r ip; do [[ -n $ip ]] && BANNED[$ip]=1; done < "$BANNED_FILE"
    while read -r ip _; do [[ -n $ip && $ip != \\#* ]] && WL[$ip]=1; done < "$WHITELIST_FILE"
}

ban_ip() {
    local ip=$1 reason=$2
    BANNED[$ip]=1
    if (( DRY_RUN )); then
        log "DRY-RUN would ban $ip ($reason)"
        return
    fi
    ufw insert 1 deny from "$ip" to any comment "behaviorban" >/dev/null 2>&1
    echo "$ip" >> "$BANNED_FILE"
    log "BANNED $ip ($reason)"
}

add_event() {            # add_event <ip> <weight> <reason>
    local ip=$1 w=$2 reason=$3 now=$EPOCHSECONDS
    (( w == 0 )) && return
    [[ -n \${WL[$ip]} || -n \${BANNED[$ip]} ]] && return

    local kept="" sum=0 e ts pts
    for e in \${EVENTS[$ip]} "$now:$w"; do
        ts=\${e%%:*}; pts=\${e##*:}
        if (( now - ts <= WINDOW )); then
            kept+="$e "; (( sum += pts ))
        fi
    done
    EVENTS[$ip]=$kept

    if (( sum >= BAN_SCORE )); then
        ban_ip "$ip" "score=$sum in \${WINDOW}s, last: $reason"
        unset 'EVENTS[$ip]'
    fi
}

handle_auth() {
    local line=$1
    if [[ $line =~ (Failed\\ password|Invalid\\ user).*\\ from\\ ([0-9a-fA-F:.]+) ]]; then
        add_event "\${BASH_REMATCH[2]}" "$W_SSH_FAIL" "ssh failure"
    fi
}

handle_apache() {
    local line=$1 ip uri status decoded
    # optional vhost prefix (other_vhosts_access.log), then IP ... "METHOD URI PROTO" STATUS
    if [[ $line =~ ^([^\\ ]+:[0-9]+\\ )?([0-9a-fA-F:.]+)\\ .*\\"[A-Z]+\\ ([^\\ ]*)\\ [^\\"]*\\"\\ ([0-9]{3})\\  ]]; then
        ip=\${BASH_REMATCH[2]}; uri=\${BASH_REMATCH[3]}; status=\${BASH_REMATCH[4]}
    else
        return
    fi

    decoded=$(printf '%b' "\${uri//%/\\\\x}" 2>/dev/null)
    decoded=\${decoded,,}
    if [[ $decoded =~ $SQLI_REGEX ]]; then
        add_event "$ip" "$W_SQLI" "sqli pattern: \${uri:0:80}"
    fi

    case \${status:0:1} in
        4) add_event "$ip" "$W_4XX" "http $status" ;;
        5) add_event "$ip" "$W_5XX" "http $status" ;;
        3) add_event "$ip" "$W_3XX" "http $status" ;;
    esac
}

main() {
    [[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }
    load_state
    log "started (DRY_RUN=$DRY_RUN, WINDOW=$WINDOW, BAN_SCORE=$BAN_SCORE)"

    local current="" line
    tail -Fn0 "$AUTH_LOG" "\${APACHE_LOGS[@]}" 2>/dev/null | while IFS= read -r line; do
        if [[ $line =~ ^==\\>\\ (.*)\\ \\<==$ ]]; then
            current=\${BASH_REMATCH[1]}; continue
        fi
        [[ -z $line ]] && continue
        if [[ $current == "$AUTH_LOG" ]]; then
            handle_auth "$line"
        else
            handle_apache "$line"
        fi
    done
}

main
`;
}

// Generate systemd service unit
function generateSystemdUnit(cfg: typeof DEFAULT_CONFIG): string {
  return `[Unit]
Description=BehaviorBan Real-Time IP Scoring and UFW Ban Service
After=network.target ufw.service
Requires=ufw.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/behaviorban.sh
Restart=always
RestartSec=5s
KillMode=process

# Hardening options
ProtectHome=read-only
ProtectSystem=full
ReadWritePaths=/var/lib/behaviorban /var/log /etc/behaviorban

[Install]
WantedBy=multi-user.target
`;
}

// API Routes
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: currentConfig });
});

app.post('/api/config', (req: Request, res: Response) => {
  currentConfig = { ...currentConfig, ...req.body };
  currentLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    type: 'EVENT',
    message: `Configuration updated: DRY_RUN=${currentConfig.dryRun}, WINDOW=${currentConfig.window}s, BAN_SCORE=${currentConfig.banScore}`
  });
  res.json({ success: true, config: currentConfig });
});

app.post('/api/config/reset', (_req: Request, res: Response) => {
  currentConfig = { ...DEFAULT_CONFIG };
  res.json({ success: true, config: currentConfig });
});

app.get('/api/whitelist', (_req: Request, res: Response) => {
  res.json({ success: true, whitelist: currentWhitelist });
});

app.post('/api/whitelist', (req: Request, res: Response) => {
  const { ip, comment } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP or CIDR is required' });
  }
  const entry = {
    id: `wl-${Date.now()}`,
    ip: ip.trim(),
    comment: comment ? comment.trim() : '',
    addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    enabled: true
  };
  currentWhitelist.unshift(entry);
  currentLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    type: 'EVENT',
    message: `Added IP to whitelist: ${entry.ip} ${entry.comment ? `(${entry.comment})` : ''}`
  });
  res.json({ success: true, entry, whitelist: currentWhitelist });
});

app.delete('/api/whitelist/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  currentWhitelist = currentWhitelist.filter(item => item.id !== id);
  res.json({ success: true, whitelist: currentWhitelist });
});

app.get('/api/banned', (_req: Request, res: Response) => {
  res.json({ success: true, banned: currentBanned });
});

app.post('/api/banned', (req: Request, res: Response) => {
  const { ip, reason, mode } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP is required' });
  }
  const entry = {
    id: `ban-${Date.now()}`,
    ip: ip.trim(),
    score: currentConfig.banScore,
    reason: reason || 'Manually banned via Web Manager',
    bannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    mode: mode || (currentConfig.dryRun ? 'dry-run' : 'real'),
    status: 'active' as const
  };
  currentBanned.unshift(entry);
  currentLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: entry.bannedAt,
    type: entry.mode === 'dry-run' ? 'DRY-RUN' : 'BANNED',
    ip: entry.ip,
    message: `${entry.mode === 'dry-run' ? 'DRY-RUN would ban' : 'BANNED'} ${entry.ip} (${entry.reason})`
  });
  res.json({ success: true, entry, banned: currentBanned });
});

app.delete('/api/banned/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const target = currentBanned.find(b => b.id === id);
  if (target) {
    target.status = 'unbanned';
    currentLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: 'UNBANNED',
      ip: target.ip,
      message: `UNBANNED ${target.ip} (ufw delete deny from ${target.ip})`
    });
  }
  res.json({ success: true, banned: currentBanned });
});

app.get('/api/logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: currentLogs });
});

app.post('/api/logs/clear', (_req: Request, res: Response) => {
  currentLogs = [
    {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: 'STARTED',
      message: 'Log history cleared by administrator.'
    }
  ];
  res.json({ success: true, logs: currentLogs });
});

app.get('/api/script', (_req: Request, res: Response) => {
  const script = generateBashScript(currentConfig);
  res.setHeader('Content-Type', 'text/x-shellscript');
  res.setHeader('Content-Disposition', 'attachment; filename="behaviorban.sh"');
  res.send(script);
});

app.get('/api/service', (_req: Request, res: Response) => {
  const service = generateSystemdUnit(currentConfig);
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="behaviorban.service"');
  res.send(service);
});

// Start server and mount Vite
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
