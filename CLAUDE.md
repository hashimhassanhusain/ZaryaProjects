# Zarya Construction Management System
## Claude Code Instructions — Read before every task

---

## 1. Project Identity

Zarya is a professional construction project management web application.
Its core philosophy: **"Any information entered finds its way automatically to the correct folder and correct domain — zero manual routing."**

Target users:
- Project Manager: needs full project visibility
- Site Engineer: needs fast documentation from mobile
- Accountant: needs precise tracking of advances and invoices

Tech Stack:
- Frontend: React + TypeScript + Tailwind CSS v4
- Backend/DB: Firebase Firestore
- Auth: Firebase Auth
- Storage: Firebase Storage + Google Drive API
- AI: Claude API (Anthropic) — model: claude-sonnet-4-20250514
- Build: Vite
- Icons: Lucide React
- Animation: Framer Motion
- PDF: jsPDF + jspdf-autotable (NEVER use html2canvas — breaks due to oklch colors)

---

## 2. The Complete Data Hierarchy

Every data model must respect this hierarchy top-to-bottom:

```
Zone (Z)          — Major project sectors (North, South...)
  └── Area (A)    — Specific locations (Villa 1, Block A...)
        └── Building (B)  — Individual structures
              └── Floor (F)  — Vertical levels
                    └── Master Format Division (01–16)
                          └── Work Package
                                └── Purchase Order (PO)
                                      └── PO Line Items  ← leaf: manual input only
```

**Golden Rule: lower levels always govern upper levels.**
- If a node has children → values are computed FROM children and saved to Firestore
- If a node has no children → manual input is allowed

---

## 3. Rollup Calculation Rules (CRITICAL)

These must be applied after every create/update/delete at any level.
All results must be saved to Firestore on the parent document.

### Dates:
```
parent.plannedStart    = min(children.plannedStart)
parent.plannedFinish   = max(children.plannedFinish)
parent.plannedDuration = plannedFinish - plannedStart  // handles overlaps automatically
```
Same logic for actualStart, actualFinish, actualDuration.

### Default Dates (when no date is set):
```
activity.plannedStart  = project.startDate  // from Project Charter
activity.plannedFinish = plannedStart + 1 day
```
If Project Charter has no startDate → use project.createdAt from Firestore.

### Cost:
```
parent.plannedCost = max(manualCost, sum(children.plannedCost))
```
- Children total ≤ manual → keep manual (gap for future children)
- Children total > manual → children total overwrites Firestore

### Progress (always cost-weighted, NEVER simple average):
```
parent.progress = Σ(child.cost × child.progress) / Σ(child.cost)
```
Example: PO $100 → Item1 $10 at 50% + Item2 $90 at 100% = 95% (not 75%)

### Cascade chain (each level saved to Firestore):
```
PO Line Item updated
  → PO recalculated + saved
    → Work Package recalculated + saved
      → Division recalculated + saved
        → Floor recalculated + saved
          → Building recalculated + saved
            → Area recalculated + saved
              → Zone recalculated + saved
```

Implement as:
```typescript
async function rollupToParent(
  level: 'lineItem'|'po'|'workPackage'|'division'|'floor'|'building'|'area'|'zone',
  parentId: string
) {
  // 1. Fetch all children of parentId
  // 2. Recalculate all values per rules above
  // 3. updateDoc() on parent in Firestore
  // 4. Recursively call for next level up
}
```

---

## 4. Gantt Chart Rules

- Always show full hierarchy: Zone → Area → Building → Floor → Division → Work Package → PO → PO Line Items
- Every level is collapsible with expand/collapse
- Parent rows show rolled-up values (min start, max finish, weighted progress)
- If activity has no dates → use project.startDate as default, duration = 1 day
- View levels: MasterFormat / Work Package / PO / PO Items — each shows full hierarchy above it
- Today Line: red vertical line with Framer Motion pulse effect
- Bars: planned bar (gray) + actual bar (blue) + progress overlay
- NEVER use html2canvas for PDF — use jsPDF + jspdf-autotable only

---

## 5. PDF Generation Rules

ALWAYS use this pattern — no exceptions:
```typescript
const { default: jsPDF } = await import('jspdf');
const { default: autoTable } = await import('jspdf-autotable');
// Build PDF from data only — never capture DOM or use html2canvas
```
Reason: Tailwind v4 uses oklch() colors which html2canvas cannot parse.

---

## 6. Auto-Routing & File Naming System

When a file is uploaded, the system must:
1. Rename automatically: `{ProjectCode}-ZRY-DIV{XX}-{TYPE}-{SEQ}`
   - Example: `P16314-ZRY-DIV26-DWG-001`
2. Route to correct folder:
   - AutoCAD drawings → MasterFormat Division folder (e.g. DIV26 = Electrical)
   - Invoices/Extracts → Finance Domain folder
   - Contracts → Subcontractors Hub (Contract + Advances + Change Orders side by side)
   - Photos → relevant WBS folder
3. Storage: Firebase Storage for files ≤ 10MB, Google Drive API for heavy files

---

## 7. The 3-Tab Architecture (Sidebar)

```
Tab 1: Focus Areas     — Project lifecycle: Initiating → Planning → Executing → Closing
Tab 2: Performance Domains — PMBOK 8 domains: Finance, Risk, Resources, Stakeholders...
Tab 3: Drive Explorer  — Direct Google Drive interface by permissions
```

---

## 8. Finance & Vendor Rules

- Vendor Master Register: unique vendor code, contact info, specialty
- Every vendor row auto-pulls from Finance: total spent, advances received, PO balance remaining
- PO Tracking: cumulative table — never exceed budget per line item
- Subcontractor Hub: Contract + Advances + Change Orders grouped per subcontractor

---

## 9. Governance Logs

Three mandatory logs always available:
- Decision Log: every technical agreement with owner or contractors
- Change Log: every deviation from original plan + financial impact
- PO Tracking: cumulative spend vs budget per item

---

## 10. Code Quality Rules

- TypeScript strict mode always
- Every component must have proper types — no `any`
- Firestore operations must use handleFirestoreError wrapper
- All rollup functions must be called after every write operation
- Mobile-first responsive design (site engineers use phones on site)
- RTL support must be maintained (Arabic interface)
- Colors: use hex values in inline styles when needed for PDF/canvas — never oklch
- Never use localStorage or sessionStorage
- All sensitive config in .env files only

---

## 11. Before Every Task

1. Read this file fully
2. Identify which level of the hierarchy is affected
3. After any data change → trigger rollupToParent()
4. Test that PDF generation works without html2canvas
5. Confirm mobile responsiveness
6. Confirm Arabic/RTL still works

---

## 12. The North Star

Zarya must work like Microsoft Project in terms of scheduling logic,
like a professional ERP in terms of financial tracking,
and like a modern SaaS in terms of UX.

Every feature must serve one of these three users:
- Project Manager → visibility
- Site Engineer → speed of documentation
- Accountant → financial accuracy

When in doubt, ask: does this feature make one of these three users' jobs easier?
