import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCw, 
  Download,
  Maximize2,
  Minimize2,
  Hand,
  Ruler,
  MousePointer2,
  FileOutput,
  Info
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileType: 'dwg' | 'pdf' | 'image' | string;
  fileName: string;
  details?: any;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileType, 
  fileName,
  details 
}) => {
  const { t, isRtl } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [activeTool, setActiveTool] = useState<'pan' | 'select' | 'measure'>('pan');
  const [measurePoints, setMeasurePoints] = useState<{x: number, y: number}[]>([]);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // CAD simulation state
  const [cadScale, setCadScale] = useState(100); // 1 unit = 100mm example

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      x.set(0);
      y.set(0);
      setMeasurePoints([]);
    }
  }, [isOpen]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const resetView = () => {
    setZoom(1);
    setRotation(0);
    x.set(0);
    y.set(0);
  };

  const isDwg = fileType.toLowerCase().includes('dwg');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => fileType.toLowerCase().includes(ext)) || fileType === 'image';
  const isPdf = fileType.toLowerCase().includes('pdf');

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (activeTool === 'measure') {
      const rect = constraintsRef.current?.getBoundingClientRect();
      if (rect) {
        const point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        setMeasurePoints(prev => prev.length >= 2 ? [point] : [...prev, point]);
      }
    }
  };

  const calculateDistance = () => {
    if (measurePoints.length !== 2) return null;
    const dx = measurePoints[1].x - measurePoints[0].x;
    const dy = measurePoints[1].y - measurePoints[0].y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    // Rough simulation: 1px = cadScale/100 mm in "real world" scale
    const realValue = (pixels * (cadScale / 50)).toFixed(2);
    return realValue;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl">
          {/* Top Bar */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-0 left-0 right-0 h-20 bg-slate-900/50 border-b border-white/10 z-50 flex items-center justify-between px-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                {isDwg ? <Maximize2 className="w-5 h-5 text-blue-400" /> : <Info className="w-5 h-5 text-slate-400" />}
              </div>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight uppercase truncate max-w-[300px]">
                  {fileName}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {isDwg ? "AutoCAD Technical Drawing" : isPdf ? "PDF Document" : "Image Asset"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/5 p-1 rounded-2xl flex items-center gap-1 border border-white/10 mr-4">
                <button 
                  onClick={() => setActiveTool('pan')}
                  className={cn("p-2.5 rounded-xl transition-all", activeTool === 'pan' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                  title={isRtl ? "تحريك" : "Pan"}
                >
                  <Hand className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActiveTool('select')}
                  className={cn("p-2.5 rounded-xl transition-all", activeTool === 'select' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                  title={isRtl ? "تحديد" : "Select"}
                >
                  <MousePointer2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActiveTool('measure')}
                  className={cn("p-2.5 rounded-xl transition-all", activeTool === 'measure' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
                  title={isRtl ? "قياس" : "Measure"}
                >
                  <Ruler className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                <button onClick={handleZoomOut} className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black text-white w-12 text-center uppercase tracking-tighter">
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={handleZoomIn} className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <button 
                onClick={() => {
                  const downloadUrl = details?.webContentLink || fileUrl;
                  window.open(downloadUrl, '_blank');
                }}
                className="p-3 text-slate-400 hover:text-white transition-all bg-white/5 rounded-xl"
              >
                <Download className="w-5 h-5" />
              </button>
              <button 
                onClick={onClose}
                className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Main Viewer Area */}
          <div className="w-full h-full pt-20 flex" ref={constraintsRef}>
            {/* Sidebar Details */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-80 h-full border-r border-white/5 bg-slate-900/30 p-8 space-y-8 overflow-y-auto hidden lg:block"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('metadata')}</label>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Status</span>
                    <span className="text-[10px] text-emerald-400 font-black uppercase">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Revision</span>
                    <span className="text-[10px] text-white font-black uppercase">P01</span>
                  </div>
                  {details?.division && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Division</span>
                      <span className="text-[10px] text-blue-400 font-black uppercase">{details.division}</span>
                    </div>
                  )}
                </div>
              </div>

              {activeTool === 'measure' && (
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 space-y-4">
                  <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Measurement Tool
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-white">
                      <span className="text-[10px] font-bold opacity-60">Result:</span>
                      <span className="text-xl font-black italic tracking-tighter">
                        {calculateDistance() || '0.00'} <span className="text-[10px] not-italic ml-1">mm</span>
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed font-medium">
                      Click two points on the drawing to calculate distance. 
                      Scale: 1:100 (Project Standard)
                    </p>
                    <button 
                      onClick={() => setMeasurePoints([])}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Clear Points
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 opacity-40">
                <div className="h-20 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">History Log</span>
                </div>
              </div>
            </motion.div>

            {/* Viewport */}
            <div 
              className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center p-12 cursor-crosshair"
              onClick={handleCanvasClick}
            >
              {isPdf ? (
                <iframe 
                  src={`${fileUrl}#toolbar=0`} 
                  className="w-full h-full rounded-2xl shadow-2xl border border-white/10"
                  style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
                />
              ) : isDwg || isImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <motion.div
                    drag={activeTool === 'pan'}
                    dragConstraints={constraintsRef}
                    dragElastic={0}
                    style={{ x, y }}
                    className="relative"
                  >
                    <motion.div
                      animate={{ scale: zoom, rotate: rotation }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="relative"
                    >
                      {isDwg ? (
                        <div className="relative">
                          <img 
                            src={details?.previewUrl || "https://images.unsplash.com/photo-1541888941259-792739460a3b?q=80&w=2070&auto=format&fit=crop"} 
                            className="max-w-[4000px] h-auto shadow-2xl invert opacity-80 mix-blend-screen"
                            alt="CAD Preview"
                          />
                          {/* CAD Grid Simulation */}
                          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff10_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
                        </div>
                      ) : (
                        <img 
                          src={fileUrl} 
                          className="max-w-[4000px] h-auto shadow-2xl"
                          alt={fileName}
                        />
                      )}

                      {/* Measurement Overlay */}
                      {measurePoints.map((p, i) => (
                        <div 
                          key={i} 
                          className="absolute w-3 h-3 bg-rose-500 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-xl z-[60]"
                          style={{ left: p.x, top: p.y }}
                        />
                      ))}
                      {measurePoints.length === 2 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[55]">
                          <line 
                            x1={measurePoints[0].x} 
                            y1={measurePoints[0].y} 
                            x2={measurePoints[1].x} 
                            y2={measurePoints[1].y} 
                            stroke="rgba(244, 63, 94, 0.8)" 
                            strokeWidth="2" 
                            strokeDasharray="4 4"
                          />
                          <text 
                            x={(measurePoints[0].x + measurePoints[1].x) / 2} 
                            y={(measurePoints[0].y + measurePoints[1].y) / 2 - 10} 
                            fill="#fff" 
                            fontSize="12" 
                            fontWeight="bold" 
                            className="drop-shadow-lg"
                          >
                            {calculateDistance()} mm
                          </text>
                        </svg>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center">
                    <FileOutput className="w-10 h-10 text-slate-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Preview Unavailable</h3>
                    <p className="text-slate-400 text-[10px] uppercase font-bold mt-2">Format: {fileType}</p>
                    <button 
                      onClick={() => window.open(fileUrl, '_blank')}
                      className="mt-6 px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Download to View
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-3 flex items-center gap-3 shadow-2xl">
            <button onClick={resetView} className="px-4 py-2.5 text-[10px] font-black text-white hover:bg-white/10 rounded-xl uppercase tracking-widest transition-all">Reset</button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setRotation(r => r + 90)} 
                className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Rotate 90 Deg"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsMeasuring(!isMeasuring)} 
                className={cn("p-2.5 rounded-xl transition-all", isMeasuring ? "bg-rose-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/10")}
                title="Measurement Mode"
              >
                <Ruler className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
