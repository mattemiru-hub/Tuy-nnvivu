/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, Prize, RuleConfig } from '../types';
import { Plus, Trash2, Edit3, Image as ImageIcon, Settings2, ShieldCheck, UserCheck, Shuffle } from 'lucide-react';
import { generateId, cn } from '../lib/utils';

export default function PrizeManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const currentProgram = state.programs.find(p => p.id === state.activeProgramId);
  const [isEditingPrize, setIsEditingPrize] = useState<Prize | null>(null);

  if (!currentProgram) return <div>Chọn một chương trình trước</div>;

  const handleUpdateRule = (key: keyof RuleConfig, value: any) => {
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => 
        p.id === currentProgram.id 
          ? { ...p, rules: { ...p.rules, [key]: value } } 
          : p
      )
    }));
  };

  const handleAddPrize = () => {
    const newPrize: Prize = {
      id: generateId(),
      name: 'Giải thưởng mới',
      quantity: 1,
      remaining: 1,
      priority: currentProgram.prizes.length + 1,
      isActive: true,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=400&fit=crop"
    };
    
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => 
        p.id === currentProgram.id 
          ? { ...p, prizes: [...p.prizes, newPrize] } 
          : p
      )
    }));
  };

  const handleDeletePrize = (id: string) => {
    if(!confirm("Xóa giải thưởng này?")) return;
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => 
        p.id === currentProgram.id 
          ? { ...p, prizes: p.prizes.filter(pr => pr.id !== id) } 
          : p
      )
    }));
  };

  const updatePrize = (prizeId: string, updates: Partial<Prize>) => {
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => 
        p.id === currentProgram.id 
          ? { ...p, prizes: p.prizes.map(pr => pr.id === prizeId ? { ...pr, ...updates } : pr) } 
          : p
      )
    }));
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Rule Engine Section */}
      <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-3 mb-8 border-b-2 border-blue-600 inline-flex pb-1">
          <Settings2 size={24} className="text-blue-600" />
          <h3 className="text-2xl font-black tracking-tighter uppercase italic text-slate-800">Rule Oracle</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <ShieldCheck size={14} className="text-blue-500" /> Max Wins / Ticket
            </label>
            <input 
              type="number" 
              value={currentProgram.rules.maxWinsPerTicket}
              onChange={(e) => handleUpdateRule('maxWinsPerTicket', parseInt(e.target.value) || 1)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-lg transition-all"
            />
            <p className="text-[10px] text-slate-400 italic font-medium">Cap for a single unique ticket code</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <UserCheck size={14} className="text-blue-500" /> Max Wins / Soul
            </label>
            <input 
              type="number" 
              value={currentProgram.rules.maxWinsPerPerson}
              onChange={(e) => handleUpdateRule('maxWinsPerPerson', parseInt(e.target.value) || 1)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-lg transition-all"
            />
            <p className="text-[10px] text-slate-400 italic font-medium">Based on Staff ID / Email identity</p>
          </div>

          <div className="flex flex-col justify-end pb-2">
            <label className="flex items-center gap-4 cursor-pointer select-none group">
              <div className="relative">
                <input 
                  type="checkbox"
                  checked={currentProgram.rules.preventDuplicatePrizeType}
                  onChange={(e) => handleUpdateRule('preventDuplicatePrizeType', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </div>
              <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Block Type Dups</span>
            </label>
            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Prevents winning same prize tier twice</p>
          </div>

          <div className="flex flex-col justify-end pb-2">
            <label className="flex items-center gap-4 cursor-pointer select-none group">
               <div className="relative">
                <input 
                  type="checkbox"
                  checked={currentProgram.rules.fairnessRandom}
                  onChange={(e) => handleUpdateRule('fairnessRandom', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </div>
              <span className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">Entropy Mode <Shuffle size={14} className="text-blue-400" /></span>
            </label>
            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Enforces true cryptographic randomness</p>
          </div>
        </div>
      </section>

      {/* Prize List Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-3">
             Reward Inventory
          </h3>
          <button 
            onClick={handleAddPrize}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> Inject New Reward
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentProgram.prizes.sort((a, b) => a.priority - b.priority).map((prize) => (
            <div key={prize.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden group hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-300">
               <div className="h-56 bg-slate-50 relative overflow-hidden">
                 {prize.image ? (
                   <img src={prize.image} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                     <ImageIcon size={48} />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zero Visual Found</span>
                   </div>
                 )}
                 <div className="absolute top-6 left-6 bg-blue-600 shadow-xl text-white text-[9px] font-black tracking-[0.3em] px-4 py-1.5 rounded-full uppercase">
                   RANK {prize.priority}
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent opacity-60"></div>
               </div>
               
               <div className="p-8 -mt-4 relative bg-white rounded-t-[2.5rem]">
                 <div className="flex items-start justify-between gap-4 mb-2">
                   <input 
                    type="text" 
                    value={prize.name}
                    onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                    className="flex-1 font-black text-xl italic uppercase tracking-tighter text-slate-900 focus:outline-none focus:text-blue-600 bg-transparent"
                   />
                   <button 
                    onClick={() => handleDeletePrize(prize.id)}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                   >
                     <Trash2 size={20} />
                   </button>
                 </div>

                 <div className="mt-6 flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="space-y-3">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Draft Capacity</p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => updatePrize(prize.id, { quantity: Math.max(1, prize.quantity - 1), remaining: Math.max(0, prize.remaining - 1) })}
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm"
                        >-</button>
                        <span className="font-black text-xl text-slate-900 min-w-[1rem] text-center">{prize.quantity}</span>
                        <button 
                          onClick={() => updatePrize(prize.id, { quantity: prize.quantity + 1, remaining: prize.remaining + 1 })}
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm"
                        >+</button>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Left in Pool</p>
                      <p className="font-black text-3xl text-blue-600 tracking-tighter">{prize.remaining}</p>
                    </div>
                 </div>

                 <div className="mt-8 grid grid-cols-2 gap-4">
                   <button 
                    onClick={() => {
                      const url = prompt("Enter Image URL", prize.image);
                      if (url) updatePrize(prize.id, { image: url });
                    }}
                    className="flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
                   >
                     <Edit3 size={14} /> Refine Art
                   </button>
                   <button 
                    onClick={() => updatePrize(prize.id, { isActive: !prize.isActive })}
                    className={cn(
                      "py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95",
                      prize.isActive 
                        ? "bg-blue-600 text-white shadow-blue-600/20" 
                        : "bg-slate-100 text-slate-400 shadow-none border-2 border-slate-100"
                    )}
                   >
                     {prize.isActive ? "ONLINE" : "OFFLINE"}
                   </button>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
