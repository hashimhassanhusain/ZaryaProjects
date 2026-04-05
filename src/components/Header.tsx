import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, User as UserIcon, LogOut, Shield, Bell, Menu, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { User, signOut } from 'firebase/auth';
import { cn } from '../lib/utils';

import { useProject } from '../context/ProjectContext';
import { useUI } from '../context/UIContext';

export const Header: React.FC = () => {
  const { selectedProject, setSelectedProject, projects, loading: projectsLoading } = useProject();
  const { toggleSidebar } = useUI();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const navigate = useNavigate();

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 shadow-sm">
      {/* Left: Hamburger (Mobile) & Project Selector */}
      <div className="flex-1 flex justify-start items-center gap-2">
        <button 
          onClick={toggleSidebar}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative" ref={projectMenuRef}>
          <button 
            onClick={() => !projectsLoading && setIsProjectMenuOpen(!isProjectMenuOpen)}
            disabled={projectsLoading}
            className="flex items-center gap-3 px-3 md:px-4 py-2 hover:bg-slate-50 rounded-xl transition-all group border border-slate-100 disabled:opacity-50"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md shrink-0">
              {projectsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedProject?.name.charAt(0) || '?')}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Current Project</div>
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                <span className="truncate max-w-[100px] md:max-w-none">
                  {projectsLoading ? 'Loading...' : (selectedProject?.name || 'No Project Selected')}
                </span>
                {!projectsLoading && <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isProjectMenuOpen ? "rotate-180" : "")} />}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isProjectMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-2 z-50"
              >
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setIsProjectMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                        selectedProject?.id === project.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs",
                        selectedProject?.id === project.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        {project.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold truncate">{project.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400 italic">
                    No projects found
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center: Logo */}
      <div className="flex-1 flex justify-center">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7" alt="Zarya Logo" className="h-10 w-auto" referrerPolicy="no-referrer" />
        </button>
      </div>

      {/* Right: User & Admin Settings */}
      <div className="flex-1 flex justify-end items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-50 rounded-full transition-all border border-transparent hover:border-slate-100"
          >
            <div className="relative">
              <img 
                src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/200`} 
                alt="User" 
                className="w-9 h-9 rounded-full border-2 border-white shadow-md object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-none">{user?.displayName || 'User'}</div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Project Manager</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-2"
              >
                <div className="px-4 py-3 border-b border-slate-50 mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Signed in as</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{user?.email}</div>
                </div>
                
                <button 
                  onClick={() => {
                    navigate('/profile');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">My Profile</span>
                </button>

                <div className="h-[1px] bg-slate-50 my-2"></div>

                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
