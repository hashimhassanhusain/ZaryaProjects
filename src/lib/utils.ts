import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
