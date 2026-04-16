import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Zarya File Naming Convention (FNC)
 * [ProjectCode]-ZRY-[Category]-[Dept]-[Type]-[Description]-[Date]-V[Version].pdf
 */
export function generateZaryaFileName(params: {
  projectCode: string;
  category: string; // Management, Engineering, Procurement, Finance, Legal
  dept: string; // INIT, PLAN, EXEC, MON, CLS
  type: string; // FRM, PLN, RPT, LOG, DRW, SPC, MS
  description: string;
  version: string; // e.g. 1
  date?: string; // YYYYMMDD
}) {
  const date = params.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  const desc = params.description.replace(/\s+/g, '_').toUpperCase();
  const ver = params.version.startsWith('V') ? params.version : `V${params.version}`;
  const cat = params.category.toUpperCase();
  const dept = params.dept.toUpperCase();
  const type = params.type.toUpperCase();
  
  return `${params.projectCode}-ZRY-${cat}-${dept}-${type}-${desc}-${date}-${ver}`;
}

export function formatCurrency(amount: number, currency: string = 'IQD') {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + currency;
}

export function stripNumericPrefix(title: string): string {
  // Matches "1.0 ", "5.1.1 ", "03.1_", etc. at the start or end of the string
  return title
    .replace(/^[\d\.]+[_\s-]*/, '') // Start: 1.0 Title
    .replace(/[\s-]+[\d\.]+$/, '')   // End: Title 1.0
    .trim();
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
