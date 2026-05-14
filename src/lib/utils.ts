import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAdminRole(role: string): boolean {
  const adminRoles = ['super-admin', 'enterprise-admin', 'system-administrator'];
  return adminRoles.includes(role);
}

/**
 * Robust date formatting for UI display
 */
export function formatDate(value: any): string {
  if (!value) return '-';
  
  try {
    // Handle Firebase Timestamp
    if (typeof value === 'object' && typeof value.toDate === 'function') {
      return value.toDate().toLocaleDateString();
    }
    
    // Handle String, Number, or Date object
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    
    return date.toLocaleDateString();
  } catch (err) {
    return String(value);
  }
}

/**
 * Returns YYYY-MM-DD string safely from various date types
 */
export function getISODate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  try {
    let date: Date;
    if (typeof value === 'object' && typeof value.toDate === 'function') {
      date = value.toDate();
    } else {
      date = new Date(value);
    }
    
    if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * PMIS File Naming Convention (FNC)
 * [ProjectCode]-PMIS-DIV[XX]-[TYPE]-[SEQ]
 * fallback: [ProjectCode]-PMIS-[Category]-[Dept]-[Type]-[Description]-[Date]-V[Version]
 */
export function generatePMISFileName(params: {
  projectCode: string;
  type: string; // FRM, PLN, RPT, LOG, DRW, SPC, MS, INV, CON
  division?: string; // e.g. "03" or "03 - Concrete"
  seq?: string; // e.g. 001
  category?: string;
  dept?: string;
  description?: string;
  version?: string;
  date?: string;
}) {
  const date = params.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  const type = params.type.toUpperCase();
  
  // If division is provided, use the new strict format
  if (params.division) {
    const divNum = params.division.match(/^\d+/) ? params.division.match(/^\d+/)![0].padStart(2, '0') : 'XX';
    const seq = params.seq || '001';
    return `${params.projectCode}-PMIS-DIV${divNum}-${type}-${seq}`;
  }

  // Fallback for legacy/management files
  const desc = (params.description || 'DOC').replace(/\s+/g, '_').toUpperCase();
  const ver = params.version ? (params.version.startsWith('V') ? params.version : `V${params.version}`) : 'V1';
  const cat = (params.category || 'MGT').toUpperCase();
  const dept = (params.dept || 'EXEC').toUpperCase();
  
  return `${params.projectCode}-PMIS-${cat}-${dept}-${type}-${desc}-${date}-${ver}`;
}

/**
 * Auto-routes files based on type and content
 */
export function getRouteForFile(type: string, division?: string): string {
  const t = type.toUpperCase();
  if (t === 'DRW' || t === 'CAD') {
    const div = division ? division.match(/^\d+/) : null;
    return div ? `Engineering_and_Design_3/AutoCAD/DIV${div[0].padStart(2, '0')}` : 'Engineering_and_Design_3/AutoCAD/General';
  }
  if (t === 'INV' || t === 'BILL') {
    return 'Financials_and_Procurements_6/Invoices';
  }
  if (t === 'CON' || t === 'AGR') {
    return 'Financials_and_Procurements_6/Contracts';
  }
  if (t === 'RPT' || t === 'WKR') {
    return 'Monitoring_and_Control_4/Reports';
  }
  return 'Financials_and_Procurements_6/General_Documents';
}

export function formatCurrency(amount: number, currency: string = 'IQD') {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + currency;
}

export function stripNumericPrefix(title: string | undefined | null): string {
  if (!title) return '';
  // Matches "1.0 ", "5.1.1 ", "5.1.1: ", "[5.1.1] ", "00_ ", "01- " etc. at the start or end
  // Including underscores as separators if followed by more text
  const stripped = title
    .replace(/^\[?[\d\._]+\]?[\s-:_]+/, '') // Start: [1.0] Title or 00_Title
    .replace(/[\s-:_]+\[?[\d\._]+\]?$/, '')   // End: Title [1.0] or Title_00
    .trim();
  
  // Special case for 00_Something -> Something
  let final = stripped;
  if (final.match(/^\d+_/)) {
    final = final.replace(/^\d+_/, '');
  }
  
  // If we stripped everything, it means it was JUST a numeric identifier.
  // In this case, we return the original string because we don't want to show an empty label.
  return final || title;
}

export function sortDomainPages(items: any[], domainKey: string) {
  const phaseOrder = ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'];

  return [...items].sort((a, b) => {
    const getWeight = (p: any) => {
      const title = p.title.toLowerCase();
      const idParts = p.id.split('.');
      
      // Determine phase weight from focusArea string
      let phaseWeight = 99;
      if (p.focusArea) {
        const foundPhase = phaseOrder.findIndex(phase => p.focusArea.includes(phase));
        if (foundPhase !== -1) phaseWeight = foundPhase;
      } else {
        // Fallback to ID-based phase if focusArea is missing
        const firstDigit = parseInt(idParts[0]);
        if (!isNaN(firstDigit)) phaseWeight = firstDigit - 1;
      }

      let weight = phaseWeight * 10000;

      // Global Priorities within the same phase
      if (title === 'project charter') return weight - 5000;
      
      // 1. Management Plans first
      if (title.includes('management plan') || title.endsWith(' plan')) {
        return weight - 4000;
      }

      // 2. Logs, Lists, Registers next
      if (title.includes('log') || title.includes('register') || title.includes('list')) {
        return weight - 3000;
      }

      // Specific Schedule Domain Order
      if (domainKey === 'schedule') {
        const scheduleOrder = [
          'schedule management plan',
          'activity list',
          'activity attributes',
          'activity duration estimates',
          'duration estimating worksheet',
          'milestone list',
          'network diagram',
          'project schedule'
        ];
        const idx = scheduleOrder.indexOf(title);
        if (idx !== -1) return weight + idx;
      }

      // Specific Scope Domain Order
      if (domainKey === 'scope') {
        const scopeOrder = [
          'scope management plan',
          'requirements management plan',
          'requirements documentation',
          'project scope statement',
          'work breakdown structure',
          'wbs dictionary',
          'work packages',
          'requirements traceability matrix',
          'inter requirements traceability matrix',
          'assumption and constraint log'
        ];
        const idx = scopeOrder.indexOf(title);
        if (idx !== -1) return weight + idx;
      }

      // Default to ID-based order within phase
      const subId = parseFloat(idParts.slice(1).join('.')) || 0;
      // For non-numeric IDs, use a small increment based on title to keep it stable
      if (isNaN(subId)) {
        return weight + 500 + (title.charCodeAt(0) / 100);
      }
      return weight + subId;
    };

    return getWeight(a) - getWeight(b);
  });
}

export function getFullWBSCode(levelId: string, allLevels: { id: string, parentId?: string, code: string }[]): string {
  const level = allLevels.find(l => l.id === levelId);
  if (!level) return '';
  
  let fullCode = level.code;
  let current = level;
  
  while (current.parentId) {
    const parent = allLevels.find(l => l.id === current.parentId);
    if (!parent) break;
    
    // If the current fullCode doesn't already include the parent's code as a prefix, add it
    if (!fullCode.startsWith(parent.code + '-')) {
      fullCode = parent.code + '-' + fullCode;
    }
    
    current = parent;
  }
  
  return fullCode;
}

/**
 * Determines the logical Google Drive path for a given PMIS page or domain component.
 */
export function getDrivePathForPage(pageId: string, focusArea?: string, collectionName?: string): string {
  // Special collection overrides
  if (collectionName === 'purchase_orders') return '6_Financials_and_Procurements/FINANCIAL/Purchase_Orders';
  if (collectionName === 'contracts') return '6_Financials_and_Procurements/LEGAL/Agreements';

  const idParts = (pageId || "").split('.');
  
  if (idParts.length >= 2) {
    const focusAreaNum = idParts[0];
    const domainNum = idParts[1];
    
    const focusAreaMap: Record<string, string> = {
      '1': '1.0_Initiating',
      '2': '2.0_Planning',
      '3': '3.0_Executing',
      '4': '4.0_Monitoring_and_Controlling',
      '5': '5.0_Closing'
    };
    
    const domainMap: Record<string, string> = {
      '1': 'Governance_Domain',
      '2': 'Scope_Domain',
      '3': 'Schedule_Domain',
      '4': 'Finance_Domain',
      '5': 'Stakeholders_Domain',
      '6': 'Resources_Domain',
      '7': 'Risk_Domain'
    };

    const focus = focusAreaMap[focusAreaNum] || (focusArea ? focusArea.replace(/\s+/g, '_') : 'General');
    const domain = domainMap[domainNum] || 'Support_Domain';

    return `Business_Initiation_and_Governance_1/${focus}/${focusAreaNum}.${domainNum}_${domain}`;
  }

  // Fallbacks for non-numeric pages or common components
  if (pageId === 'purchase_orders' || pageId === 'procurement') return 'Financials_and_Procurements_6/FINANCIAL/Purchase_Orders';
  if (pageId === 'contracts' || pageId === 'agreements') return 'Financials_and_Procurements_6/LEGAL/Agreements';
  if (pageId === 'design' || pageId === 'cad') return 'Engineering_and_Design_3/AutoCAD/General';
  if (pageId === 'daily_reports') return 'Monitoring_and_Control_4/Daily_Reports';
  
  return '01_PROJECT_MANAGEMENT_FORMS';
}

/**
 * Generates a clean, date-stamped filename for PMIS artifacts.
 */
export function getSmartFileNameForRecord(typeLabel: string, recordTitle: string): string {
   const baseName = recordTitle || 'Record';
   const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
   return `${typeLabel}_${baseName}_${dateStr}`.replace(/\s+/g, '_');
}
