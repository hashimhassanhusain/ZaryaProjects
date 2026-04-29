import React, { useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Company } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  MoreVertical, 
  ArrowLeft,
  GripVertical,
  Plus,
  Shield,
  Briefcase,
  Users
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProject } from '../context/ProjectContext';

interface TreeNodeProps {
  company: Company;
  allCompanies: Company[];
  level: number;
  onDrop: (draggedId: string, targetId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ company, allCompanies, level, onDrop }) => {
  const { t, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);
  const children = allCompanies.filter(c => c.parent_entity_id === company.id);
  const [isOver, setIsOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('companyId', company.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDropLocal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const draggedId = e.dataTransfer.getData('companyId');
    if (draggedId && draggedId !== company.id) {
      onDrop(draggedId, company.id);
    }
  };

  const getEntityIcon = (type?: string) => {
    switch (type) {
      case 'holding': return <Shield className="w-5 h-5 text-indigo-600" />;
      case 'holding_division': return <LayoutGrid className="w-5 h-5 text-blue-600" />;
      case 'department': return <Briefcase className="w-5 h-5 text-emerald-600" />;
      case 'subsidiary': return <Building2 className="w-5 h-5 text-amber-600" />;
      default: return <Users className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-2">
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropLocal}
        className={`group flex items-center gap-3 p-4 bg-white border rounded-2xl transition-all ${
          isOver ? 'border-blue-500 bg-blue-50/50 shadow-lg scale-[1.02]' : 'border-slate-100 hover:border-blue-200 hover:shadow-md'
        }`}
        style={{ marginInlineStart: `${level * 2}rem` }}
      >
        <div className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-slate-300" />
        </div>

        {children.length > 0 ? (
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          company.entity_type === 'holding' ? 'bg-indigo-50' :
          company.entity_type === 'holding_division' ? 'bg-blue-50' :
          company.entity_type === 'department' ? 'bg-emerald-50' :
          company.entity_type === 'subsidiary' ? 'bg-amber-50' : 'bg-slate-50'
        }`}>
          {getEntityIcon(company.entity_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 truncate">{company.name}</h4>
            {company.is_internal && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                {t('internal_entity')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-slate-400 capitalize">{t(company.entity_type || 'subsidiary')}</span>
            {company.email && <span className="text-[10px] text-slate-300 truncate">{company.email}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            company.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
          }`}>
            {company.status}
          </span>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2 relative"
          >
            <div 
              className={`absolute top-0 bottom-4 w-px bg-slate-100 ${isRtl ? 'right-[2.75rem]' : 'left-[2.75rem]'}`}
              style={{ marginInlineStart: `${level * 2}rem` }}
            />
            {children.map((child, idx) => (
              <TreeNode 
                key={`${child.id}-${idx}`} 
                company={child} 
                allCompanies={allCompanies} 
                level={level + 1}
                onDrop={onDrop}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const EnterpriseStructure: React.FC = () => {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const { companies, loading: isLoading } = useProject();

  const handleMove = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const isDescendant = (parent: string, childId: string): boolean => {
      const children = companies.filter(c => c.parent_entity_id === parent);
      if (children.some(c => c.id === childId)) return true;
      return children.some(c => isDescendant(c.id, childId));
    };

    if (isDescendant(draggedId, targetId)) {
      toast.error('Cannot move a company under its own descendant');
      return;
    }

    try {
      const draggedCompany = companies.find(c => c.id === draggedId);
      const targetCompany = companies.find(c => c.id === targetId);

      if (!draggedCompany || !targetCompany) return;

      await updateDoc(doc(db, 'companies', draggedId), {
        parent_entity_id: targetId,
        updatedAt: new Date().toISOString()
      });

      toast.success(`Moved ${draggedCompany.name} under ${targetCompany.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const handleMoveToTop = async (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('companyId');
    if (!draggedId) return;

    try {
      await updateDoc(doc(db, 'companies', draggedId), {
        parent_entity_id: "",
        updatedAt: new Date().toISOString()
      });
      toast.success('Moved to top level');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const rootCompanies = companies.filter(c => !c.parent_entity_id);

  return (
    <div className={`p-8 space-y-8 ${isRtl ? 'rtl' : 'ltr'}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('enterprise_structure')}</h1>
            <p className="text-slate-500 text-sm">Organize and manage your corporate hierarchy using drag and drop.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/page/companies')}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('add_company')}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleMoveToTop}
            className="min-h-[600px] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8 space-y-4"
          >
            {rootCompanies.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">No Hierarchy Defined</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Drag and drop companies here to start building your enterprise structure.
                  </p>
                </div>
              </div>
            )}

            {rootCompanies.map((company, idx) => (
              <TreeNode 
                key={`${company.id}-${idx}`} 
                company={company} 
                allCompanies={companies} 
                level={0}
                onDrop={handleMove}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> Stats
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Entities</div>
                <div className="text-2xl font-bold text-slate-900">{companies.length}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Internal Companies</div>
                <div className="text-2xl font-bold text-blue-600">{companies.filter(c => c.is_internal !== false).length}</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">External Vendors</div>
                <div className="text-2xl font-bold text-amber-600">{companies.filter(c => c.is_internal === false).length}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-slate-200">
            <h3 className="font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Tips
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag any entity to rearrange the hierarchy. Moving a project or department will also move all its sub-entities.
            </p>
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <Shield className="w-4 h-4 text-indigo-400" /> Hold/Group Level
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <LayoutGrid className="w-4 h-4 text-blue-400" /> Division Branch
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <Briefcase className="w-4 h-4 text-emerald-400" /> Department Unit
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
