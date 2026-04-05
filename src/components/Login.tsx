import React from 'react';
import { LogIn, ShieldCheck, HardDrive, Layout } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

export const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-900/50 overflow-hidden">
          <div className="p-12 text-center space-y-8">
            <div className="flex flex-col items-center gap-4">
              <img src="https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7" alt="Zarya Logo" className="h-20 w-auto mb-2" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">ZARYA</h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-1">Construction Co.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 text-sm">Sign in to access your project management workspace and Google Drive integration.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Layout className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Projects</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <HardDrive className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Drive</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Secure</span>
              </div>
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>

            <p className="text-[10px] text-slate-400 font-medium">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enterprise Grade Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
