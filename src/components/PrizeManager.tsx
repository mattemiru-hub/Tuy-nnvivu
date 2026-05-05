/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, Prize, RuleConfig } from '../types';
import { Plus, Trash2, Edit3, Image as ImageIcon, Settings2, ShieldCheck, UserCheck, Shuffle, Info, X } from 'lucide-react';
import { generateId, cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabaseService } from '../services/supabaseService';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

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

  const handleUpdateRule = async (key: keyof RuleConfig, value: any) => {
    if (!isSupabaseConfigured()) return;
    const updatedRules = { ...currentProgram.rules, [key]: value };
    try {
      await supabaseService.updateProgramRules(currentProgram.id, updatedRules);
    } catch (err) {
      console.error('Error updating rules:', err);
    }
  };

  const handleAddPrize = async () => {
    if (!isSupabaseConfigured()) return;
    const newPrize: Partial<Prize> = {
      name: t('prizes.new_prize_name') || 'New Prize',
      quantity: 1,
      remaining: 1,
      priority: currentProgram.prizes.length + 1,
      isActive: true,
      value: 0,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=400&fit=crop"
    };
    
    try {
      await supabaseService.createPrize(currentProgram.id, newPrize);
    } catch (err) {
      console.error('Error adding prize:', err);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if(!confirm(t('prizes.confirm_delete')) || !isSupabaseConfigured()) return;
    try {
      await supabaseService.deletePrize(id);
    } catch (err) {
      console.error('Error deleting prize:', err);
    }
  };

  const updatePrize = async (prizeId: string, updates: Partial<Prize>) => {
    try {
      await supabaseService.updatePrize(prizeId, updates);
    } catch (err) {
      console.error('Error updating prize:', err);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Context Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Current Context</p>
        <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase italic drop-shadow-sm truncate">{currentProgram.name}</h2>
        <div className="flex flex-wrap gap-3 md:gap-4 mt-4 md:mt-6">
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
      <section className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-3 mb-6 md:mb-8 border-b-4 border-indigo-600 inline-flex pb-1">
          <Settings2 size={24} className="text-indigo-600" />
          <h3 className="text-lg md:text-2xl font-black tracking-tighter uppercase italic text-slate-800">{t('prizes.rules_title')}</h3>
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
               
               <div className="p-6 md:p-8 -mt-4 relative bg-white rounded-t-[2.5rem]">
                 <div className="flex items-start justify-between gap-4 mb-2">
                   <input 
                    type="text" 
                    value={prize.name}
                    onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                    className="flex-1 font-black text-xl italic uppercase tracking-tighter text-slate-900 focus:outline-none focus:text-indigo-600 bg-transparent"
                   />
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => setIsEditingPrize(prize)}
                       className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                     >
                       <Edit3 size={20} />
                     </button>
                     <button 
                      onClick={() => handleDeletePrize(prize.id)}
                      className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                     >
                       <Trash2 size={20} />
                     </button>
                   </div>
                 </div>

                 <div className="mt-6 flex flex-col gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between">
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
                    
                    <div className="pt-4 border-t border-slate-200/50 space-y-2">
                       <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Monetary Value ({state.settings.currency})</p>
                       <input 
                        type="number"
                        value={prize.value || 0}
                        onChange={(e) => updatePrize(prize.id, { value: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                        placeholder="0"
                       />
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

      {/* Edit Prize Modal */}
      <AnimatePresence>
        {isEditingPrize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingPrize(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative z-10 border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Edit Prize</h3>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">ID: {isEditingPrize.id}</p>
                </div>
                <button 
                  onClick={() => setIsEditingPrize(null)}
                  className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Prize Name</label>
                  <input 
                    type="text"
                    value={isEditingPrize.name}
                    onChange={e => setIsEditingPrize({ ...isEditingPrize, name: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Image URL</label>
                  <div className="flex gap-4">
                    <img src={isEditingPrize.image} className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100" />
                    <input 
                      type="text"
                      value={isEditingPrize.image}
                      onChange={e => setIsEditingPrize({ ...isEditingPrize, image: e.target.value })}
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Monetary Value</label>
                    <input 
                      type="number"
                      value={isEditingPrize.value}
                      onChange={e => setIsEditingPrize({ ...isEditingPrize, value: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Priority (Order)</label>
                    <input 
                      type="number"
                      value={isEditingPrize.priority}
                      onChange={e => setIsEditingPrize({ ...isEditingPrize, priority: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => {
                      updatePrize(isEditingPrize.id, isEditingPrize);
                      setIsEditingPrize(null);
                    }}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Update Prize Details
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
