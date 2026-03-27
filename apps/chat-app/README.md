# Welcome to the CHAT App

CHAT, short for Climate Health Vulnerability Assessment Tool, is a DHIS2 application for managing and conducting climate and health vulnerability assessments.

It supports assessment setup for administrators and structured data capture for end users across organisation units, with support for drafts, completed event review, and in-app guides.

## Main Workflows

- `Settings`: Import and manage assessment tools.
- `Data Capture`: Select an assessment, choose an organisation unit, complete the form, and submit results.
- `Guides`: Read in-app guidance for assessment setup and data capture.

## Development

Run these commands from the repository root:

```bash
pnpm install
pnpm build
pnpm --filter chat-app start
```

Useful checks:

```bash
pnpm --filter chat-app tsc:check
pnpm linter:check
```

## Requirements

- Node.js 20.x or higher
- pnpm 10.x or higher
- A DHIS2 2.41+ environment for runtime integration

## App Structure

```text
meta-data-packages/  Sample assessment tool packages
apps/chat-app/
  src/        Application source code
  public/     Static assets
  i18n/       Translation output
```

Sample assessment tools for import and testing are available in the `meta-data-packages` folder at the repository root.

## Notes

- The app uses `@dhis2/app-runtime` for DHIS2 API access.
- Draft progress is persisted locally and through the DHIS2 data store.
- Completed assessments are stored and viewed as DHIS2 events.
- GitHub repository: https://github.com/eHealthAfrica/chat-dhis2-app
