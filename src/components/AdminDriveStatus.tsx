import React, { useState, useEffect } from 'react';
import { HardDrive, RefreshCcw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

export const AdminDriveStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testingUpload, setTestingUpload] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/drive/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch drive status:', err);
      toast.error('Failed to fetch Google Drive status');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/drive/test-connection', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Connection successful!');
        setTestResult({ success: true, type: 'connection', data });
      } else {
        toast.error(data.error || 'Connection failed');
        setTestResult({ success: false, type: 'connection', error: data.error });
      }
      fetchStatus();
    } catch (err) {
      toast.error('Network error during test');
    } finally {
      setTesting(false);
    }
  };

  const runUploadTest = async () => {
    setTestingUpload(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/drive-upload-test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('File Upload Test Passed!');
        setTestResult({ success: true, type: 'upload', data });
      } else {
        toast.error(data.error || 'Upload failed');
        setTestResult({ success: false, type: 'upload', error: data.error, details: data.details });
      }
    } catch (err: any) {
      toast.error('Upload test error');
      setTestResult({ success: false, type: 'upload', error: 'Network error' });
    } finally {
      setTestingUpload(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 italic">Connecting to Google Drive Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            {status?.initialized ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Initialization</h3>
            <p className="text-[11px] text-slate-500 font-medium">Drive Client Engine Status</p>
          </div>
          <p className={`text-xs font-bold ${status?.initialized ? 'text-emerald-600' : 'text-rose-600'}`}>
            {status?.initialized ? 'Operational' : 'Failed'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 text-indigo-600" />
            </div>
            {status?.auth_type === 'OAuth2' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Auth Method</h3>
            <p className="text-[11px] text-slate-500 font-medium">Security & Authorization</p>
          </div>
          <p className="text-xs font-bold text-slate-700">
            {status?.auth_type || 'Unknown'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Parent Folder</h3>
            <p className="text-[11px] text-slate-500 font-medium">Root Storage Container</p>
          </div>
          <code className="text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100 font-mono text-slate-600 break-all">
            {status?.parent_folder_id || 'NOT_DEFINED'}
          </code>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tight">Drive Diagnostics</h2>
            <p className="text-slate-400 text-sm max-w-lg font-medium leading-relaxed">
              Verify your integration status, test credentials, and ensure the Drive API is correctly configured for project automation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={testConnection}
              disabled={testing || testingUpload}
              className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all flex items-center gap-2 shadow-xl shadow-white/5 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
              Run Connection Test
            </button>
            <button 
              onClick={runUploadTest}
              disabled={testing || testingUpload}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center gap-2 shadow-xl shadow-blue-600/20 disabled:opacity-50"
            >
              {testingUpload ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Run Upload Test
            </button>
            <button 
              onClick={fetchStatus}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 backdrop-blur-sm border border-white/10"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {testResult && (
        <div className={cn(
          "bg-white rounded-3xl border p-6 space-y-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-500",
          testResult.success ? "border-emerald-200" : "border-rose-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center",
                testResult.success ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {testResult.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {testResult.type === 'upload' ? 'Upload Test Result' : 'Connection Test Result'}
                </h4>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  testResult.success ? "text-emerald-600" : "text-rose-600"
                )}>
                  {testResult.success ? 'Success' : 'Failure'}
                </p>
              </div>
            </div>
            {testResult.data?.link && (
              <a 
                href={testResult.data.link} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border border-slate-200"
              >
                View Uploaded Test File <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {!testResult.success && (
            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
              <p className="text-xs font-bold text-rose-900 mb-2 italic">Error Feedback:</p>
              <pre className="text-[10px] font-mono text-rose-600 whitespace-pre-wrap break-all leading-relaxed">
                {typeof testResult.error === 'string' ? testResult.error : JSON.stringify(testResult.error || testResult.details, null, 2)}
              </pre>
            </div>
          )}

          {testResult.success && testResult.type === 'upload' && (
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
              <p className="text-xs font-bold text-emerald-900 mb-2 italic">Test Payload:</p>
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <span className="text-slate-400 block uppercase font-bold tracking-tighter">File ID</span>
                  <span className="font-mono text-slate-700">{testResult.data.fileId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold tracking-tighter">Status</span>
                  <span className="font-bold text-emerald-600">VERIFIED & CLEANED UP</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {status?.last_error && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Last Engine Error</h4>
            <pre className="text-[10px] font-mono text-rose-600 whitespace-pre-wrap break-all leading-relaxed">
              {status.last_error}
            </pre>
            <div className="pt-2 flex items-center gap-4">
              <a 
                href="https://console.cloud.google.com/apis/library/drive.googleapis.com" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[9px] font-black text-rose-600 uppercase tracking-widest hover:underline"
              >
                Open Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ShieldAlert = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);
