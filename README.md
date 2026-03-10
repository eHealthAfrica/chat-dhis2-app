# CHAT App

A DHIS2 application for chat-based data capture and assessment management. Extracted from the [CHAP Frontend](https://github.com/dhis2-chap/chap-frontend) monorepo, retaining only the chat modules.

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

BSD-3-Clause License for chat-app, MIT License for shared packages. See the original [CHAP Frontend repository](https://github.com/dhis2-chap/chap-frontend) for full license details.

## Attribution

This project is derived from [dhis2-chap/chap-frontend](https://github.com/dhis2-chap/chap-frontend), originally developed by the [DHIS2 CHAP](https://github.com/dhis2-chap) team. The original repository contains the full CHAP Modeling platform for predictive modeling and health forecasting integrated with DHIS2.

## Links

- [Original Repository](https://github.com/dhis2-chap/chap-frontend)
- [DHIS2 CHAP Wiki](https://github.com/dhis2-chap/chap-core/wiki)
- [DHIS2 Community](https://community.dhis2.org/)