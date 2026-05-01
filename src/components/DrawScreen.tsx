/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppState, Prize, Winner, Ticket } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCcw, LayoutGrid, ChevronRight, AlertTriangle, Power, Users, Ticket as TicketIcon, Play, Check } from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { getEligibleTickets, pickWinner, shuffleArray } from '../lib/engine';
import { sounds } from '../lib/sounds';

export default function DrawScreen({ state, updateState, onNavigate }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void, onNavigate: (tab: any) => void }) {
  // Use a local state for the active program in this screen, but sync with global if possible
  // Or just use global activeProgramId and provide a way to change it
  const activePrograms = state.programs.filter(p => p.isActive);
  const currentProgram = activePrograms.find(p => p.id === state.activeProgramId) || activePrograms[0];
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Ticket | null>(null);
  const [visualPool, setVisualPool] = useState<Ticket[]>([]); 
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeProgramId to first active program if current is not active
  useEffect(() => {
    if (activePrograms.length > 0 && (!state.activeProgramId || !activePrograms.find(p => p.id === state.activeProgramId))) {
      updateState(prev => ({ ...prev, activeProgramId: activePrograms[0].id }));
    }
  }, [activePrograms.length, state.activeProgramId]);

  const activePrizes = currentProgram?.prizes.filter(p => p.isActive && p.remaining > 0).sort((a, b) => b.priority - a.priority) || [];

  // Manual activation from draw screen
  const handleToggleProgramActive = (id: string) => {
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
    }));
  };

  // Reset winner view when prize changes
  useEffect(() => {
    setCurrentWinner(null);
    setError(null);
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [selectedPrizeId]);

  if (activePrograms.length === 0) return (
    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
       <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
         <AlertTriangle size={40} />
       </div>
       <h3 className="text-2xl font-black uppercase tracking-tight">No Active Sessions</h3>
       <p className="text-slate-500 font-medium">Please activate at least one program in the Program Manager to start drawing.</p>
       <button 
        onClick={() => onNavigate('setup')}
        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
       >
         Go to Program Manager
       </button>
    </div>
  );

  if (currentProgram.ticketPool.length === 0) return (
    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
       <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
         <TicketIcon size={40} />
       </div>
       <h3 className="text-2xl font-bold">Chưa có danh sách phiếu!</h3>
       <p className="text-gray-500">Hãy upload file Excel dữ liệu nhân viên/phiếu trước khi thực hiện quay thưởng.</p>
       <button 
        onClick={() => onNavigate('upload')}
        className="px-8 py-3 bg-black text-white rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-gray-800 transition-all"
       >
         Đi đến Upload dữ liệu
       </button>
    </div>
  );

  if (activePrizes.length === 0) return (
    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
       <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto">
         <Trophy size={40} />
       </div>
       <h3 className="text-2xl font-bold">Hết giải thưởng!</h3>
       <p className="text-gray-500">Toàn bộ giải thưởng trong chương trình đã được trao, bị tắt hoặc chưa được tạo.</p>
       <button 
        onClick={() => onNavigate('prizes')}
        className="px-8 py-3 bg-black text-white rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-gray-800 transition-all"
       >
         Quản lý Giải thưởng
       </button>
    </div>
  );

  const selectedPrize = activePrizes.find(p => p.id === selectedPrizeId) || activePrizes[0];

  const handleDraw = () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setCurrentWinner(null);
    setError(null);

    const winner = pickWinner(currentProgram, state.winners, selectedPrize);

    if (!winner) {
      setError("Không tìm thấy phiếu hợp lệ thỏa mãn các quy tắc.");
      setIsDrawing(false);
      return;
    }

    const poolTickets = currentProgram.ticketPool.length > 0 ? currentProgram.ticketPool : [];

    // Start Visual Animation
    let count = 0;
    const maxTicks = 45; // Total "flashes"
    const baseInterval = 40; // Initial Speed in ms

    const tick = () => {
      try {
        if (poolTickets.length > 0) {
          setVisualPool(shuffleArray(poolTickets).slice(0, 5));
        }
        sounds.playTick();
        count++;
        
        if (count < maxTicks) {
          // Dynamic interval: starts fast, slows down at the end for suspense
          const factor = count > (maxTicks * 0.7) ? Math.pow(count - (maxTicks * 0.7), 1.6) * 5 : 0;
          animationRef.current = setTimeout(tick, baseInterval + factor);
        } else {
          // END ANIMATION
          setCurrentWinner(winner);
          setIsDrawing(false);
          sounds.playSuccess();
          fireConfetti();
          recordWinner(winner, selectedPrize);
        }
      } catch (err) {
        console.error("Animation tick error", err);
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
      employeeId: ticket.employeeId,
      department: ticket.department,
      position: ticket.position,
      channel: ticket.channel,
      lineManager: ticket.lineManager,
      region: ticket.region
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
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#000000', '#FFD700', '#FFFFFF']
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Selection Side */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Program Selection */}
        <div className="relative">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-2">Registry Selection</h3>
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <select 
                value={state.activeProgramId || ''} 
                onChange={(e) => updateState(prev => ({ ...prev, activeProgramId: e.target.value }))}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-black text-sm shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer transition-all pr-12"
                disabled={isDrawing}
              >
                {state.programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {!p.isActive && "(Offline)"}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <ChevronRight size={18} strokeWidth={3} className="rotate-90" />
              </div>
            </div>
            <button
               onClick={() => currentProgram && handleToggleProgramActive(currentProgram.id)}
               className={cn(
                 "w-12 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm border-2",
                 currentProgram?.isActive 
                  ? "bg-green-50 border-green-100 text-green-500" 
                  : "bg-slate-50 border-slate-100 text-slate-300"
               )}
               title={currentProgram?.isActive ? "Session is Online" : "Session is Offline. Click to activate."}
            >
               <Power size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Chọn Giải đang quay</h3>
        <div className="space-y-2">
          {activePrizes.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPrizeId(p.id)}
              disabled={isDrawing}
              className={cn(
                "w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition-all",
                selectedPrize.id === p.id 
                  ? "bg-black border-black text-white shadow-lg" 
                  : "bg-white border-gray-100 hover:border-gray-300 disabled:opacity-50"
              )}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{p.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", selectedPrize.id === p.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                    CÒN {p.remaining}
                  </span>
                </div>
              </div>
              {selectedPrize.id === p.id && <Play size={14} className="fill-current animate-pulse" />}
            </button>
          ))}
        </div>

        <div className="bg-gray-100/50 p-4 rounded-2xl mt-8">
           <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Thông tin Pool</p>
           <div className="flex justify-between items-center text-sm font-medium">
             <span className="flex items-center gap-1.5"><Users size={14} /> Ứng viên:</span>
             <span className="font-bold">{currentProgram.ticketPool.length}</span>
           </div>
           <div className="flex justify-between items-center text-sm font-medium mt-2">
             <span className="flex items-center gap-1.5"><TicketIcon size={14} /> Phiếu hợp lệ:</span>
             <span className="font-bold">{getEligibleTickets(currentProgram, state.winners, selectedPrize).length}</span>
           </div>
        </div>
      </div>

      {/* Drawing Stage */}
      <div className="flex-1">
        <div className="bg-energy-vibrant text-white border border-white/20 rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(99,102,241,0.4)] min-h-[650px] flex flex-col relative">
          
          {/* Background Decorative */}
          <div className="absolute inset-0 z-0 opacity-[0.1] flex items-center justify-center pointer-events-none overflow-hidden">
             <Trophy size={600} strokeWidth={0.5} className="text-white animate-spin-slow" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative z-10">
            {/* Prize Context */}
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="px-4 py-1.5 bg-white text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl shadow-white/10">
                  {currentProgram.name}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">ĐANG QUAY GIẢI</span>
              <h2 className="text-5xl font-black mt-2 tracking-tighter text-glow text-energy-yellow italic drop-shadow-2xl uppercase">{selectedPrize.name}</h2>
            </div>

            {/* Animation Area */}
            <div className="w-full max-w-2xl min-h-[400px] relative flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {isDrawing ? (
                  <motion.div 
                    key="drawing"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="flex gap-3">
                      {visualPool.map((t, idx) => (
                        <motion.div 
                          key={`${t.id}-${idx}`} 
                          initial={{ y: 40, opacity: 0, rotate: -10 }}
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          className="w-16 h-24 bg-white/10 border-2 border-white/30 rounded-2xl flex items-center justify-center font-mono font-black text-2xl shadow-2xl backdrop-blur-md text-white"
                        >
                          {t.id.slice(-2)}
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-energy-yellow">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </motion.div>
                ) : currentWinner ? (
                   <motion.div 
                    key="winner"
                    initial={{ scale: 2.5, opacity: 0, filter: 'blur(20px)' }}
                    animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 260,
                      damping: 24 
                    }}
                    className="flex flex-col items-center gap-8 py-10 relative w-full h-full justify-center"
                   >
                     {/* Background Glow */}
                     <div className="absolute inset-0 bg-energy-yellow/10 blur-[150px] rounded-full animate-pulse" />
                     
                     <div className="bg-white text-black px-12 py-10 rounded-[3.5rem] shadow-[0_60px_120px_rgba(0,0,0,0.6)] ring-[20px] ring-white/10 relative z-10 text-center w-full max-w-sm transform -rotate-1 border-4 border-energy-yellow">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[12px] font-black px-10 py-3 rounded-full whitespace-nowrap shadow-2xl border-4 border-white uppercase tracking-tighter animate-bounce">
                          CHÚC MỪNG CHIẾN THẮNG!
                        </div>
                        <p className="text-3xl md:text-4xl font-black font-mono tracking-tighter bg-gradient-to-b from-blue-900 via-blue-700 to-black bg-clip-text text-transparent break-all leading-tight py-2">
                          #{currentWinner.id}
                        </p>
                        <div className="mt-4 pt-6 border-t-2 border-slate-50 flex flex-col gap-1">
                           <p className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">{currentWinner.name}</p>
                           {currentWinner.department && (
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mt-2">{currentWinner.department}</p>
                           )}
                        </div>
                     </div>
                     
                     <motion.div 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="text-center relative z-10 w-full px-4 max-w-2xl"
                     >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left border-t border-white/20 pt-10 mt-6">
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl group hover:bg-white/10 transition-colors">
                              <p className="text-[9px] font-black text-energy-yellow uppercase tracking-widest mb-2 opacity-80">Unit</p>
                              <p className="text-sm font-bold text-white line-clamp-2 leading-tight">{currentWinner.department || "-"}</p>
                           </div>
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl group hover:bg-white/10 transition-colors">
                              <p className="text-[9px] font-black text-energy-yellow uppercase tracking-widest mb-2 opacity-80">Role</p>
                              <p className="text-sm font-bold text-white line-clamp-2 leading-tight">{currentWinner.position || "-"}</p>
                           </div>
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl group hover:bg-white/10 transition-colors">
                              <p className="text-[9px] font-black text-energy-yellow uppercase tracking-widest mb-2 opacity-80">Origin</p>
                              <p className="text-sm font-bold text-white line-clamp-2 leading-tight">{currentWinner.region || "-"}</p>
                           </div>
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl group hover:bg-white/10 transition-colors">
                              <p className="text-[9px] font-black text-energy-yellow uppercase tracking-widest mb-2 opacity-80">Manager</p>
                              <p className="text-sm font-bold text-white line-clamp-2 leading-tight">{currentWinner.lineManager || "-"}</p>
                           </div>
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                           <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">STAFF ID: {currentWinner.employeeId || "N/A"}</p>
                           <div className="w-1 h-1 bg-white rounded-full" />
                           <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">CH: {currentWinner.channel || "-"}</p>
                        </div>
                     </motion.div>
                   </motion.div>
                ) : (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-300 flex flex-col items-center gap-4"
                  >
                     <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-100 flex items-center justify-center">
                       <RefreshCcw size={40} className="animate-spin-slow text-gray-200" />
                     </div>
                     <p className="font-bold text-sm uppercase tracking-widest">Sẵn sàng quay thưởng</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reveal Flash Overlay */}
              <AnimatePresence>
                {!isDrawing && currentWinner && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 bg-white z-50 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="mt-8 bg-amber-50 text-amber-700 px-6 py-3 rounded-xl flex items-center gap-3 border border-amber-100 text-sm font-medium">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}
          </div>

          <div className="p-10 border-t border-white/5 bg-white/5 flex items-center justify-center relative z-10 backdrop-blur-xl">
            <button
               onClick={handleDraw}
               disabled={isDrawing}
               className={cn(
                 "group relative flex items-center gap-4 px-16 py-5 rounded-full transition-all font-black text-2xl tracking-tighter scale-110",
                 isDrawing 
                  ? "bg-white/10 text-white/20 cursor-not-allowed" 
                  : "bg-energy-yellow text-black hover:bg-white hover:scale-115 active:scale-95 shadow-[0_0_40px_rgba(250,204,21,0.3)]"
               )}
            >
              {isDrawing ? "PREPARING..." : "⚡ START DRAW"}
              {!isDrawing && <div className="absolute -top-2 -right-2 w-4 h-4 bg-energy-red rounded-full animate-ping shadow-lg" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
