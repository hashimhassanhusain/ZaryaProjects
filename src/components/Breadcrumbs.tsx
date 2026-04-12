import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getBreadcrumbs, pages } from '../data';
import { stripNumericPrefix } from '../lib/utils';

interface BreadcrumbsProps {
  currentPageId: string;
}

const getCategoryForPage = (id: string): string => {
  const page = pages.find(p => p.id === id);
  if (!page) return '';

  // Finance
  if (page.domain === 'finance' || id.startsWith('2.4') || id.startsWith('4.2') || id.startsWith('5.2')) return 'Finance';
  
  // Governance
  if (page.domain === 'governance' || page.domain === 'risk' || id.startsWith('2.7') || id.startsWith('3.4') || id.startsWith('1.1') || id.startsWith('2.1') || id.startsWith('3.1') || id.startsWith('4.1') || id.startsWith('5.1')) return 'Governance';

  // Utilities
  if (id === 'files' || id === 'settings') return 'Utilities';

  // Default to Core Data for others (Scope, Resources, etc.)
  return 'Core Data';
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPageId }) => {
  const category = getCategoryForPage(currentPageId);
  const crumbs = getBreadcrumbs(currentPageId);

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
      <Link to="/" className="hover:text-slate-800 transition-colors flex items-center">
        <Home className="w-4 h-4 mr-1" />
        <span className="text-xs font-medium">Dashboard</span>
      </Link>
      
      {category && (
        <>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-xs font-medium text-slate-400">{category}</span>
        </>
      )}

      {crumbs.map((crumb, index) => {
        // Skip focus areas if they are top level hubs like 1.0, 2.0 etc to keep it clean
        if (crumb.type === 'hub' && !crumb.parentId) return null;
        
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <Link
              to={`/page/${crumb.id}`}
              className={index === crumbs.length - 1 
                ? "font-semibold text-slate-900" 
                : "hover:text-slate-800 transition-colors"
              }
            >
              {stripNumericPrefix(crumb.title)}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
