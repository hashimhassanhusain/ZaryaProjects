# PMIS Project Architecture & Guidelines

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
- `POST /api/drive/upload-by-url`: Preferred method for archiving documents to specific Drive paths (uses Firebase Storage as a buffer to avoid size limits and local file errors).
