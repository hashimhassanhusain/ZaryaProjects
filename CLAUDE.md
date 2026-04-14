# Zarya Project Architecture & Guidelines

## Core Principles
1. **No html2canvas**: Tailwind v4 uses `oklch()` colors which are not supported by html2canvas. Use `jsPDF` + `jspdf-autotable` for all PDF generation.
2. **Google Drive Integration**: Always send `userEmail` in `POST /api/projects/init-drive` to ensure the root folder is shared with the user.
3. **Protected Files**: Never delete or truncate `CLAUDE.md`, `.gitattributes`, or `.githooks/pre-commit`. This file must remain complete — do not replace it with a shorter summary.
4. **supportsAllDrives: true**: Every single Google Drive API call in server.ts MUST include `supportsAllDrives: true` and `includeItemsFromAllDrives: true` where applicable. This is required for Shared Drive support.
5. **CurrencyContext exports**: `formatAmount` and `convertToBase` — NOT `convertToIQD`. Never use `convertToIQD`.
6. **BOQItem field**: The currency field on BOQItem is `inputCurrency` (NOT `currency`). Always use `item.inputCurrency`.

## PDF Generation Pattern
```typescript
const { default: jsPDF } = await import('jspdf');
const { default: autoTable } = await import('jspdf-autotable');
// Build PDF directly from data — never use html2canvas
```

## API Guidelines
- `POST /api/projects/init-drive`: Requires `projectName`, `projectCode`, and `userEmail`.
- `POST /api/drive/upload-by-path`: Use for uploading generated PDFs to specific Drive paths.
- All Drive file create/update calls: must include `supportsAllDrives: true`.

## Google Drive Architecture
- Storage: Google Shared Drive (NOT Firebase Storage — requires Blaze plan).
- Service account must be added manually as **Manager** in the Zarya Shared Drive.
- Domain-Wide Delegation is optional (for impersonation). Without it, the service account acts as itself.
- The `driveId` (Shared Drive ID) must be passed in all relevant API calls.
- `permissions.create` must include `supportsAllDrives: true`.

## Firestore Collections
- `work_packages` — fields: name, wbsId, divisionId, projectId
- `activities` — fields: name, workPackage, wbsId, divisionId, projectId, boqItemId, amount, inputCurrency
- `purchaseOrders` — fields: workPackageId (must be activity Firestore doc ID, NOT name string), vendorId, projectId, activityId
- `vendors` — fields: companyName, projectId
- `wbs` — fields: name, level, parentId, projectId
- `boq` — fields: description, wbsId, divisionId, projectId, inputCurrency (NOT currency), amount
- `stakeholders` — fields: name, role, company, projectId
- `users` — global collection, no projectId filter
- `risks` — fields: projectId
- `issues` — fields: projectId
- `decision_logs` — fields: projectId
- `change_requests` — fields: projectId
- `lessons_learned` — fields: projectId
- `quality_metrics` — fields: projectId
- `formal_acceptances` — fields: projectId
- `companies` — global (no projectId), org-wide master data
- `contacts` — fields: name, company, projectId
- `resources` — fields: name, type (Manpower/Material/Machine), projectId

## Critical Bug History (DO NOT REINTRODUCE)
1. **PO workPackageId**: Must store `activity.id` (Firestore document ID), NOT `activity.workPackage` (name string). Storing the name string crashes rollupService.
2. **ProjectScheduleView purchaseOrders query**: MUST filter by `where('projectId', '==', selectedProject.id)`. Without this, ALL projects POs are loaded.
3. **BOQView / DashboardView**: Use `item.inputCurrency`, not `item.currency`.
4. **ResourceOptimizationHub**: Use `useProject()` hook for projectId, never `page.id.split('-')[0]`.
5. **FileExplorer**: Use `selectedProject?.id`, never hardcoded `'p1'`.
6. **html2canvas**: NEVER import or use. Use jsPDF + autoTable only.

## rollupService Architecture
- Chain: lineItem → PO → activity (workPackage) → division (WBS) → floor → building → area → zone
- At `po` level: `parentId` = `po.workPackageId` which must be an activities Firestore document ID.
- Defensive check already added: if activity doc not found, logs warning and returns (does not crash).

## Routing (App.tsx) — DO NOT MODIFY Without Careful Review
- `isGovernanceHubPage` must NOT include `3.1.1` (ChangeRequestView) or `3.4.1`.
- `isResourceOptimizationPage` must NOT include `3.3.4` (VendorMasterRegister).
- Each page ID maps to exactly one component — check existing conditions before adding new ones.

## Activity Generation from BOQ
When generating activities from BOQ items (ActivityListView.tsx `generateFromBOQ`):
- MUST set `boqItemId: item.id` on the created activity for traceability.
- Check for duplicates by `description + workPackage` before creating.

## Work Package Filtering
ActivityAttributesModal filters work_packages by: `projectId` AND `wbsId` AND `divisionId`.
This is intentional — if dropdown is empty, user must create a work package for that WBS+Division first.

## Navigation
- NEVER use `window.location.href` for internal navigation. Always use `useNavigate()` from react-router-dom.
- NEVER use `alert()` — use `toast.success()` / `toast.error()` from react-hot-toast.
- NEVER use `Math.random()` for document IDs — use `crypto.randomUUID()`.

## Dashboard
- ProjectDashboard Strategic Performance bars must NOT be hardcoded percentages.
- EVM Earned Value requires `completion` field on BOQ items to be set by the user.
