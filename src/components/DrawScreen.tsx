/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppState, Prize, Winner, Ticket } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCcw, LayoutGrid, ChevronRight, AlertTriangle, Power, Users, Ticket as TicketIcon, Play, Check, Info, X, Zap, Clock, Star, Gift, Music } from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { getEligibleTickets, pickWinner, shuffleArray } from '../lib/engine';
import { sounds } from '../lib/sounds';
import { useTranslation } from 'react-i18next';

export default function DrawScreen({ state, updateState, onNavigate }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void, onNavigate: (tab: any) => void }) {
  const { t } = useTranslation();
  const activePrograms = state.programs.filter(p => p.isActive);
  const currentProgram = activePrograms.find(p => p.id === state.activeProgramId) || activePrograms[0];
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Ticket | null>(null);
  const [pendingWinner, setPendingWinner] = useState<Ticket | null>(null);
  const [visualPool, setVisualPool] = useState<Ticket[]>([]); 
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showMobilePrizes, setShowMobilePrizes] = useState(false);
  const [showMobileWinners, setShowMobileWinners] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (activePrograms.length > 0 && (!state.activeProgramId || !activePrograms.find(p => p.id === state.activeProgramId))) {
      updateState(prev => ({ ...prev, activeProgramId: activePrograms[0].id }));
    }
  }, [activePrograms.length, state.activeProgramId]);

  const activePrizes = currentProgram?.prizes.filter(p => p.isActive && p.remaining > 0).sort((a, b) => b.priority - a.priority) || [];
  const selectedPrize = activePrizes.find(p => p.id === selectedPrizeId) || activePrizes[0];

  const handleToggleProgramActive = (id: string) => {
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
    }));
  };

  useEffect(() => {
    setCurrentWinner(null);
    setError(null);
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [selectedPrizeId]);

  if (!currentProgram) return (
    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
       <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
         <AlertTriangle size={40} />
       </div>
       <h3 className="text-2xl font-black uppercase tracking-tight">No Active Sessions</h3>
       <button onClick={() => onNavigate('setup')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Go to Program Manager</button>
    </div>
  );

  const handleDraw = () => {
    if (isDrawing || pendingWinner || !selectedPrize) return;
    
    // Start Countdown 3-2-1
    let cd = 3;
    setCountdown(cd);
    
    const cdInterval = setInterval(() => {
      cd--;
      if (cd > 0) {
        setCountdown(cd);
        sounds.playSpinProgress(0.1); // Use a short sound for tick
      } else {
        clearInterval(cdInterval);
        setCountdown(null);
        startActualDraw();
      }
    }, 800);
  };

  const startActualDraw = () => {
    setIsDrawing(true);
    setCurrentWinner(null);
    setError(null);

    const winner = pickWinner(currentProgram, state.winners, selectedPrize);

    if (!winner) {
      setError(t('draw.error_no_tickets') || "Không tìm thấy phiếu hợp lệ thỏa mãn các quy tắc.");
      setIsDrawing(false);
      return;
    }

    const poolTickets = currentProgram.ticketPool.length > 0 ? currentProgram.ticketPool : [];
    let count = 0;
    const maxTicks = 45;
    const baseInterval = 40;

    const tick = () => {
      try {
        if (poolTickets.length > 0) {
          setVisualPool(shuffleArray(poolTickets).slice(0, 5));
        }
        
        // Fast energetic spinning sounds
        sounds.playSpinProgress(0.08);
        
        count++;
        if (count < maxTicks) {
          const factor = count > (maxTicks * 0.7) ? Math.pow(count - (maxTicks * 0.7), 1.6) * 5 : 0;
          animationRef.current = setTimeout(tick, baseInterval + factor);
        } else {
          // Play final dramatic drumroll before reveal
          sounds.playDrumroll();
          
          setTimeout(() => {
            setPendingWinner(winner);
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

  const confirmWinner = () => {
    if (!pendingWinner || !selectedPrize) return;
    recordWinner(pendingWinner, selectedPrize);
    setCurrentWinner(pendingWinner);
    setPendingWinner(null);
  };

  const cancelWinner = () => {
    setPendingWinner(null);
    setCurrentWinner(null);
  };

  const recordWinner = (ticket: Ticket, prize: Prize) => {
    const newWinner: Winner = {
      id: generateId(),
      drawTime: Date.now(),
      programId: currentProgram.id,
      programName: currentProgram.name,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeImage: prize.image,
      ticketId: ticket.id,
      ticketName: ticket.name,
      email: ticket.email,
      employeeId: ticket.employeeId,
      department: ticket.department,
      position: ticket.position,
      channel: ticket.channel,
      lineManager: ticket.lineManager,
      region: ticket.region,
      prizeRemainingAtDraw: prize.remaining - 1
    };

    updateState(prev => ({
      ...prev,
      winners: [newWinner, ...prev.winners],
      programs: prev.programs.map(p => 
        p.id === currentProgram.id 
          ? { 
              ...p, 
              prizes: p.prizes.map(pr => 
                pr.id === prize.id ? { ...pr, remaining: pr.remaining - 1 } : pr
              ) 
            } 
          : p
      )
    }));
  };

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#f59e0b', '#FFFFFF'] });
  };

  const resetResults = () => {
    if (!currentProgram) return;
    if (!confirm("Bạn có chắc chắn muốn xóa TẤT CẢ kết quả của chương trình này? Hành động này không thể hoàn tác.")) return;
    
    updateState(prev => ({
      ...prev,
      winners: prev.winners.filter(w => w.programId !== currentProgram.id),
      programs: prev.programs.map(p => 
        p.id === currentProgram.id 
          ? { 
              ...p, 
              prizes: p.prizes.map(pr => ({ ...pr, remaining: pr.quantity })) 
            } 
          : p
      )
    }));
    setCurrentWinner(null);
    setPendingWinner(null);
  };

  const programWinners = state.winners.filter(w => w.programId === currentProgram.id);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0f]">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        {isDrawing && (
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] animate-pulse" />
        )}
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Mobile View Toggle Buttons */}
        <div className="lg:hidden absolute top-4 right-4 z-50 flex gap-2">
           <button 
             onClick={() => setShowMobilePrizes(!showMobilePrizes)}
             className={cn(
               "w-10 h-10 rounded-full flex items-center justify-center transition-all",
               showMobilePrizes ? "bg-indigo-600 text-white" : "bg-white/10 text-white/40 backdrop-blur-md"
             )}
           >
              <Gift size={18} />
           </button>
           <button 
             onClick={() => setShowMobileWinners(!showMobileWinners)}
             className={cn(
               "w-10 h-10 rounded-full flex items-center justify-center transition-all",
               showMobileWinners ? "bg-indigo-600 text-white" : "bg-white/10 text-white/40 backdrop-blur-md"
             )}
           >
              <Clock size={18} />
           </button>
        </div>

        {/* Left Sidebar: Prizes & Controls */}
        <aside className={cn(
          "fixed inset-y-0 left-0 w-80 border-r border-white/5 bg-black/80 backdrop-blur-3xl z-40 lg:relative lg:translate-x-0 transition-transform duration-300 lg:bg-black/40 lg:flex flex-col flex-shrink-0",
          showMobilePrizes ? "translate-x-0" : "-translate-x-full"
        )}>
           <div className="p-8 border-b border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                   <Zap size={20} />
                </div>
                <div className="flex flex-col">
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-widest leading-none mb-1">Station</h3>
                   <p className="text-sm font-black text-white uppercase italic tracking-tighter">Command Center</p>
                </div>
                
                {/* Audio Quick Toggles */}
                <div className="ml-auto flex items-center gap-2 group/audio">
                   <button 
                     onClick={() => {
                        updateState(prev => ({
                          ...prev,
                          programs: prev.programs.map(p => p.id === currentProgram.id ? { ...p, bgmEnabled: !p.bgmEnabled } : p)
                        }));
                     }}
                     className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                       currentProgram?.bgmEnabled ? "bg-indigo-600 text-white" : "bg-white/5 text-white/40"
                     )}
                   >
                     <Music size={14} />
                   </button>
                   <div className="w-0 group-hover/audio:w-16 overflow-hidden transition-all duration-300">
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={currentProgram?.bgmVolume ?? 0.5}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateState(prev => ({
                            ...prev,
                            programs: prev.programs.map(p => p.id === currentProgram.id ? { ...p, bgmVolume: val } : p)
                          }));
                        }}
                        className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Active Pool</span>
                       <span className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          currentProgram.isActive ? "bg-green-500" : "bg-red-500"
                       )} />
                    </div>
                    <p className="text-sm font-black text-indigo-400 uppercase tracking-tighter truncate">{currentProgram.name}</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
              <section>
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                       <Gift size={12} className="text-indigo-500" /> Selective Prizes
                    </h4>
                    <button 
                      onClick={resetResults}
                      className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Reset All
                    </button>
                 </div>
                 <div className="space-y-3">
                    {activePrizes.map((p) => (
                       <button
                          key={p.id}
                          onClick={() => setSelectedPrizeId(p.id)}
                          disabled={isDrawing || p.remaining === 0}
                          className={cn(
                             "w-full p-4 rounded-2xl border transition-all text-left group relative",
                             selectedPrize?.id === p.id 
                               ? "bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-600/20" 
                               : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10"
                          )}
                       >
                          <div className="flex gap-3 mb-3">
                             <div className="w-10 h-10 rounded-xl bg-black/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Trophy size={16} />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className="text-xs font-black uppercase tracking-tight truncate">{p.name}</p>
                                <p className="text-[10px] font-bold opacity-40">Value: {(p.value || 0).toLocaleString()} {state.settings.currency}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
                                <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${((p.quantity - p.remaining) / p.quantity) * 100}%` }}
                                   className="h-full bg-indigo-400"
                                />
                             </div>
                             <span className="text-[9px] font-black tracking-widest">{p.remaining} LEFT</span>
                          </div>
                       </button>
                    ))}
                 </div>
              </section>
           </div>

           <div className="p-6 border-t border-white/5 bg-black/40">
              <button 
                onClick={() => onNavigate('dashboard')}
                className="w-full py-4 text-[10px] font-black uppercase text-white/40 tracking-widest hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
              >
                <LayoutGrid size={14} /> Exit To Dashboard
              </button>
           </div>
        </aside>

        {/* Center Main: The Drawing Engine */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#0a0a0f] relative overflow-hidden">
           {/* Program Banner */}
           {currentProgram.thumbnail && (
              <div 
                className="w-full relative overflow-hidden flex-shrink-0 z-20 transition-all duration-700"
                style={{ height: `${currentProgram.bannerHeight || 12}vh`, minHeight: '100px', maxHeight: '240px' }}
              >
                 <img 
                  src={currentProgram.thumbnail} 
                  alt={currentProgram.name} 
                  className={cn(
                    "w-full h-full",
                    currentProgram.bannerFit === 'contain' ? "object-contain bg-slate-900" : "object-cover"
                  )}
                  style={{ objectPosition: `center ${currentProgram.bannerPosition ?? 50}%` }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-60" />
                 
                 {/* Floating Badges on Banner */}
                 <div className="absolute bottom-4 left-8 z-30 flex items-center gap-3">
                    <div className="px-3 py-1 bg-indigo-600/80 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                       {currentProgram.theatreBadge || 'LUCKY DRAW'}
                    </div>
                    {currentProgram.isActive && (
                       <div className="px-3 py-1 bg-green-500/80 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> {currentProgram.theatreSubtitle || 'LIVE SESSION'}
                       </div>
                    )}
                 </div>
              </div>
           )}

           {/* Theater Header (Thin Banner) */}
           <div className="h-16 lg:h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm relative z-20">
              <div className="flex items-center gap-4">
                 <div className="lg:hidden w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white cursor-pointer" onClick={() => setShowMobilePrizes(true)}>
                    <Gift size={16} />
                 </div>
                 <h2 className="text-xs lg:text-sm font-black text-white/50 uppercase tracking-[0.2em] italic truncate max-w-[200px] lg:max-w-none">
                    {currentProgram.name} <span className="mx-2 text-white/10">|</span> <span className="text-indigo-400 underline underline-offset-4">{selectedPrize?.name}</span>
                 </h2>
              </div>
              <div className="flex items-center gap-6">
                 <div className="hidden md:flex items-center gap-2">
                    <Users size={14} className="text-white/20" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{currentProgram.ticketPool.length} CANDIDATES</span>
                 </div>
                 <div className="w-px h-6 bg-white/5" />
                 <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-white/20" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{programWinners.length} WINNERS</span>
                 </div>
              </div>
           </div>

           <div className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 min-h-0">
               {/* Countdown Overlay */}
               <AnimatePresence>
                 {countdown !== null && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 2 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.5 }}
                     className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none"
                   >
                     <p className="text-[200px] font-black text-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.5)] italic">
                       {countdown}
                     </p>
                   </motion.div>
                 )}
               </AnimatePresence>
              {/* Error Toast */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="absolute top-8 z-50 bg-red-600 text-white px-8 py-4 rounded-2xl flex items-center gap-4 shadow-2xl shadow-red-600/40"
                  >
                    <AlertTriangle size={24} className="text-white" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Attention Required</p>
                      <p className="text-sm font-bold">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X size={18} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isDrawing ? (
                  <motion.div 
                    key="drawing-theatre"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-4xl flex flex-col items-center gap-12"
                  >
                    {/* Big Numbers Layer */}
                    <div className="relative w-full h-48 md:h-64 flex items-center justify-center">
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-[150px] md:text-[250px] font-black text-white/[0.02] tracking-tighter uppercase leading-[0.8] italic select-none">
                             {selectedPrize?.name}
                          </p>
                       </div>
                       
                       <div className="flex gap-4 md:gap-8 relative z-10">
                          {[0, 1, 2, 3, 4].map((i) => (
                             <motion.div 
                                key={i}
                                animate={{ 
                                   y: [-20, 20, -20],
                                   opacity: [0.3, 1, 0.3]
                                }}
                                transition={{ 
                                   duration: 0.15, 
                                   repeat: Infinity,
                                   delay: i * 0.05
                                }}
                                className="w-16 h-24 md:w-24 md:h-36 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center text-4xl md:text-7xl font-black text-white font-mono shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                             >
                                {visualPool[0]?.id.charAt(visualPool[0]?.id.length - 1 - i) || Math.floor(Math.random() * 10)}
                             </motion.div>
                          ))}
                       </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                       <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.8em]">SCANNING POOL ENTIRES</p>
                       </div>
                       <p className="text-xl md:text-3xl font-black text-white tracking-widest font-mono opacity-20">
                          {visualPool[0]?.name?.toUpperCase() || "SEARCHING..."}
                       </p>
                    </div>
                  </motion.div>
                ) : (pendingWinner || currentWinner) ? (
                  <motion.div 
                    key="result-theatre"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-12"
                  >
                    {/* High Impact Winner Reveal */}
                    <div className="flex-1 relative order-2 lg:order-1">
                       <div className="absolute inset-0 bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
                       <div className="relative bg-white/5 border border-white/10 backdrop-blur-3xl p-10 md:p-14 rounded-[3rem] md:rounded-[4rem] text-center overflow-hidden">
                          {/* Banner background deco */}
                          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 blur-[80px] rounded-full" />
                          </div>

                          <motion.div 
                             initial={{ y: -50, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             className="mb-8"
                          >
                             <div className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl mb-4">
                                <Star size={12} fill="currentColor" /> {pendingWinner ? "VERIFYING RESULT" : "CELEBRATION TIME"}
                             </div>
                             <h4 className="text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter text-white mb-2 leading-tight">
                                {(pendingWinner || currentWinner)?.name}
                             </h4>
                             <p className="text-lg md:text-2xl font-black font-mono text-indigo-400 opacity-80">
                                #{(pendingWinner || currentWinner)?.id}
                             </p>
                          </motion.div>

                          <div className="grid grid-cols-2 gap-6 pt-10 border-t border-white/10">
                              <div className="text-left">
                                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Department</p>
                                 <p className="text-sm font-black text-white truncate">{(pendingWinner || currentWinner)?.department || "---"}</p>
                              </div>
                              <div className="text-left">
                                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Employee ID</p>
                                 <p className="text-sm font-black text-white truncate">{(pendingWinner || currentWinner)?.employeeId || "---"}</p>
                              </div>
                          </div>

                        </div>
                     </div>

                    {/* Prize Visual Side */}
                    <div className="w-full lg:w-72 order-1 lg:order-2 shrink-0">
                       <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-6 md:p-8 rounded-[3rem] text-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">REWARDED PRIZE</p>
                          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-3xl overflow-hidden mb-4 bg-black/20 shadow-2xl">
                             {selectedPrize?.image ? (
                                <img src={selectedPrize.image} className="w-full h-full object-cover" />
                             ) : (
                                <Trophy size={48} className="m-auto text-white/10 h-full w-full p-6" />
                             )}
                          </div>
                          <h5 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tighter leading-tight mb-1">
                             {selectedPrize?.name}
                          </h5>
                          <p className="text-[10px] font-bold text-white/30">{selectedPrize?.remaining} Units Remaining</p>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle-theatre"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-10"
                  >
                    <div className="relative">
                       <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full animate-pulse" />
                       <div className="w-48 h-48 md:w-64 md:h-64 rounded-[3rem] md:rounded-[4rem] border border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-center relative z-10">
                          <Trophy size={100} strokeWidth={0.5} className="text-white opacity-10 animate-bounce" />
                          <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-32 h-32 border-2 border-dashed border-indigo-500/20 rounded-full animate-spin-slow" />
                          </div>
                       </div>
                    </div>
                    <div className="text-center space-y-4">
                       <h3 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter">Ready for Projection</h3>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.8em]">SELECT PRIZE & START ACTION</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           <div className="h-28 md:h-32 border-t border-white/5 bg-black/60 backdrop-blur-3xl px-8 flex items-center justify-center relative z-30 shrink-0">
              <AnimatePresence mode="wait">
                {pendingWinner ? (
                  <motion.div 
                    key="confirm-actions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-4 w-full max-w-2xl px-4"
                  >
                    <button 
                      onClick={cancelWinner}
                      className="flex-1 py-4 md:py-5 lg:py-6 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500 text-red-500 rounded-2xl md:rounded-3xl font-black text-lg md:text-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-3 italic"
                    >
                      <X size={24} /> {t('common.cancel') || 'DISCARD'}
                    </button>
                    <button 
                      onClick={() => {
                        setPendingWinner(null);
                        handleDraw();
                      }}
                      className="flex-1 py-4 md:py-5 lg:py-6 bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-400 text-indigo-400 rounded-2xl md:rounded-3xl font-black text-lg md:text-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-3 italic"
                    >
                      <RefreshCcw size={24} /> RE-ROLL
                    </button>
                    <button 
                      onClick={confirmWinner}
                      className="flex-[2] py-4 md:py-5 lg:py-6 bg-indigo-600 text-white rounded-2xl md:rounded-3xl font-black text-lg md:text-2xl uppercase tracking-widest hover:bg-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 italic"
                    >
                      <Check size={28} /> {t('common.confirm') || 'CONFIRM WINNER'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="draw-action"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleDraw}
                    disabled={isDrawing || !selectedPrize}
                    className={cn(
                        "group relative flex items-center gap-8 px-16 py-6 md:px-24 md:py-8 rounded-full transition-all duration-500 font-black text-2xl lg:text-4xl tracking-tighter uppercase italic overflow-hidden",
                        (isDrawing || !selectedPrize)
                          ? "bg-white/5 text-white/10 cursor-not-allowed border border-white/5" 
                          : "bg-indigo-600 text-white hover:bg-white hover:text-indigo-900 shadow-[0_0_80px_rgba(79,70,229,0.4)] hover:shadow-white/20 active:scale-95"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-4">
                        {isDrawing ? "DRAWING..." : t('draw.start')}
                        {!isDrawing && selectedPrize && <Play size={32} className="group-hover:translate-x-2 transition-transform" fill="currentColor" />}
                    </span>
                    
                    <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-1000 pointer-events-none" />
                  </motion.button>
                )}
              </AnimatePresence>
           </div>
        </main>

        {/* Right Sidebar: Activity Feed */}
        <aside className={cn(
          "fixed inset-y-0 right-0 w-80 border-l border-white/5 bg-black/80 backdrop-blur-3xl z-40 lg:relative lg:translate-x-0 transition-transform duration-300 lg:bg-black/40 lg:flex flex-col flex-shrink-0",
          showMobileWinners ? "translate-x-0" : "translate-x-full"
        )}>
           <div className="p-8 border-b border-white/5">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Live Feed</h4>
              <p className="text-sm font-black text-white italic tracking-tighter uppercase">Recent Session Wins</p>
           </div>

           <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
              {programWinners.length > 0 ? (
                 programWinners.slice(0, 20).map((w, idx) => (
                    <motion.div 
                       key={w.id}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.1 }}
                       className={cn(
                          "bg-white/5 border rounded-2xl p-4 group hover:bg-white/10 transition-all",
                          idx === 0 ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(79,70,229,0.2)]" : "border-white/5"
                        )}
                    >
                       <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-black">
                             {programWinners.length - idx}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-xs font-black text-white truncate leading-none mb-1">{w.ticketName}</p>
                             <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none truncate">{w.prizeName}</p>
                          </div>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                             <Clock size={8} className="inline mr-1" /> {new Date(w.drawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </motion.div>
                 ))
              ) : (
                 <div className="flex flex-col items-center justify-center text-center gap-4 py-20 opacity-20">
                    <Trophy size={40} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting First Winner</p>
                 </div>
              )}
           </div>

           <div className="p-6 bg-black/60 border-t border-white/5">
              <button 
                onClick={() => onNavigate('history')}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/60 tracking-widest hover:bg-white/10 transition-all"
              >
                Full History Log
              </button>
           </div>
        </aside>
      </div>

       {/* Mobile Overlay logic removed for better accessibility */}
       {(showMobilePrizes || showMobileWinners) && (
         <div 
           className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" 
           onClick={() => { setShowMobilePrizes(false); setShowMobileWinners(false); }}
         />
       )}
    </div>
  );
}
