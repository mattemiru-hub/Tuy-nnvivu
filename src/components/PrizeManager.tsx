/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, Prize, RuleConfig } from '../types';
import { Plus, Trash2, Edit3, Image as ImageIcon, Settings2, ShieldCheck, UserCheck, Shuffle, Info } from 'lucide-react';
import { generateId, cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function PrizeManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();
  const currentProgram = state.programs.find(p => p.id === state.activeProgramId);
  const [isEditingPrize, setIsEditingPrize] = useState<Prize | null>(null);

  if (!currentProgram) return (
    <div className="bg-slate-50 p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-4">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-slate-300">
        <Info size={32} />
      </div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-sm">{t('setup.select_button')}</p>
    </div>
  );

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
      name: t('prizes.new_prize_name') || 'New Prize',
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
    if(!confirm(t('prizes.confirm_delete'))) return;
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
      {/* Context Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Current Context</p>
        <h2 className="text-3xl font-black tracking-tighter uppercase italic drop-shadow-sm">{currentProgram.name}</h2>
        <div className="flex gap-4 mt-6">
          <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Total Pool</p>
            <p className="font-black text-sm">{currentProgram.ticketPool.length} Tickets</p>
          </div>
          <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Prize Tiers</p>
            <p className="font-black text-sm">{currentProgram.prizes.length} Levels</p>
          </div>
        </div>
      </div>

      {/* Rule Engine Section */}
      <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-3 mb-8 border-b-4 border-indigo-600 inline-flex pb-1">
          <Settings2 size={24} className="text-indigo-600" />
          <h3 className="text-2xl font-black tracking-tighter uppercase italic text-slate-800">{t('prizes.rules_title')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <ShieldCheck size={14} className="text-indigo-500" /> {t('prizes.max_wins_ticket')}
            </label>
            <input 
              type="number" 
              value={currentProgram.rules.maxWinsPerTicket}
              onChange={(e) => handleUpdateRule('maxWinsPerTicket', parseInt(e.target.value) || 1)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg transition-all"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <UserCheck size={14} className="text-indigo-500" /> {t('prizes.max_wins_person')}
            </label>
            <input 
              type="number" 
              value={currentProgram.rules.maxWinsPerPerson}
              onChange={(e) => handleUpdateRule('maxWinsPerPerson', parseInt(e.target.value) || 1)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg transition-all"
            />
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
                <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </div>
              <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{t('prizes.block_duplicates')}</span>
            </label>
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
                <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </div>
              <span className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">{t('prizes.entropy_mode')} <Shuffle size={14} className="text-indigo-400" /></span>
            </label>
          </div>
        </div>
      </section>

      {/* Prize List Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-3">
             {t('prizes.inventory')}
          </h3>
          <button 
            onClick={handleAddPrize}
            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> {t('prizes.add_prize')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentProgram.prizes.sort((a, b) => a.priority - b.priority).map((prize) => (
            <div key={prize.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden group hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-300">
               <div className="h-56 bg-slate-50 relative overflow-hidden">
                 {prize.image ? (
                   <img src={prize.image} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                     <ImageIcon size={48} />
                   </div>
                 )}
                 <div className="absolute top-6 left-6 bg-indigo-600 shadow-xl text-white text-[9px] font-black tracking-[0.3em] px-4 py-1.5 rounded-full uppercase">
                   RANK {prize.priority}
                 </div>
               </div>
               
               <div className="p-8 -mt-4 relative bg-white rounded-t-[2.5rem]">
                 <div className="flex items-start justify-between gap-4 mb-2">
                   <input 
                    type="text" 
                    value={prize.name}
                    onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                    className="flex-1 font-black text-xl italic uppercase tracking-tighter text-slate-900 focus:outline-none focus:text-indigo-600 bg-transparent"
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
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{t('draw.total_prizes')}</p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => updatePrize(prize.id, { quantity: Math.max(1, prize.quantity - 1), remaining: Math.max(0, prize.remaining - 1) })}
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm"
                        >-</button>
                        <span className="font-black text-xl text-slate-900 min-w-[1rem] text-center">{prize.quantity}</span>
                        <button 
                          onClick={() => updatePrize(prize.id, { quantity: prize.quantity + 1, remaining: prize.remaining + 1 })}
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm"
                        >+</button>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{t('prizes.remaining')}</p>
                      <p className="font-black text-3xl text-indigo-600 tracking-tighter">{prize.remaining}</p>
                    </div>
                 </div>

                 <div className="mt-8 grid grid-cols-2 gap-4">
                   <button 
                    onClick={() => {
                      const url = prompt(t('prizes.image_url') || "Image URL", prize.image);
                      if (url) updatePrize(prize.id, { image: url });
                    }}
                    className="flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
                   >
                     <Edit3 size={14} /> {t('prizes.edit_image')}
                   </button>
                   <button 
                    onClick={() => updatePrize(prize.id, { isActive: !prize.isActive })}
                    className={cn(
                      "py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95",
                      prize.isActive 
                        ? "bg-indigo-600 text-white shadow-indigo-600/20" 
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
