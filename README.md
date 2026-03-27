# CHAT App

CHAT, short for Climate Health Vulnerability Assessment Tool, is a DHIS2-based application for managing and conducting climate and health vulnerability assessments. It allows administrators to configure or import assessment tools, and enables users to capture structured assessment data across organisation units through guided, section-based workflows.

## Project Structure

```
├── apps/
│   └── chat-app/              # DHIS2 chat application
├── packages/
│   └── ui/                    # Shared UI components + API client core
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- pnpm 10.x or higher
- DHIS2 (2.41+)

### Installation and Development

```bash
pnpm install
pnpm build
pnpm start
```

### Code Quality

```bash
pnpm linter:check    # Run linting
pnpm tsc:check       # Type checking
```

## License

BSD-3-Clause License for chat-app, MIT License for shared packages.

## Attribution

This project is derived from [dhis2-chap/chap-frontend](https://github.com/dhis2-chap/chap-frontend), originally developed by the [DHIS2 CHAP](https://github.com/dhis2-chap) team. The original repository contains the full CHAP Modeling platform for predictive modeling and health forecasting integrated with DHIS2.

## Links

- [Original Repository](https://github.com/dhis2-chap/chap-frontend)
- [DHIS2 Community](https://community.dhis2.org/)
