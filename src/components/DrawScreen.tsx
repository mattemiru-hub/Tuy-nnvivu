import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Prize, Winner, Ticket, DrawProgram, DrawStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RefreshCcw, 
  ChevronRight, 
  AlertTriangle, 
  Users, 
  Ticket as TicketIcon, 
  Play, 
  Check, 
  Info, 
  X, 
  Star, 
  Gift, 
  Music, 
  Maximize2, 
  Minimize2,
  LayoutGrid,
  RotateCcw,
  Pause,
  Crown,
  Sparkles,
  ListRestart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { shuffleArray } from '../lib/engine';
import { getAvailableParticipants, drawRandom } from '../utils/drawEngine';
import { sounds } from '../lib/sounds';
import { useTranslation } from 'react-i18next';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

// --- Types for internal logic ---
interface DrawHook {
  status: DrawStatus;
  winner: Ticket | null;
  selectedPrizeId: string | null;
  draw: () => void;
  confirm: () => Promise<void>;
  reroll: () => void;
  reset: () => void;
  selectPrize: (id: string) => void;
}

export default function DrawScreen({ 
  state, 
  updateState, 
  onNavigate 
}: { 
  state: AppState, 
  updateState: (updater: (prev: AppState) => AppState) => void, 
  onNavigate: (tab: any) => void 
}) {
  const { t } = useTranslation();
  
  // -- Local State --
  const [status, setStatus] = useState<DrawStatus>(DrawStatus.READY);
  const [currentWinner, setCurrentWinner] = useState<Ticket | null>(null);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailWinner, setDetailWinner] = useState<Winner | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [visualPool, setVisualPool] = useState<Ticket[]>([]);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // -- Derived State --
  const currentProgram = useMemo(() => 
    state.programs.find(p => p.id === state.activeProgramId) || state.programs[0]
  , [state.programs, state.activeProgramId]);

  const allPrizes = useMemo(() => 
    currentProgram?.prizes.filter(p => p.isActive).sort((a, b) => b.priority - a.priority) || []
  , [currentProgram]);

  const activePrize = useMemo(() => 
    allPrizes.find(p => p.id === selectedPrizeId) || allPrizes[0]
  , [allPrizes, selectedPrizeId]);

  const programWinners = useMemo(() => 
    state.winners.filter(w => w.programId === currentProgram?.id)
  , [state.winners, currentProgram]);

  const availablePool = useMemo(() => 
    currentProgram ? getAvailableParticipants(currentProgram.ticketPool, state.winners, currentProgram.id) : []
  , [currentProgram, state.winners]);

  // -- Audio Effects --
  useEffect(() => {
    if (currentProgram?.bgmEnabled && currentProgram?.bgmUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentProgram.bgmUrl);
        audioRef.current.loop = true;
      } else if (audioRef.current.src !== currentProgram.bgmUrl) {
        audioRef.current.src = currentProgram.bgmUrl;
      }
      audioRef.current.volume = currentProgram.bgmVolume ?? 0.5;
      audioRef.current.play().catch(() => console.log("Autoplay blocked"));
    } else {
      audioRef.current?.pause();
    }
    return () => audioRef.current?.pause();
  }, [currentProgram?.bgmEnabled, currentProgram?.bgmUrl, currentProgram?.bgmVolume]);

  // -- Handlers --
  const handleSelectPrize = (id: string) => {
    if (status === DrawStatus.DRAWING) return;
    setSelectedPrizeId(id);
    setCurrentWinner(null);
    setStatus(DrawStatus.READY);
  };

  const handleDraw = () => {
    if (status === DrawStatus.DRAWING || !activePrize || activePrize.remaining === 0 || availablePool.length === 0) {
      if (availablePool.length === 0) setError("No participants left in the pool.");
      return;
    }

    setStatus(DrawStatus.DRAWING);
    setError(null);
    setCurrentWinner(null);

    // Initial countdown
    let count = 3;
    setCountdown(count);
    sounds.playSpinProgress(0.1);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        sounds.playSpinProgress(0.1);
      } else {
        clearInterval(timer);
        setCountdown(null);
        startSpinning();
      }
    }, 800);
  };

  const startSpinning = () => {
    const winnerTicket = drawRandom(availablePool);
    if (!winnerTicket) {
      setError("Failed to select a winner.");
      setStatus(DrawStatus.READY);
      return;
    }

    let ticks = 0;
    const maxTicks = 40;
    const baseInterval = 50;

    const tick = () => {
      setVisualPool(shuffleArray(currentProgram.ticketPool).slice(0, 5));
      sounds.playSpinProgress(0.08);
      ticks++;

      if (ticks < maxTicks) {
        const easing = ticks > (maxTicks * 0.7) ? Math.pow(ticks - (maxTicks * 0.7), 1.5) * 6 : 0;
        animationRef.current = setTimeout(tick, baseInterval + easing);
      } else {
        sounds.playDrumroll();
        setTimeout(() => {
          setCurrentWinner(winnerTicket);
          setStatus(DrawStatus.RESULT);
          sounds.playSuccess();
          fireConfetti();
        }, 500);
      }
    };

    tick();
  };

  const confirmWinner = async () => {
    if (!currentWinner || !activePrize || !currentProgram) return;

    try {
      // Optimistic check
      if (state.winners.some(w => w.ticketId === currentWinner.id && w.programId === currentProgram.id)) {
         setCurrentWinner(null);
         setStatus(DrawStatus.READY);
         return;
      }

      await supabaseService.recordWinner(currentProgram.id, currentWinner, activePrize);
      await supabaseService.updatePrizeRemaining(activePrize.id, Math.max(0, activePrize.remaining - 1));
      
      setCurrentWinner(null);
      setStatus(DrawStatus.READY);
    } catch (err) {
      console.error(err);
      setError("Failed to record winner. Please try again.");
    }
  };

  const handleReroll = () => {
    setCurrentWinner(null);
    setStatus(DrawStatus.READY);
    handleDraw();
  };

  const resetWinners = async () => {
    if (!currentProgram || !confirm("Reset all winners for this program?")) return;
    try {
      await supabaseService.resetProgramWinners(currentProgram.id);
      setCurrentWinner(null);
      setStatus(DrawStatus.READY);
    } catch (err) {
      setError("Failed to reset winners.");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#f59e0b', '#FFFFFF'] });
  };

  if (!currentProgram || currentProgram.ticketPool.length === 0 || currentProgram.prizes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="bg-white p-12 rounded-[3rem] text-center space-y-6 max-w-lg w-full shadow-2xl border border-slate-100">
           <AlertTriangle size={64} className="text-amber-500 mx-auto" />
           <h3 className="text-3xl font-black text-slate-800 tracking-tight">Configuration Needed</h3>
           <p className="text-slate-500 font-medium">Please ensure the program has both participants and prizes configured before starting.</p>
           <button onClick={() => onNavigate('setup')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800">
             Go to Settings
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FFFDF0] overflow-hidden">
      {/* Event Timeline / Feed Sidebar */}
      <aside className="w-80 border-r border-slate-100 bg-white/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Feed</p>
             <h4 className="text-sm font-black text-slate-800 uppercase italic">Event History</h4>
           </div>
           <button onClick={resetWinners} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Reset Session">
              <ListRestart size={18} />
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {programWinners.length > 0 ? (
            programWinners.map((w, idx) => (
              <motion.div 
                key={w.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setDetailWinner(w)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group",
                  idx === 0 ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-xs",
                    idx === 0 ? "bg-indigo-600" : "bg-slate-200 text-slate-500"
                  )}>
                    {w.prizeImage ? <img src={w.prizeImage} className="w-full h-full object-cover rounded-xl" /> : <Trophy size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate leading-none mb-1">{w.ticketName}</p>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{w.prizeName}</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center opacity-20 grayscale">
              <Star size={48} className="mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Awaiting Results</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50/80 border-t border-slate-100">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Winners</span>
                <span className="text-sm font-black text-slate-800">{programWinners.length} Drawn</span>
              </div>
              <Trophy size={20} className="text-amber-500" />
           </div>
        </div>
      </aside>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header/Banner (Secondary) */}
        <header className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-100 z-10">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <select 
                   value={state.activeProgramId || ''} 
                   onChange={(e) => updateState(prev => ({ ...prev, activeProgramId: e.target.value }))}
                   className="bg-indigo-50 border-none rounded-xl px-4 py-2 font-black text-xs text-indigo-700 uppercase tracking-widest outline-none cursor-pointer"
                >
                   {state.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
             {currentProgram.thumbnail && (
               <div className="h-10 w-40 rounded-lg overflow-hidden border border-slate-200">
                  <img src={currentProgram.thumbnail} className="w-full h-full object-cover" />
               </div>
             )}
          </div>

          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Competition Pool</p>
                <p className="text-sm font-black text-slate-800">{currentProgram.ticketPool.length} Candidates</p>
             </div>
             <button onClick={toggleFullscreen} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
             </button>
          </div>
        </header>

        {/* Dynamic Display Area (Primary) */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
          {/* Visual fluff for ambiance */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

          <AnimatePresence mode="wait">
            {status === DrawStatus.READY && (
              <motion.div 
                key="ready"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="text-center space-y-12 max-w-4xl"
              >
                <div className="space-y-4">
                   <p className="text-[14px] font-black text-indigo-500 uppercase tracking-[0.5em] animate-pulse">Awaiting the moment</p>
                   <h2 className="text-8xl font-black text-slate-900 tracking-tighter uppercase italic leading-none drop-shadow-sm">Ready to Draw</h2>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                   {allPrizes.map(p => (
                     <button 
                        key={p.id}
                        onClick={() => handleSelectPrize(p.id)}
                        disabled={p.remaining === 0}
                        className={cn(
                          "px-6 py-4 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left group",
                          selectedPrizeId === p.id 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100" 
                            : "bg-white border-slate-100 hover:border-indigo-300 text-slate-800",
                          p.remaining === 0 && "opacity-40 grayscale grayscale cursor-not-allowed"
                        )}
                     >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl shadow-inner",
                          selectedPrizeId === p.id ? "bg-white/10" : "bg-slate-50"
                        )}>
                          {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-2xl" /> : <Gift size={24} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Remaining: {p.remaining}</p>
                          <p className="text-lg font-black tracking-tight leading-none italic">{p.name}</p>
                        </div>
                     </button>
                   ))}
                </div>

                <button 
                  onClick={handleDraw}
                  className="px-16 py-6 bg-slate-900 text-white rounded-3xl font-black text-2xl uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 hover:scale-105 transition-all flex items-center gap-4 mx-auto"
                >
                  <Play fill="currentColor" /> Let's Begin
                </button>
              </motion.div>
            )}

            {status === DrawStatus.DRAWING && (
              <motion.div 
                key="drawing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative mb-12">
                   <div className="w-40 h-40 border-8 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Music size={48} className="text-indigo-600 animate-bounce" />
                   </div>
                </div>
                <h3 className="text-5xl font-black text-indigo-600 tracking-tighter uppercase italic animate-pulse">Selecting Legend...</h3>
                <div className="mt-8 flex justify-center gap-4 overflow-hidden h-12 items-center">
                    {visualPool.map((t, i) => (
                      <motion.span 
                        key={`${t.id}-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap"
                      >
                        {t.name}
                      </motion.span>
                    ))}
                </div>
              </motion.div>
            )}

            {status === DrawStatus.RESULT && currentWinner && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full max-w-6xl space-y-12"
              >
                <div className="space-y-4">
                   <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-50 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100 shadow-sm mx-auto">
                      <Star size={16} fill="currentColor" /> Victory Acquired <Star size={16} fill="currentColor" />
                   </div>
                   <h2 className="text-[120px] lg:text-[180px] font-black text-slate-900 tracking-tighter italic leading-none drop-shadow-xl animate-in zoom-in duration-500">
                     {currentWinner.name}
                   </h2>
                </div>

                <div className="flex flex-col items-center gap-8">
                   <div className="px-8 py-3 bg-indigo-600 text-white rounded-2xl shadow-2xl ring-8 ring-indigo-50 font-mono text-3xl font-black">
                      <span className="opacity-40 mr-4">ID</span>
                      <span>{currentWinner.employeeId || currentWinner.upi || currentWinner.id}</span>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                      {[
                        { label: 'Department', value: currentWinner.department, icon: <LayoutGrid size={16} /> },
                        { label: 'Role', value: currentWinner.position, icon: <Star size={16} /> },
                        { label: 'Location', value: currentWinner.location, icon: <Info size={16} /> },
                        { label: 'Regional', value: currentWinner.region, icon: <Star size={16} /> },
                      ].map((field, i) => field.value && (
                        <motion.div 
                          key={field.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-left"
                        >
                           <div className="flex items-center gap-2 mb-2 text-indigo-400">
                              {field.icon}
                              <span className="text-[10px] font-black uppercase tracking-widest">{field.label}</span>
                           </div>
                           <p className="text-xl font-black text-slate-800 leading-none">{field.value}</p>
                        </motion.div>
                      ))}
                   </div>
                </div>

                <div className="flex justify-center gap-6 pt-12">
                   <button onClick={handleReroll} className="px-10 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3">
                      <RefreshCcw size={20} /> Re-roll
                   </button>
                   <button onClick={confirmWinner} className="px-16 py-5 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-100 font-black text-xl uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center gap-4">
                      <Check size={28} /> Confirm Winner
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Overlays */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div 
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-xl pointer-events-none"
            >
               <span className="text-[300px] font-black text-indigo-600 italic leading-none drop-shadow-2xl">{countdown}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Modal */}
        <AnimatePresence>
          {detailWinner && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
               <motion.div 
                 initial={{ opacity: 0, y: 100 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl p-12 relative"
               >
                  <button onClick={() => setDetailWinner(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl">
                     <X size={24} />
                  </button>
                  <div className="text-center space-y-8">
                     <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto">
                        <Trophy size={40} />
                     </div>
                     <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{detailWinner.ticketName}</h2>
                        <p className="text-indigo-500 font-black uppercase tracking-[0.2em]">Wins {detailWinner.prizeName}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-left p-6 bg-slate-50 rounded-3xl">
                        {[
                          { label: 'Employee ID', value: detailWinner.employeeId },
                          { label: 'Location', value: detailWinner.location },
                          { label: 'Manager', value: detailWinner.lineManager },
                          { label: 'Department', value: detailWinner.department },
                        ].map(f => (
                          <div key={f.label}>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                             <p className="text-sm font-bold text-slate-700">{f.value || 'N/A'}</p>
                          </div>
                        ))}
                     </div>
                     <button onClick={() => setDetailWinner(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest">
                        Close Details
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4"
            >
              <AlertTriangle size={24} className="text-amber-500" />
              <p className="font-bold text-sm">{error}</p>
              <button onClick={() => setError(null)} className="ml-4 p-2 hover:bg-white/10 rounded-lg">
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Reuse layout components from original if needed, but here we rebuild for cleaner flow
