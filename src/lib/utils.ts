import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    return div ? `Engineering/AutoCAD/DIV${div[0].padStart(2, '0')}` : 'Engineering/AutoCAD/General';
  }
  if (t === 'INV' || t === 'BILL') {
    return 'Finance/Invoices';
  }
  if (t === 'CON' || t === 'AGR') {
    return 'Subcontractors_Hub/Contracts';
  }
  return 'General_Archive';
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
  // Matches "1.0 ", "5.1.1 ", "5.1.1: ", "[5.1.1] " etc. at the start or end
  // We avoid stripping if followed by underscore as it's likely a technical key (e.g. 1.1.1_summary)
  const stripped = title
    .replace(/^\[?[\d\.]+\]?[\s-:]+/, '') // Start: [1.0] Title
    .replace(/[\s-:]+\[?[\d\.]+\]?$/, '')   // End: Title [1.0]
    .trim();
  
  // If we stripped everything, it means it was JUST a numeric identifier.
  // In this case, we return the original string because we don't want to show an empty label.
  return stripped || title;
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
