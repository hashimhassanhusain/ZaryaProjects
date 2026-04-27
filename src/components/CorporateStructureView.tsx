import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Edit, 
  Building, 
  Globe, 
  Link as LinkIcon 
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Institution, Company, Project } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

export const CorporateStructureView: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInst, setExpandedInst] = useState<string[]>([]);
  const [expandedComp, setExpandedComp] = useState<string[]>([]);

  // Modal states
  const [showInstModal, setShowInstModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [showProjModal, setShowProjModal] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const instSnap = await getDocs(collection(db, 'institutions'));
      const compSnap = await getDocs(collection(db, 'companies'));
      const projSnap = await getDocs(collection(db, 'projects'));

      setInstitutions(instSnap.docs.map(d => ({ id: d.id, ...d.data() } as Institution)));
      setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
      setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    } catch (error) {
      console.error('Error fetching corporate data:', error);
      toast.error('Failed to load corporate structure');
    } finally {
      setLoading(false);
    }
  };

  const toggleInst = (id: string) => {
    setExpandedInst(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleComp = (id: string) => {
    setExpandedComp(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddInstitution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newInst = {
      name: formData.get('name') as string,
      type: formData.get('type') as any,
      country: formData.get('country') as string,
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.uid || 'system'
    };

    try {
      await addDoc(collection(db, 'institutions'), newInst);
      toast.success('Institution added');
      setShowInstModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add institution');
    }
  };

  const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInstId) return;

    const formData = new FormData(e.currentTarget);
    const newComp = {
      institutionId: selectedInstId,
      name: formData.get('name') as string,
      registrationNumber: formData.get('registrationNumber') as string,
      address: formData.get('address') as string,
      status: 'Active',
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.uid || 'system'
    };

    try {
      await addDoc(collection(db, 'companies'), newComp);
      toast.success('Company added');
      setShowCompModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add company');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Corporate Hierarchy</h3>
          <p className="text-sm text-slate-500">Define your organization's legal structure</p>
        </div>
        <button 
          onClick={() => setShowInstModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Institution
        </button>
      </div>

      <div className="space-y-4">
        {institutions.map(inst => (
          <div key={inst.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div 
              className={cn(
                "p-5 flex items-center justify-between cursor-pointer group",
                expandedInst.includes(inst.id) ? "bg-slate-50 border-b border-slate-100" : ""
              )}
              onClick={() => toggleInst(inst.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <Building2 className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{inst.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">
                      {inst.type}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {inst.country}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInstId(inst.id);
                    setShowCompModal(true);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
                {expandedInst.includes(inst.id) ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
              </div>
            </div>

            {expandedInst.includes(inst.id) && (
              <div className="p-4 bg-slate-50/50 space-y-3">
                {companies.filter(c => c.institutionId === inst.id).map(comp => (
                  <div key={comp.id} className="bg-white ml-8 rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleComp(comp.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-slate-400" />
                        <div>
                          <div className="font-bold text-slate-800 tracking-tight">{comp.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">REG: {comp.registrationNumber || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                        {expandedComp.includes(comp.id) ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </div>
                    </div>

                    {expandedComp.includes(comp.id) && (
                      <div className="p-3 bg-slate-50/30 border-t border-slate-50">
                        <div className="ml-8 space-y-2">
                          {projects.filter(p => p.companyId === comp.id).map(proj => (
                            <div key={proj.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 text-sm">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  proj.status === 'active' ? "bg-emerald-500" : "bg-slate-300"
                                )} />
                                <span className="font-bold text-slate-700">{proj.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  {proj.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="p-1 text-slate-300 hover:text-slate-600">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button className="flex items-center gap-2 p-2 text-xs font-bold text-blue-600 hover:text-blue-700 ml-5 opacity-70 hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5" />
                            Create Project in this Branch
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {companies.filter(c => c.institutionId === inst.id).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm italic ml-8 border-2 border-dashed border-slate-200 rounded-3xl">
                    No subsidiaries defined for this institution.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Institution Modal */}
      {showInstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">New Institution</h3>
              <p className="text-sm text-slate-500 mt-1">Register a top-level parent organization</p>
            </div>
            <form onSubmit={handleAddInstitution} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Institution Name</label>
                  <input name="name" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800" placeholder="e.g. Zarya Construction Group" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                    <select name="type" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800">
                      <option value="owner">Owner</option>
                      <option value="contractor">Contractor</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Country</label>
                    <input name="country" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800" placeholder="Iraq" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInstModal(false)} className="flex-1 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Save Institution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">New Subsidiary Branch</h3>
              <p className="text-sm text-slate-500 mt-1">Add a branch under {institutions.find(i => i.id === selectedInstId)?.name}</p>
            </div>
            <form onSubmit={handleAddCompany} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Company / Branch Name</label>
                  <input name="name" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800" placeholder="e.g. Baghdad Branch" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Registration Number</label>
                  <input name="registrationNumber" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800" placeholder="LE-45892" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Headquarters Address</label>
                  <input name="address" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800" placeholder="Karada, Baghdad" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCompModal(false)} className="flex-1 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all">Add Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
