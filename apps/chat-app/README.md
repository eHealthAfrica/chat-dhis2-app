# Welcome to the CHAT App

CHAT, short for Climate Health Vulnerability Assessment Tool, is a DHIS2 application for managing and conducting climate and health vulnerability assessments.

It supports assessment setup for administrators and structured data capture for end users across organisation units, with support for drafts, completed event review, and in-app guides.

## Main Workflows

- `Settings`: Import and manage assessment tools.
- `Data Capture`: Select an assessment, choose an organisation unit, complete the form, and submit results.
- `Guides`: Read in-app guidance for assessment setup and data capture.

## Admin Setup

These steps are for DHIS2 administrators setting up the CHAT app for the first time.

### 1. Install the App

Build and deploy the app to your DHIS2 instance, or install it directly from the DHIS2 App Hub if available.

### 2. Assign User Authorities

CHAT uses a custom authority to restrict access to assessment management. Assign the following authority to the relevant user roles in **DHIS2 → User Management → User Roles**:

| Authority | Description |
|-----------|-------------|
| `F_CHAT_ADD_SETTINGS` | Allows users to create, import, and delete assessments in the Settings page |

Users without this authority can still access **Data Capture** and **Guides** but cannot modify assessments.

### 3. Import a Metadata Package

Assessment tools are distributed as DHIS2 metadata JSON packages. Download a package, then import it through the CHAT app:

1. Navigate to **Settings → New assessment** in the app.
2. Upload the metadata `.json` file.
3. Review the program details and assign the relevant organisation units.
4. Click **Import assessment** to push the metadata to DHIS2 and register the assessment.

> Pre-built metadata packages are available in the repository:
> **[meta-data-packages →](https://github.com/eHealthAfrica/chat-dhis2-app/tree/main/meta-data-packages)**

### 4. Link an Existing Program (Optional)

If the DHIS2 program is already deployed in your instance, you can register it without re-importing:

1. Navigate to **Settings → Link existing program**.
2. Search for the program by name.
3. Click **Add** to register it as a CHAT assessment.

### 5. Verify Setup

- Confirm the assessment appears in **Settings** with status **Active**.
- Log in as a data-capture user (without `F_CHAT_ADD_SETTINGS`) and verify the assessment is visible in **Data Capture**.

---

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

Sample assessment tools for import and testing are available in the [`meta-data-packages`](https://github.com/eHealthAfrica/chat-dhis2-app/tree/main/meta-data-packages) folder at the repository root.

## Notes

- The app uses `@dhis2/app-runtime` for DHIS2 API access.
- Draft progress is persisted locally and through the DHIS2 data store.
- Completed assessments are stored and viewed as DHIS2 events.
- GitHub repository: https://github.com/eHealthAfrica/chat-dhis2-app
