import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { pages } from '../data';
import { PERFORMANCE_DOMAINS, FOCUS_AREAS } from '../constants/navigation';
import { cn, stripNumericPrefix } from '../lib/utils';

export const Breadcrumbs: React.FC = () => {
  const { t, th } = useLanguage();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // Find current page
  const pageId = pathParts.pop();
  if (!pageId || pageId === 'profile' || pageId === 'admin') return null;
  
  const currentPage = pages.find(p => p.id === pageId);
  if (!currentPage) return null;

  const crumbs = [];

  // 1. Home
  crumbs.push({ label: 'Home', path: '/' });

  // 2. Parent Focus Area
  const focusArea = FOCUS_AREAS.find(a => a.id === currentPage.focusArea);
  if (focusArea) {
    crumbs.push({ label: stripNumericPrefix(t(focusArea.id)), path: '#' });
  }

  // 3. Domain Hub
  const domain = PERFORMANCE_DOMAINS.find(d => d.id === currentPage.domain);
  if (domain) {
    const hubId = {
      'governance': 'gov',
      'delivery': 'scope',
      'schedule': 'sched',
      'finance': 'fin',
      'stakeholders': 'stak',
      'resources': 'res',
      'risk': 'risk'
    }[domain.id] || 'gov';
    crumbs.push({ label: stripNumericPrefix(t(domain.id)), path: `/page/${hubId}` });
  }

  // 4. Intermediate Parents
  if (currentPage.parentId) {
    const parent = pages.find(p => p.id === currentPage.parentId);
    if (parent) {
      crumbs.push({ label: stripNumericPrefix(th(parent.id)), path: `/page/${parent.id}` });
    }
  }

  // 5. Current Page
  crumbs.push({ label: stripNumericPrefix(th(currentPage.id)), path: location.pathname, current: true });

  return (
    <nav className="flex items-center px-6 py-3 bg-white border-b border-neutral-100 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-secondary mx-1 shrink-0 opacity-40" />}
            <Link 
              to={crumb.path}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors",
                crumb.current ? "text-brand" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {crumb.label}
            </Link>
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};
