import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Folder,
  FileText,
  Loader2,
  X,
  Briefcase,
  Package,
  Truck,
  Layers
} from 'lucide-react';
import { RBSNode } from '../../types';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface RBSTabProps {
  projectId: string;
}

export const RBSTab: React.FC<RBSTabProps> = ({ projectId }) => {
  const [nodes, setNodes] = useState<RBSNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Partial<RBSNode>>({
    type: 'Category',
    resourceType: 'Labor'
  });

  useEffect(() => {
    const q = query(collection(db, 'rbs'), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RBSNode));
      setNodes(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rbs'));

    return () => unsubscribe();
  }, [projectId]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const handleSave = async () => {
    try {
      const data = { ...formData, projectId };
      if (editingId) {
        await updateDoc(doc(db, 'rbs', editingId), data);
      } else {
        await addDoc(collection(db, 'rbs'), data);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ type: 'Category', resourceType: 'Labor' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rbs');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will not delete children but they will lose their parent.')) return;
    try {
      await deleteDoc(doc(db, 'rbs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'rbs');
    }
  };

  const renderNode = (node: RBSNode, depth: number = 0) => {
    const children = nodes.filter(n => n.parentId === node.id);
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div 
          className={cn(
            "group flex items-center gap-3 px-6 py-4 rounded-2xl transition-all cursor-pointer mb-1",
            node.type === 'Category' ? "bg-white border border-slate-200 shadow-sm" : "bg-slate-50/50 border border-transparent hover:border-slate-200"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => node.type === 'Category' && toggleExpand(node.id)}
        >
          {node.type === 'Category' ? (
            isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <div className="w-4" />
          )}
          
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
            node.type === 'Category' ? "bg-slate-900 text-white" : 
            node.resourceType === 'Labor' ? "bg-blue-50 text-blue-600" :
            node.resourceType === 'Material' ? "bg-amber-50 text-amber-600" :
            "bg-purple-50 text-purple-600"
          )}>
            {node.type === 'Category' ? <Layers className="w-5 h-5" /> :
             node.resourceType === 'Labor' ? <Briefcase className="w-5 h-5" /> :
             node.resourceType === 'Material' ? <Package className="w-5 h-5" /> :
             <Truck className="w-5 h-5" />}
          </div>

          <div className="flex-1">
            <div className="font-bold text-slate-900">{node.title}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{node.description}</div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFormData({ ...formData, parentId: node.id });
                setIsAdding(true);
              }}
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"
              title="Add Child"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(node.id);
                setFormData(node);
                setIsAdding(true);
              }}
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node.id);
              }}
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isExpanded && children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const rootNodes = nodes.filter(n => !n.parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Resource Breakdown Structure (RBS)</h2>
          <p className="text-sm text-slate-500">Authoritative hierarchical library for project resources.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ type: 'Category', resourceType: 'Labor' });
            setIsAdding(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Plus className="w-4 h-4" />
          Add Root Category
        </button>
      </div>

      <div className="space-y-2">
        {rootNodes.map(node => renderNode(node))}
        {rootNodes.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <Layers className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No RBS nodes defined yet.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">
                  {editingId ? 'Edit Node' : 'Add New Node'}
                </h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                  <div className="flex gap-2">
                    {['Category', 'Resource'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setFormData({ ...formData, type: t as any })}
                        className={cn(
                          "flex-1 py-3 rounded-2xl text-sm font-bold transition-all border",
                          formData.type === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.type === 'Resource' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resource Type</label>
                    <select
                      value={formData.resourceType}
                      onChange={(e) => setFormData({ ...formData, resourceType: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    >
                      <option value="Labor">Labor</option>
                      <option value="Material">Material</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    placeholder="e.g. Civil Engineers"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[100px]"
                    placeholder="Brief description of the category or resource..."
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
