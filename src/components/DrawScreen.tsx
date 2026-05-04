import React, { useState, useEffect, useRef } from 'react';
import { AppState, Prize, Winner, Ticket, DrawProgram } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCcw, LayoutGrid, ChevronRight, AlertTriangle, Power, Users, Ticket as TicketIcon, Play, Check, Info, X, Zap, Clock, Star, Gift, Music, Image as ImageIcon, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { shuffleArray } from '../lib/engine';
import { getAvailableParticipants, drawRandom } from '../utils/drawEngine';
import { sounds } from '../lib/sounds';
import { useTranslation } from 'react-i18next';
import { supabaseService } from '../services/supabaseService';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

// --- Sub-components for better organization ---

const DrawHeader = ({ 
  currentProgram, 
  state, 
  updateState, 
  isFullscreen, 
  toggleFullscreen 
}: { 
  currentProgram: DrawProgram, 
  state: AppState, 
  updateState: (updater: (prev: AppState) => AppState) => void,
  isFullscreen: boolean,
  toggleFullscreen: () => void
}) => {
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        updateState(prev => ({
          ...prev,
          programs: prev.programs.map(p => p.id === currentProgram.id ? { ...p, thumbnail: result } : p)
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBanner = () => {
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === currentProgram.id ? { ...p, thumbnail: undefined } : p)
    }));
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm w-full">
      <div className="w-full">
        {/* Banner Area */}
        <div className="relative group bg-slate-900 shadow-inner flex items-center justify-center min-h-[120px]">
          {currentProgram.thumbnail ? (
            <div className="w-full relative flex items-center justify-center bg-slate-900 overflow-hidden h-[120px] lg:h-[180px]">
              <img 
                src={currentProgram.thumbnail} 
                alt={currentProgram.name} 
                className="banner-img w-full h-full object-contain block"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <label className="cursor-pointer bg-white/90 backdrop-blur text-slate-800 p-2 lg:p-3 rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                  <ImageIcon size={16} /> Replace
                  <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                </label>
                <button 
                  onClick={removeBanner}
                  className="bg-white/90 backdrop-blur text-red-600 p-2 lg:p-3 rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="h-[120px] lg:h-[160px] w-full flex flex-col items-center justify-center border-b-2 border-dashed border-white/10 bg-slate-100">
               <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors">
                  <ImageIcon size={32} strokeWidth={1.5} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Banner</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
               </label>
            </div>
          )}
        </div>

        {/* Info & Navigation */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
             <div className="relative group/prog">
                <select 
                   value={state.activeProgramId || ''} 
                   onChange={(e) => updateState(prev => ({ ...prev, activeProgramId: e.target.value }))}
                   className="appearance-none bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 pr-10 text-sm font-black text-indigo-700 uppercase tracking-widest cursor-pointer hover:bg-indigo-100 transition-all outline-none"
                >
                   {state.programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none rotate-90" />
             </div>
             
             <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-lg border border-green-100 text-[10px] font-black uppercase tracking-widest">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Session
             </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Candidates</span>
               <span className="text-sm font-black text-slate-800">{currentProgram.ticketPool.length}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const WinnerListItem = ({ 
  winner, 
  isRecent, 
  onClick 
}: { 
  winner: Winner, 
  isRecent: boolean, 
  onClick: () => void 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl border transition-all cursor-pointer group",
        isRecent 
          ? "bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20" 
          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs",
          isRecent ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-500"
        )}>
          {winner.prizeImage ? <img src={winner.prizeImage} className="w-full h-full object-cover rounded-xl" /> : <Trophy size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <h5 className="text-sm font-black text-slate-800 truncate">{winner.ticketName}</h5>
            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap ml-2">
              {new Date(winner.drawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{winner.prizeName}</p>
        </div>
      </div>
    </motion.div>
  );
};

const WinnerDetail = ({ 
  winner, 
  onClose 
}: { 
  winner: Winner | null, 
  onClose: () => void 
}) => {
  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-8 pb-0 flex justify-between items-start">
           <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Winner Details</div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={20} />
           </button>
        </div>
        
        <div className="p-8 pt-6 space-y-8">
           <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">{winner.ticketName}</h2>
              <div className="inline-block px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-sm font-bold text-indigo-600 font-mono">ID: {winner.ticketId}</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-x-8 gap-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              {[
                { label: 'Prize', value: winner.prizeName },
                { label: 'Dept/Channel', value: winner.department },
                { label: 'UPI/Employee ID', value: winner.employeeId || winner.upi },
                { label: 'Location', value: winner.location },
                { label: 'Region', value: winner.region },
              ].map(field => field.value && (
                <div key={field.label}>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                   <p className="text-sm font-bold text-slate-700">{field.value}</p>
                </div>
              ))}
           </div>
           
           <button 
             onClick={onClose}
             className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
           >
              Done
           </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Semantic Components for Refined Layout ---

const DrawLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="draw-layout flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 w-full">
    {children}
  </div>
);

const DrawContent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 overflow-hidden w-full">
    <div className="draw-content h-full w-full">
      {children}
    </div>
  </div>
);

const WinnerDisplay = ({ 
  winner, 
  isDrawing,
  activePrize
}: { 
  winner: Ticket | null,
  isDrawing?: boolean,
  activePrize?: Prize
}) => {
  return (
    <div className="winner-display relative min-h-[450px] flex flex-col justify-center transition-all duration-500">
      <AnimatePresence mode="wait">
        {isDrawing ? (
          <motion.div 
            key="drawing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="winner-empty flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="text-indigo-600 animate-bounce" size={32} />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-3xl font-black text-indigo-600 tracking-tighter animate-pulse">ROLLING THE DRUMS...</p>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Drawing for</p>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-600 uppercase tracking-widest border border-slate-200">
                  {activePrize?.name || 'Grand Prize'}
                </div>
              </div>
            </div>
          </motion.div>
        ) : !winner ? (
          <motion.div 
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="winner-empty flex flex-col items-center justify-center gap-4 py-12"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300">
                <Trophy size={48} strokeWidth={1} />
              </div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2 border border-dashed border-slate-200 rounded-[2.5rem] pointer-events-none opacity-40"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tighter text-slate-300">READY TO DRAW</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting your command</p>
              </div>
              {activePrize && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 scale-110">
                   <Gift size={16} />
                   <span className="text-xs font-black uppercase tracking-widest">Active: {activePrize.name}</span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="winner"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full max-w-5xl mx-auto"
          >
            <div className="mb-4">
               <motion.div 
                 initial={{ y: -20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="px-6 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2"
               >
                 <Star size={14} fill="currentColor" /> We found a winner! <Star size={14} fill="currentColor" />
               </motion.div>
            </div>
            
            <h2 className="winner-name text-7xl lg:text-9xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.8] drop-shadow-md">
              {winner.name || 'Anonymous'}
            </h2>
            
            <div className="mb-12">
               <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 font-mono text-2xl font-black">
                  <span className="opacity-50">ID</span>
                  <span>{winner.id}</span>
               </div>
            </div>
            
            <div className="winner-detail grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {[
                { label: 'UPI/ID', value: winner.upi || winner.employeeId, icon: <TicketIcon size={16} /> },
                { label: 'Dept/Channel', value: winner.department, icon: <LayoutGrid size={16} /> },
                { label: 'Region', value: winner.region, icon: <Star size={16} /> },
                { label: 'Location', value: winner.location, icon: <Info size={16} /> },
                { label: 'Role/Position', value: winner.position, icon: <LayoutGrid size={16} /> },
              ].map((field, i) => field.value && (
                <motion.div 
                  key={`detail-${field.label}-${i}`}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="p-5 bg-white rounded-3xl border border-slate-100 flex flex-col items-start text-left shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2 text-indigo-400">
                    {field.icon}
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">{field.label}</span>
                  </div>
                  <p className="text-base font-black text-slate-800 truncate w-full">{field.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PrizeSelector = ({ 
  prizes, 
  selectedPrizeId, 
  onSelect,
  isDrawing
}: { 
  prizes: Prize[], 
  selectedPrizeId: string | null, 
  onSelect: (id: string) => void,
  isDrawing?: boolean
}) => {
  return (
    <div className={cn("mb-10 transition-opacity", isDrawing && "opacity-30 pointer-events-none")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-indigo-600" />
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Active Prize Categories</h4>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {prizes.map((prize) => (
          <button
            key={prize.id}
            onClick={() => onSelect(prize.id)}
            disabled={isDrawing || prize.remaining === 0}
            className={cn(
              "flex items-center gap-4 p-3 pr-6 rounded-2xl border transition-all cursor-pointer text-left min-w-[200px] h-16",
              selectedPrizeId === prize.id 
                ? "bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-600/10" 
                : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50 shadow-sm",
              prize.remaining === 0 && "opacity-50 grayscale cursor-not-allowed"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              selectedPrizeId === prize.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
            )}>
              {prize.image ? <img src={prize.image} className="w-full h-full object-cover rounded-xl" /> : <Trophy size={18} />}
            </div>
            <div>
              <p className={cn(
                "text-sm font-black tracking-tight leading-none mb-1",
                selectedPrizeId === prize.id ? "text-white" : "text-slate-800"
              )}>
                {prize.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  selectedPrizeId === prize.id ? "text-indigo-100" : "text-slate-400"
                )}>
                  {prize.remaining} / {prize.quantity} Left
                </p>
                {prize.remaining === 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const DrawMainPanel = ({ 
  currentWinner,
  onDraw,
  onReroll,
  onConfirm,
  isDrawing,
  remaining,
  activePrizeName,
  allPrizes,
  selectedPrizeId,
  onSelectPrize,
  selectedPrizeObject
}: { 
  currentWinner: Ticket | null,
  onDraw: () => void,
  onReroll: () => void,
  onConfirm: () => void,
  isDrawing: boolean,
  remaining: number,
  activePrizeName?: string,
  allPrizes: Prize[],
  selectedPrizeId: string | null,
  onSelectPrize: (id: string) => void,
  selectedPrizeObject?: Prize
}) => (
  <main className="draw-main-panel h-full flex flex-col bg-white overflow-hidden">
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 xl:p-12">
      <PrizeSelector 
        prizes={allPrizes} 
        selectedPrizeId={selectedPrizeId} 
        onSelect={onSelectPrize} 
        isDrawing={isDrawing}
      />

      <WinnerDisplay 
        winner={currentWinner} 
        isDrawing={isDrawing} 
        activePrize={selectedPrizeObject}
      />
    </div>

    <div className="p-6 lg:px-8 lg:pb-8 border-t border-slate-100 bg-slate-50/30">
      <div className="draw-controls bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-100 shadow-lg max-w-4xl mx-auto w-full flex gap-4">
        {!currentWinner && (
          <button 
            onClick={onDraw} 
            disabled={isDrawing || remaining === 0}
            className={cn(
              "flex-1 py-5 rounded-2xl font-black text-xl uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3",
              (isDrawing || remaining === 0)
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
            )}
          >
            {isDrawing ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full animate-ping" /> DRAWING...
              </>
            ) : (
              <>
                <Play size={24} fill="currentColor" /> DRAW
              </>
            )}
          </button>
        )}

        {currentWinner && !isDrawing && (
          <>
            <button 
              onClick={onReroll} 
              className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-100 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={24} /> Re-roll
            </button>
            <button 
              onClick={onConfirm} 
              className="flex-[2] py-5 bg-emerald-500 text-white rounded-2xl font-black text-xl uppercase tracking-[0.2em] hover:bg-emerald-600 shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3"
            >
              <Check size={24} /> Confirm Winner
            </button>
          </>
        )}
      </div>
    </div>
  </main>
);


const WinnerSidebar = ({ 
  programWinners, 
  onReset, 
  onShowDetail 
}: { 
  programWinners: Winner[], 
  onReset: () => void, 
  onShowDetail: (w: Winner) => void 
}) => {
  return (
    <aside className="draw-sidebar border-l border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden">
       <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Feed</h4>
            <p className="text-sm font-black text-slate-800 uppercase italic leading-none">Registered Winners</p>
          </div>
          <button 
            onClick={onReset}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
            title="Reset Winners"
          >
            <RefreshCcw size={16} />
          </button>
       </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {programWinners.length > 0 ? (
             programWinners.map((w, idx) => (
                <WinnerListItem 
                  key={w.id} 
                  winner={w} 
                  isRecent={idx === 0} 
                  onClick={() => onShowDetail(w)}
                />
             ))
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 grayscale">
                   <Star size={24} className="text-slate-300" />
                </div>
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Winners Yet</p>
             </div>
          )}
       </div>

       <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Stats</span>
                <span className="text-sm font-black text-slate-800">{programWinners.length} Drawn Total</span>
             </div>
             <Trophy size={20} className="text-amber-500" />
          </div>
       </div>
    </aside>
  );
};

export default function DrawScreen({ state, updateState, onNavigate }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void, onNavigate: (tab: any) => void }) {
  const { t } = useTranslation();
  const currentProgram = state.programs.find(p => p.id === state.activeProgramId) || state.programs[0];
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Ticket | null>(null);
  const [visualPool, setVisualPool] = useState<Ticket[]>([]); 
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailWinner, setDetailWinner] = useState<Winner | null>(null);
  
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentProgram?.bgmEnabled && currentProgram?.bgmUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentProgram.bgmUrl);
        audioRef.current.loop = true;
      } else if (audioRef.current.src !== currentProgram.bgmUrl) {
        audioRef.current.src = currentProgram.bgmUrl;
      }
      
      audioRef.current.volume = currentProgram.bgmVolume ?? 0.5;
      
      const playAudio = async () => {
         try {
            await audioRef.current?.play();
         } catch (err) {
            console.log("Audio autoplay blocked");
         }
      };
      
      playAudio();
    } else {
      audioRef.current?.pause();
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [currentProgram?.bgmEnabled, currentProgram?.bgmUrl, currentProgram?.bgmVolume]);

  useEffect(() => {
    if (state.programs.length > 0 && (!state.activeProgramId || !state.programs.find(p => p.id === state.activeProgramId))) {
      updateState(prev => ({ ...prev, activeProgramId: state.programs[0].id }));
    }
  }, [state.programs.length, state.activeProgramId]);

  useEffect(() => {
    setCurrentWinner(null);
    setError(null);
    setSelectedPrizeId(null);
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [state.activeProgramId]);

  const allPrizes = currentProgram?.prizes.filter(p => p.isActive).sort((a, b) => b.priority - a.priority) || [];
  const selectedPrize = allPrizes.find(p => p.id === selectedPrizeId) || allPrizes[0];
  
  const programWinners = state.winners.filter(w => w.programId === currentProgram?.id);
  const availablePool = currentProgram ? getAvailableParticipants(currentProgram.ticketPool, state.winners, currentProgram.id) : [];

  const handleSelectPrize = (id: string) => {
    if (isDrawing) return;
    setSelectedPrizeId(id);
    setCurrentWinner(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleDraw = () => {
    if (isDrawing || currentWinner || !selectedPrize || availablePool.length === 0) return;
    
    setIsDrawing(true);
    setError(null);
    
    // Countdown 3-2-1
    let cd = 3;
    setCountdown(cd);
    
    const cdInterval = setInterval(() => {
      cd--;
      if (cd > 0) {
        setCountdown(cd);
        sounds.playSpinProgress(0.1);
      } else {
        clearInterval(cdInterval);
        setCountdown(null);
        startActualDraw();
      }
    }, 800);
  };

  const startActualDraw = () => {
    setCurrentWinner(null);
    setError(null);

    const winner = drawRandom(availablePool);
    console.log("winner:", winner);

    if (!winner) {
      setError("No valid participants left.");
      setIsDrawing(false);
      return;
    }

    const poolTickets = currentProgram.ticketPool.length > 0 ? currentProgram.ticketPool : [];
    let count = 0;
    const maxTicks = 55;
    const baseInterval = 35;

    const tick = () => {
      try {
        if (poolTickets.length > 0) {
          setVisualPool(shuffleArray(poolTickets).slice(0, 5));
        }
        sounds.playSpinProgress(0.08);
        count++;
        if (count < maxTicks) {
          const factor = count > (maxTicks * 0.7) ? Math.pow(count - (maxTicks * 0.7), 1.6) * 5 : 0;
          animationRef.current = setTimeout(tick, baseInterval + factor);
        } else {
          sounds.playDrumroll();
          setTimeout(() => {
            setCurrentWinner(winner);
            setIsDrawing(false);
            sounds.playSuccess();
            fireConfetti();
          }, 300);
        }
      } catch (err) {
        setIsDrawing(false);
      }
    };
    tick();
  };

  const confirmWinner = async () => {
    if (!currentWinner || !selectedPrize || !currentProgram) return;
    
    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured. Please check your settings.");
      return;
    }
    
    try {
      const supabase = getSupabase();
      // Check if this winner is already recorded
      const alreadyRecorded = state.winners.some(w => w.ticketId === currentWinner.id && w.programId === currentProgram.id);
      if (alreadyRecorded) return;

      await supabaseService.recordWinner(currentProgram.id, currentWinner.id, selectedPrize.id);
      await supabaseService.updatePrizeRemaining(selectedPrize.id, Math.max(0, selectedPrize.remaining - 1));
      
      // Clear current winner from display after confirmation
      setTimeout(() => {
         setCurrentWinner(null);
      }, 1500);
    } catch (err) {
      console.error('Error confirming winner:', err);
      alert('Lỗi khi ghi nhận người thắng cuộc vào Supabase.');
    }
  };

  const handleReRoll = async () => {
    if (failingValidation()) return;
    
    if (currentWinner) {
      const winnerToRevoke = currentWinner;
      const winnerRecord = state.winners.find(w => w.ticketId === winnerToRevoke.id && w.programId === currentProgram.id);
      
      if (winnerRecord) {
        try {
          await supabaseService.revokeWinner(winnerRecord.id);
          const prize = currentProgram.prizes.find(pr => pr.id === winnerRecord.prizeId);
          if (prize) {
            await supabaseService.updatePrizeRemaining(prize.id, prize.remaining + 1);
          }
        } catch (err) {
          console.error('Error revoking winner for re-roll:', err);
        }
      }
      
      setCurrentWinner(null);
      handleDraw();
    }
  };

  const failingValidation = () => {
    if (!currentProgram) return true;
    if (availablePool.length === 0) {
      setError("No more available participants.");
      return true;
    }
    return false;
  };

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#f59e0b', '#FFFFFF'] });
  };

  const resetResults = async () => {
    if (!currentProgram) return;
    if (!confirm("Reset all winners for this program?")) return;
    
    try {
      await supabaseService.resetProgramWinners(currentProgram.id);
      setCurrentWinner(null);
    } catch (err) {
      console.error('Error resetting winners:', err);
    }
  };

  if (!currentProgram || currentProgram.ticketPool.length === 0 || currentProgram.prizes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="bg-white p-12 rounded-[3rem] text-center space-y-6 max-w-lg w-full shadow-2xl border border-slate-100">
           <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertTriangle size={48} />
           </div>
           <h3 className="text-3xl font-black text-slate-800 tracking-tight">Configuration Needed</h3>
           <p className="text-slate-500 font-medium">Please ensure the program has both participants and prizes configured before starting.</p>
           <button 
             onClick={() => onNavigate('setup')}
             className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
           >
             Go to Settings
           </button>
        </div>
      </div>
    );
  }

  return (
    <DrawLayout>
      <DrawHeader 
        currentProgram={currentProgram} 
        state={state} 
        updateState={updateState} 
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />

      <DrawContent>
        <DrawMainPanel 
          currentWinner={currentWinner}
          onDraw={handleDraw}
          onConfirm={confirmWinner}
          onReroll={handleReRoll}
          isDrawing={isDrawing}
          remaining={selectedPrize?.remaining || 0}
          activePrizeName={selectedPrize?.name}
          allPrizes={allPrizes}
          selectedPrizeId={selectedPrizeId || (allPrizes.length > 0 ? allPrizes[0].id : null)}
          onSelectPrize={handleSelectPrize}
          selectedPrizeObject={selectedPrize}
        />

        <AnimatePresence>
          {countdown !== null && (
            <motion.div 
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-white/40 backdrop-blur-md pointer-events-none"
            >
              <span className="text-[140px] lg:text-[240px] font-black text-indigo-600 italic tracking-tighter drop-shadow-2xl">{countdown}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <WinnerSidebar 
          programWinners={programWinners}
          onReset={resetResults}
          onShowDetail={(w) => setDetailWinner(w)}
        />
      </DrawContent>

      {/* Winner Detail Popup */}
      <AnimatePresence>
         {detailWinner && (
            <WinnerDetail 
              winner={detailWinner} 
              onClose={() => setDetailWinner(null)} 
            />
         )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
          >
            <AlertTriangle size={20} className="text-amber-500" />
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </DrawLayout>
  );
}
