/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppState, Prize, Winner, Ticket } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCcw, LayoutGrid, ChevronRight, AlertTriangle, Power, Users, Ticket as TicketIcon, Play, Check, Info } from 'lucide-react';
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
  const [visualPool, setVisualPool] = useState<Ticket[]>([]); 
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

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
    if (isDrawing || !selectedPrize) return;
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
            setCurrentWinner(winner);
            setIsDrawing(false);
            sounds.playSuccess();
            fireConfetti();
            recordWinner(winner, selectedPrize);
          }, 300);
        }
      } catch (err) {
        setIsDrawing(false);
      }
    };
    tick();
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

  const programWinners = state.winners.filter(w => w.programId === currentProgram.id);

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 pb-32 md:pb-12">
      {/* Selection Side - Scrollable on top for mobile */}
      <div className="w-full lg:w-80 space-y-4 lg:space-y-6">
        <div className="relative order-1 lg:order-none">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('dashboard.library')}</h3>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black border",
              currentProgram?.isActive ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", currentProgram?.isActive ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
              {currentProgram?.isActive ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
          
          <div className="p-4 lg:p-5 bg-white border-2 border-slate-100 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm">
             <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Active Session</p>
             <h4 className="text-lg lg:text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">
               {currentProgram.name}
             </h4>
             <button 
              onClick={() => onNavigate('setup')}
              className="mt-3 lg:mt-4 text-[9px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-1"
             >
               Switch Session <ChevronRight size={10} />
             </button>
          </div>
        </div>

        <div className="order-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 lg:mb-4 px-1">{t('draw.program_info')}</h3>
          <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0 pr-4 lg:pr-0">
            {currentProgram.prizes.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPrizeId(p.id)}
                disabled={isDrawing || p.remaining === 0}
                className={cn(
                  "w-48 lg:w-full p-4 rounded-[1.5rem] lg:rounded-2xl border text-left flex items-center gap-3 transition-all relative overflow-hidden flex-shrink-0 lg:flex-shrink-1",
                  selectedPrize?.id === p.id 
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                    : p.remaining === 0 ? "bg-slate-50 border-slate-100 opacity-60 grayscale" : "bg-white border-gray-100 hover:border-gray-300"
                )}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Trophy size={20} className="m-auto text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs lg:text-sm truncate uppercase tracking-tight">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[8px] lg:text-[9px] font-black opacity-50 uppercase">{p.quantity - p.remaining}/{p.quantity}</p>
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-energy-yellow" style={{ width: `${((p.quantity - p.remaining) / p.quantity) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drawing Stage */}
      <div className="flex-1 order-3 lg:order-none">
        <div className={cn(
          "text-white rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(30,41,59,0.2)] min-h-[500px] lg:min-h-[700px] flex flex-col relative transition-all duration-700",
          isDrawing ? "bg-slate-900" : currentWinner ? "bg-indigo-900" : "bg-energy-vibrant"
        )}>
          
          <div className="absolute inset-0 z-0 opacity-[0.05] flex items-center justify-center pointer-events-none overflow-hidden">
             <Trophy size={600} strokeWidth={0.5} className="text-white animate-spin-slow" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative z-10">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="px-6 py-2 bg-white/10 backdrop-blur-md text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-white/20">
                  {currentProgram.name}
                </span>
                {currentProgram.month && (
                  <span className="px-6 py-2 bg-energy-yellow/20 text-energy-yellow text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-energy-yellow/30">
                    MONTH {currentProgram.month} / {currentProgram.year}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">NOW DRAWING</p>
              <h2 className="text-6xl font-black tracking-tighter text-glow text-energy-yellow italic uppercase drop-shadow-2xl">
                {selectedPrize?.name || "---"}
              </h2>
            </div>

            <div className="w-full max-w-2xl min-h-[450px] relative flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {isDrawing ? (
                  <motion.div key="drawing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex flex-col items-center gap-10">
                    <div className="flex gap-4">
                      {visualPool.map((t, idx) => (
                        <motion.div key={`${t.id}-${idx}`} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-20 h-28 bg-white/5 border-2 border-white/20 rounded-[2rem] flex items-center justify-center font-mono font-black text-3xl shadow-2xl backdrop-blur-xl text-white">
                          {t.id.slice(-2)}
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-energy-yellow">
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 bg-current rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-3 h-3 bg-current rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-3 h-3 bg-current rounded-full" />
                    </div>
                  </motion.div>
                ) : currentWinner ? (
                   <motion.div key="winner" initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex flex-col items-center gap-10 py-10 relative w-full h-full justify-center">
                     <div className="absolute inset-0 bg-energy-yellow/5 blur-[150px] rounded-full animate-pulse" />
                     
                     <div className="bg-white text-slate-900 px-16 py-12 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-[24px] ring-white/5 relative z-10 text-center w-full max-w-md transform -rotate-1 border-4 border-energy-yellow">
                        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: -64, opacity: 1 }} className="absolute left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[12px] font-black px-12 py-4 rounded-full whitespace-nowrap shadow-2xl border-4 border-white uppercase tracking-widest animate-bounce">
                          {t('draw.congratulations')}
                        </motion.div>
                        
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('draw.winner')} ID</p>
                        <p className="text-5xl font-black font-mono tracking-tighter text-indigo-600 break-all leading-tight mb-8">
                          #{currentWinner.id}
                        </p>
                        
                        <div className="pt-8 border-t-2 border-slate-50 flex flex-col gap-2">
                           <p className="text-3xl font-black uppercase text-slate-900 tracking-tight leading-none italic">{currentWinner.name}</p>
                           <div className="flex items-center justify-center gap-2 mt-4">
                             <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">{currentWinner.department}</div>
                           </div>
                        </div>
                     </div>
                     
                     <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-3xl px-4 relative z-10">
                        {[
                          { label: 'Department', value: currentWinner.department },
                          { label: 'Position', value: currentWinner.position },
                          { label: 'Region', value: currentWinner.region },
                          { label: 'Staff ID', value: currentWinner.employeeId }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 backdrop-blur-2xl p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <p className="text-[9px] font-black text-energy-yellow uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
                            <p className="text-sm font-bold text-white truncate">{stat.value || "-"}</p>
                          </div>
                        ))}
                     </motion.div>
                   </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 text-white/20">
                     <div className="w-32 h-32 rounded-[2.5rem] border-4 border-dashed border-white/10 flex items-center justify-center">
                       <Trophy size={48} strokeWidth={1} className="animate-pulse" />
                     </div>
                     <p className="font-black text-sm uppercase tracking-[0.4em]">STANDBY FOR INPUT</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-energy-red/20 text-energy-red px-8 py-4 rounded-2xl flex items-center gap-3 border border-energy-red/30 text-sm font-black uppercase tracking-widest">
                <AlertTriangle size={20} />
                {error}
              </motion.div>
            )}
          </div>

          <div className="p-8 lg:p-12 border-t border-white/5 bg-white/5 flex items-center justify-center relative z-10 backdrop-blur-3xl">
            <button
               onClick={handleDraw}
               disabled={isDrawing || !selectedPrize}
               className={cn(
                 "group relative flex items-center gap-4 lg:gap-6 px-12 py-5 lg:px-20 lg:py-7 rounded-full transition-all font-black text-2xl lg:text-3xl tracking-tighter scale-100 lg:scale-110",
                 isDrawing || !selectedPrize
                  ? "bg-white/10 text-white/20 cursor-not-allowed" 
                  : "bg-energy-yellow text-slate-900 hover:bg-white hover:scale-105 shadow-[0_20px_50px_rgba(250,204,21,0.3)]"
               )}
            >
              {isDrawing ? "CALCULATING..." : t('draw.start')}
              {!isDrawing && <div className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3 w-4 lg:w-6 h-4 lg:h-6 bg-energy-red rounded-full animate-ping shadow-xl" />}
            </button>
          </div>
        </div>

        {/* Mobile Stats Summary - Only Show on Mobile */}
        <div className="lg:hidden grid grid-cols-2 gap-3 mt-6">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Users size={16} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Wins</p>
                <p className="text-sm font-black text-slate-900">{programWinners.length}</p>
              </div>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <TicketIcon size={16} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pool Size</p>
                <p className="text-sm font-black text-slate-900">{currentProgram.ticketPool.length}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
