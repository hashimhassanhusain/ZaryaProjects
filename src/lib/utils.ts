import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Zarya File Naming Convention (FNC)
 * 1. Contracts & Drawings: [P16314]-[DIVxx]-[Type]-[RefNo]-[Desc]-[Ver]-[Date]
 * 2. General & Management: [P16314]-[Dept]-[Type]-[Desc]-[Ver]-[Date]
 */
export function generateZaryaFileName(params: {
  projectCode: string;
  category: 'technical' | 'management';
  division?: string; // e.g. Div 03
  dept?: string; // e.g. MGT, PROC
  type: string; // e.g. SD, Cont, REP, LET
  refNo?: string;
  description: string;
  version: string; // e.g. V01
  date?: string; // YYYYMMDD
}) {
  const date = params.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  const desc = params.description.replace(/\s+/g, '_').toUpperCase();
  const ver = params.version.startsWith('V') ? params.version : `V${params.version.padStart(2, '0')}`;
  
  if (params.category === 'technical') {
    const div = params.division || 'DIV00';
    const ref = params.refNo || '000';
    return `${params.projectCode}-${div}-${params.type}-${ref}-${desc}-${ver}-${date}`;
  } else {
    const dept = params.dept || 'MGT';
    return `${params.projectCode}-${dept}-${params.type}-${desc}-${ver}-${date}`;
  }
}

export function formatCurrency(amount: number, currency: string = 'IQD') {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + currency;
}

export function sortDomainPages(items: any[], domainKey: string) {
  return [...items].sort((a, b) => {
    const getWeight = (p: any) => {
      const title = p.title.toLowerCase();
      const idParts = p.id.split('.');
      const focusArea = parseInt(idParts[0]) || 0;
      let weight = focusArea * 10000;

      // Global Priorities
      if (title === 'project charter') return weight - 5000;
      
      // 1. Management Plans first
      if (title.includes('management plan') || title.endsWith(' plan')) {
        return weight - 4000;
      }

      // 2. Logs, Lists, Registers next
      if (title.includes('log') || title.includes('register') || title.includes('list')) {
        return weight - 3000;
      }

      // Specific Schedule Domain Order (Focus Area 2)
      if (focusArea === 2 && domainKey === 'schedule') {
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

      // Specific Scope Domain Order (Focus Area 2)
      if (focusArea === 2 && domainKey === 'scope') {
        const scopeOrder = [
          'scope management plan',
          'requirements management plan',
          'requirements documentation',
          'project scope statement',
          'work breakdown structure',
          'wbs dictionary',
          'requirements traceability matrix',
          'inter requirements traceability matrix',
          'assumption and constraint log'
        ];
        const idx = scopeOrder.indexOf(title);
        if (idx !== -1) return weight + idx;
      }

      // Default to ID-based order
      const subId = parseFloat(idParts.slice(1).join('.')) || 0;
      return weight + subId;
    };

    return getWeight(a) - getWeight(b);
  });
}
