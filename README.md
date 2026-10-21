# BehaviorBan Web Manager

**A web-based management interface for BehaviorBan — configurable behavior scoring and automated firewall rule management for Linux servers.**

BehaviorBan Web Manager provides a graphical interface for configuring a Bash-based security tool. It is designed to simplify the management of behavior-scoring parameters, IP whitelists, ban thresholds, and UFW firewall rule generation.

> **Project status:** Under development. Verify the available functionality and deployment requirements before using it on production servers.

## ✨ Features

- **Behavior Scoring Configuration** — Configure scoring weights used to evaluate suspicious activity.
- **Sliding Time Window** — Adjust the time window used by the scoring system.
- **IP Whitelist Management** — Configure trusted IP addresses that should be excluded from automated blocking.
- **Configurable Ban Thresholds** — Adjust the score threshold that triggers a ban.
- **UFW Rule Generation** — Generate firewall rules based on configured ban policies.
- **Web-Based Management** — Manage security settings through a graphical interface.
- **Linux Security Automation** — Designed to complement Bash-based server security workflows.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe development |
| Vite | Frontend development and build tooling |
| Tailwind CSS | Interface styling |
| Express | Node.js server |
| Lucide React | Interface icons |
| Motion | UI animations |

## 📋 Requirements

- Linux, macOS, or Windows development environment
- Node.js and npm compatible with the installed project dependencies
- Git
- UFW on the target Linux server if applying generated firewall rules

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/emixup23/BehaviorBan-Web-Manager.git
cd BehaviorBan-Web-Manager
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Start by reviewing the example environment file:

```bash
cat .env.example
```

Create your local environment file if required by the application:

```bash
cp .env.example .env
```

Edit `.env` and configure the variables required by your environment.

**Important:** Never commit real credentials, API keys, or other secrets to GitHub.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

### 5. Build for production

```bash
npm run build
```

The production frontend build is generated using Vite.

### 6. Run the TypeScript checks

```bash
npm run lint
```

This command runs the configured TypeScript compiler checks without emitting files.

## ⚙️ Configuration

BehaviorBan is designed around configurable security policies.

| Setting | Description |
|---|---|
| Scoring weights | Assign weights to supported behavioral indicators |
| Sliding window | Define the time period used for evaluating activity |
| IP whitelist | Maintain trusted IP addresses or ranges, according to supported input formats |
| Ban threshold | Define the score at which a blocking action is triggered |
| UFW rules | Generate firewall rules from the configured policy |

The exact configuration fields, accepted values, and persistence mechanism depend on the implementation of the corresponding backend and Bash script.

## 🔐 Security Considerations

BehaviorBan is intended to support Linux server security operations. Firewall automation must be implemented and tested carefully.

- **Protect administrative access:** Do not expose the management interface publicly without appropriate authentication and access controls.
- **Validate IP addresses:** Validate and normalize all IP addresses and CIDR ranges before processing them.
- **Protect SSH access:** Ensure your administrative IP addresses and required management ports are not accidentally blocked.
- **Use least privilege:** Avoid running the web application as root. If firewall changes require elevated privileges, use a narrowly scoped privileged helper.
- **Review generated rules:** Validate firewall changes before applying them to production systems.
- **Keep an audit trail:** Record configuration changes, generated rules, and blocking decisions where supported.
- **Test recovery procedures:** Maintain console or out-of-band access before enabling automated blocking.

> **Warning:** Incorrect firewall rules can interrupt SSH connectivity and cause service outages. Test changes in a controlled environment before applying them to production servers.

## 🧪 Development Workflow

Useful commands:

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Check TypeScript
npm run lint

# Generate production build
npm run build

# Preview the production frontend
npm run preview
```

The preview command serves the built frontend. It should not be assumed to provide the complete production deployment of the Express server.

## 🗺️ Roadmap

Potential improvements include:

- [ ] Integrate the web interface with the BehaviorBan Bash engine.
- [ ] Add configuration validation and safer defaults.
- [ ] Implement secure authentication and role-based access control.
- [ ] Add an audit log for configuration changes and firewall actions.
- [ ] Provide dry-run mode for reviewing firewall rules.
- [ ] Add a dashboard for scoring events and ban statistics.
- [ ] Add safeguards against locking out administrative IP addresses.
- [ ] Document production deployment and service management.
- [ ] Add automated tests and continuous integration.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Submit a pull request describing the changes.

For bugs, include the relevant logs, reproduction steps, and expected behavior. Never include passwords, tokens, or sensitive server information in issue reports.

## 📄 License

Check the repository for a `LICENSE` file. If no license has been added, the project's reuse and redistribution terms should be clarified before presenting it as open source.

## 👨‍💻 Author

**emixup23**

- Website: https://medosman.com
- GitHub: https://github.com/emixup23
- Repository: https://github.com/emixup23/BehaviorBan-Web-Manager

---

*BehaviorBan Web Manager — simplifying security policy management and firewall automation for Linux.*
