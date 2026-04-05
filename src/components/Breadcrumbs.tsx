import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getBreadcrumbs } from '../data';

interface BreadcrumbsProps {
  currentPageId: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPageId }) => {
  const crumbs = getBreadcrumbs(currentPageId);

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
      <Link to="/" className="hover:text-slate-800 transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      
      {crumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <Link
            to={`/page/${crumb.id}`}
            className={index === crumbs.length - 1 
              ? "font-semibold text-slate-900" 
              : "hover:text-slate-800 transition-colors"
            }
          >
            {crumb.title}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  );
};
