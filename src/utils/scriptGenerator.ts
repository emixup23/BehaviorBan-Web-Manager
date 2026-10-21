import { BehaviorBanConfig } from '../types/behaviorban';

export const ORIGINAL_SCRIPT_CONFIG: BehaviorBanConfig = {
  dryRun: 1,
  authLog: "/var/log/auth.log",
  apacheLogs: ["/var/log/apache2/*access*.log"],
  whitelistFile: "/etc/behaviorban/whitelist.txt",
  bannedFile: "/var/lib/behaviorban/banned.list",
  actionLog: "/var/log/behaviorban.log",
  window: 300,
  banScore: 30,
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

export function generateBashScript(cfg: BehaviorBanConfig): string {
  const apacheLogsFormatted = cfg.apacheLogs.length > 0
    ? cfg.apacheLogs.join(" ")
    : "/var/log/apache2/*access*.log";

  // Build custom rules handler code if any enabled
  const enabledCustomRules = (cfg.customRules || []).filter(r => r.enabled && r.weight > 0);
  let customRulesBash = "";
  if (enabledCustomRules.length > 0) {
    customRulesBash = `
    # Custom Rules
` + enabledCustomRules.map(r => `    if [[ $decoded =~ ${r.regex.replace(/'/g, "'\\''")} ]]; then
        add_event "$ip" "${r.weight}" "${r.name.toLowerCase()}: \${uri:0:80}"
    fi`).join('\n');
  }

  return `#!/usr/bin/env bash
# behaviorban.sh - score IPs from auth.log + Apache logs, permanently ban via ufw
# Requires bash >= 5 (Ubuntu 20.04+), ufw, root.
# Generated via BehaviorBan Web Manager

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
    fi${customRulesBash}

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

export function generateSystemdUnit(): string {
  return `[Unit]
Description=BehaviorBan Real-Time IP Scoring & UFW Ban Service
After=network.target ufw.service
Requires=ufw.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/behaviorban.sh
Restart=always
RestartSec=5s
KillMode=process
StandardOutput=append:/var/log/behaviorban.log
StandardError=append:/var/log/behaviorban.log

# Systemd Sandboxing / Hardening
ProtectHome=read-only
ProtectSystem=full
ReadWritePaths=/var/lib/behaviorban /var/log /etc/behaviorban

[Install]
WantedBy=multi-user.target
`;
}

export function generateLogrotate(): string {
  return `/var/log/behaviorban.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
`;
}

export function calculateThresholdHits(score: number, weight: number): number | string {
  if (weight <= 0) return 'Ignored (0 pts)';
  return Math.ceil(score / weight);
}

export function compareConfigDiffs(current: BehaviorBanConfig, original: BehaviorBanConfig = ORIGINAL_SCRIPT_CONFIG): { key: string; label: string; originalVal: string; currentVal: string; changed: boolean }[] {
  const fields: { key: keyof BehaviorBanConfig; label: string }[] = [
    { key: 'dryRun', label: 'Dry Run Mode' },
    { key: 'window', label: 'Sliding Window (s)' },
    { key: 'banScore', label: 'Ban Score Threshold' },
    { key: 'wSshFail', label: 'SSH Failure Weight' },
    { key: 'wSqli', label: 'SQL Injection Weight' },
    { key: 'w4xx', label: 'HTTP 4xx Weight' },
    { key: 'w5xx', label: 'HTTP 5xx Weight' },
    { key: 'w3xx', label: 'HTTP 3xx Weight' },
    { key: 'authLog', label: 'Auth Log Path' },
    { key: 'whitelistFile', label: 'Whitelist Path' },
    { key: 'bannedFile', label: 'Banned List Path' },
    { key: 'actionLog', label: 'Action Log Path' },
  ];

  return fields.map(f => {
    const orig = String(original[f.key]);
    const curr = String(current[f.key]);
    return {
      key: String(f.key),
      label: f.label,
      originalVal: orig,
      currentVal: curr,
      changed: orig !== curr
    };
  });
}
