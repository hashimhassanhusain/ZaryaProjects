# Zarya Project Architecture & Guidelines

## Core Principles
1. **No html2canvas**: Tailwind v4 uses `oklch()` colors which are not supported by html2canvas. Use `jsPDF` + `jspdf-autotable` for all PDF generation.
2. **Google Drive Integration**: Always send `userEmail` in `POST /api/projects/init-drive` to ensure the root folder is shared with the user.
3. **Protected Files**: Never delete `CLAUDE.md`, `.gitattributes`, or `.githooks/pre-commit`.

## PDF Generation Pattern
```typescript
const { default: jsPDF } = await import('jspdf');
const { default: autoTable } = await import('jspdf-autotable');
// Build PDF directly from data
```

## API Guidelines
- `POST /api/projects/init-drive`: Requires `projectName`, `projectCode`, and `userEmail`.
- `POST /api/drive/upload-by-path`: Use for uploading generated PDFs to specific Drive paths.

## Google Drive Upload — Solved Architecture

**Storage**: Files go directly to Google Drive Shared Drive. Firebase Storage is NOT used (avoids Blaze plan cost).

**How it works**:
1. Frontend sends file to backend (`/api/drive/upload-by-path`)
2. Backend resolves folder path via breadcrumbs and uploads to correct subfolder
3. File URL is saved to Firestore

**Critical setup requirement** (must be done once per deployment):
- The Service Account email (found in `GOOGLE_DRIVE_CREDENTIALS` JSON as `client_email`) must be manually added as **Manager** to the Zarya Shared Drive in Google Drive settings.
- Without this, uploads fail with: `Service Accounts do not have storage quota`
- Adding as Manager gives the service account full access to the Shared Drive quota (not its own 0-quota My Drive)

**All Drive API calls must include**:
```typescript
supportsAllDrives: true
```
This is required for Shared Drive compatibility. Never remove it.

**Do NOT use Firebase Storage** — it requires the Blaze (paid) plan.
