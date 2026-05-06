/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, Prize, RuleConfig } from '../types';
import { Plus, Trash2, Edit3, Image as ImageIcon, Settings2, ShieldCheck, UserCheck, Shuffle, Info, X, RefreshCcw } from 'lucide-react';
import { generateId, cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { supabaseService } from '../services/supabaseService';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export default function PrizeManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();
  const currentProgram = state.programs.find(p => p.id === state.activeProgramId);
  const [isEditingPrize, setIsEditingPrize] = useState<Prize | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      await supabaseService.updateProgramRules(currentProgram.id, updatedRules);
    } catch (err: any) {
      console.error('Error updating rules:', err);
      setError(err.message || 'Failed to update rules.');
    }
  };

  const handleAddPrize = async () => {
    if (!isSupabaseConfigured()) return;
    setIsSubmitting(true);
    setError(null);
    const newPrize: Partial<Prize> = {
      name: t('prizes.new_prize_name') || 'New Prize',
      quantity: 1,
      remaining: 1,
      priority: state.prizes.length + 1,
      isActive: true,
      value: 0,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=400&fit=crop"
    };
    
    try {
      await supabaseService.createPrize(currentProgram.id, newPrize);
    } catch (err: any) {
      console.error('Error adding prize:', err);
      setError(err.message || 'Failed to add prize.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if(!confirm(t('prizes.confirm_delete')) || !isSupabaseConfigured()) return;
    try {
      setError(null);
      await supabaseService.deletePrize(id);
    } catch (err: any) {
      console.error('Error deleting prize:', err);
      setError(err.message || 'Failed to delete prize.');
    }
  };

  const updatePrize = async (prizeId: string, updates: Partial<Prize>) => {
    try {
      setError(null);
      await supabaseService.updatePrize(prizeId, updates);
    } catch (err: any) {
      console.error('Error updating prize:', err);
      setError(err.message || 'Failed to update prize.');
    }
  };

  const handleImageUpload = async (prizeId: string, file: File) => {
    try {
      // Validate file size (10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setError("Ảnh quá lớn. Vui lòng chọn file dưới 10MB.");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      const filename = `${prizeId}-${Date.now()}-${file.name}`;
      const url = await supabaseService.uploadFile('prizes', filename, file);
      await updatePrize(prizeId, { image: url });
      if (isEditingPrize && isEditingPrize.id === prizeId) {
        setIsEditingPrize({ ...isEditingPrize, image: url });
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError('Lỗi khi tải ảnh lên: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  return (
    <div className="space-y-10 pb-20">
      {/* Context Header */}
      <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 blur-[100px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
              <Settings2 size={24} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Thiết lập chương trình</p>
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic drop-shadow-sm truncate">{currentProgram.name}</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 md:gap-6 mt-8">
            <div className="px-6 py-3 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Tổng người tham gia</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{state.participants.length}</span>
                <span className="text-[10px] font-bold text-slate-400">Vé (Tickets)</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Cấp độ giải thưởng</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-400">{state.prizes.length}</span>
                <span className="text-[10px] font-bold text-slate-400">Loại (Tiers)</span>
              </div>
            </div>
            {currentProgram.categories && (
              <div className="px-6 py-3 bg-amber-500/10 rounded-2xl backdrop-blur-sm border border-amber-500/20 group hover:bg-amber-500/20 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/60 mb-1">Đối tượng phân loại</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-500">{currentProgram.categories.split(',').length}</span>
                  <span className="text-[10px] font-bold text-amber-500/60">Nhóm (Groups)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prize Selection & Filtering */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900 flex items-center gap-3">
               <Shuffle size={24} className="text-indigo-600" /> {t('prizes.inventory')}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Danh sách giải thưởng đang có</p>
          </div>
          
          <div className="flex items-center gap-3 self-end">
            <button 
              onClick={handleAddPrize}
              disabled={isSubmitting}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCcw size={20} className="animate-spin" />
              ) : (
                <Plus size={20} strokeWidth={3} />
              )}
              {isSubmitting ? 'Adding...' : t('prizes.add_prize')}
            </button>
          </div>
        </div>

        {/* Improved Category Display & Helper */}
        {currentProgram.categories && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 p-8 bg-indigo-50/50 border-2 border-indigo-100/50 rounded-[2.5rem] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <UserCheck size={20} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800">Cơ cấu theo Đối tượng</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lọc danh sách quay thưởng bên dưới</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterCategory('ALL')}
                  className={cn(
                    "px-5 py-2.5 text-[10px] font-black rounded-2xl shadow-lg transition-all uppercase tracking-widest border",
                    filterCategory === 'ALL' 
                      ? "bg-indigo-600 text-white shadow-indigo-200 border-indigo-600 scale-105" 
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                  )}
                >
                  TẤT CẢ ({state.prizes.length})
                </button>
                {currentProgram.categories.split(',').map(cat => {
                   const c = cat.trim();
                   const count = state.prizes.filter(p => p.category === c).length;
                   return (
                     <button 
                       key={c} 
                       onClick={() => setFilterCategory(c)}
                       className={cn(
                        "px-5 py-2.5 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest shadow-sm border",
                        filterCategory === c
                          ? "bg-amber-500 text-white shadow-amber-200 border-amber-500 scale-105"
                          : "bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-600"
                       )}
                     >
                       {c} ({count})
                     </button>
                   );
                })}
              </div>
            </div>
            
            <div className="p-8 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] flex flex-col justify-center gap-2">
               <div className="flex items-center gap-2 text-amber-600 mb-2">
                 <Info size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Gợi ý</span>
               </div>
               <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
                 Hệ thống sẽ chỉ quay vé của những người có <span className="underline decoration-amber-400 underline-offset-2">Đối tượng</span> tương ứng với giải thưởng.
               </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {state.prizes
            .filter(p => filterCategory === 'ALL' || p.category === filterCategory)
            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
            .map((prize) => (
            <div key={prize.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden group hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-300">
               <div className="h-56 bg-slate-50 relative overflow-hidden">
                 {prize.image ? (
                   <img src={prize.image} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                     <ImageIcon size={48} className="animate-pulse" />
                   </div>
                 )}
                 
                 {/* Visual Badges Layer */}
                 <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                   <div className="bg-indigo-600 shadow-xl text-white text-[10px] font-black tracking-[0.3em] px-5 py-2 rounded-full uppercase border-2 border-white/20">
                     RANK #{prize.priority}
                   </div>
                   {prize.category ? (
                     <div className="bg-amber-500 shadow-lg text-white text-[9px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase border-2 border-white/30 backdrop-blur-sm">
                       {prize.category}
                     </div>
                   ) : (
                     <div className="bg-slate-800/80 shadow-lg text-white text-[9px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase border-2 border-white/20 backdrop-blur-sm">
                       ALL ACCESS
                     </div>
                   )}
                 </div>
                 
                 <div className="absolute top-6 right-6 z-10">
                    <button 
                      onClick={() => updatePrize(prize.id, { isActive: !prize.isActive })}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center rounded-2xl shadow-xl transition-all border-2",
                        prize.isActive 
                          ? "bg-emerald-500 text-white border-emerald-400 rotate-0" 
                          : "bg-slate-800 text-slate-400 border-slate-700 rotate-12"
                      )}
                    >
                      <ShieldCheck size={20} />
                    </button>
                 </div>

                 {/* Gradient Overlay */}
                 <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent"></div>
               </div>
               
               <div className="p-6 md:p-10 -mt-6 relative bg-white rounded-t-[3rem] border-t border-slate-50">
                    <div className="flex flex-col gap-4 mb-8">
                       <div className="flex items-center justify-between group/title">
                        <input 
                          type="text" 
                          value={prize.name}
                          onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                          className="font-black text-2xl italic uppercase tracking-tighter text-slate-900 focus:outline-none focus:text-indigo-600 bg-transparent py-1 px-2 rounded-lg border border-transparent hover:border-slate-100 focus:border-indigo-200 transition-all flex-1"
                          placeholder="Tên giải thưởng"
                        />
                       </div>

                       <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsEditingPrize(prize)}
                            className="flex-1 px-5 py-3 flex items-center justify-center gap-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm font-black text-[10px] uppercase tracking-widest border-2 border-indigo-100/50"
                          >
                            <Edit3 size={16} /> CHỈNH SỬA CHI TIẾT
                          </button>
                          <button 
                           onClick={() => handleDeletePrize(prize.id)}
                           className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border-2 border-slate-100"
                          >
                            <Trash2 size={20} />
                          </button>
                       </div>
                    </div>

                  {/* Quick Stats Panel */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col items-center">
                       <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-2">{t('draw.total_prizes')}</p>
                       <div className="flex items-center gap-4">
                          <button 
                            onClick={() => updatePrize(prize.id, { quantity: Math.max(1, prize.quantity - 1), remaining: Math.max(0, prize.remaining - 1) })}
                            className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm font-bold"
                          >-</button>
                          <span className="font-black text-xl text-slate-900 min-w-[1.5rem] text-center">{prize.quantity}</span>
                          <button 
                            onClick={() => updatePrize(prize.id, { quantity: prize.quantity + 1, remaining: prize.remaining + 1 })}
                            className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm font-bold"
                          >+</button>
                       </div>
                    </div>

                    <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-600/20 flex flex-col items-center justify-center text-white">
                       <p className="text-[9px] uppercase font-black text-indigo-300 tracking-widest mb-1">{t('prizes.remaining')}</p>
                       <p className="font-black text-3xl tracking-tighter tabular-nums">{prize.remaining}</p>
                    </div>
                  </div>

                  {prize.value > 0 && (
                     <div className="mt-4 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giá trị ước tính:</span>
                       <span className="text-xs font-black text-slate-900">
                         {new Intl.NumberFormat().format(prize.value)} <span className="text-[10px] text-slate-500">{state.settings.currency}</span>
                       </span>
                     </div>
                  )}
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
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Tên giải thưởng</label>
                  <input 
                    type="text"
                    value={isEditingPrize.name}
                    onChange={e => setIsEditingPrize({ ...isEditingPrize, name: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    placeholder="Nhập tên giải thưởng..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Hình ảnh</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                      {isEditingPrize.image ? (
                        <img src={isEditingPrize.image} className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-100 shadow-sm" />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} />
                        </div>
                      )}
                      <div className="flex-1 space-y-3">
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors cursor-pointer w-full justify-center">
                          <Plus size={16} /> {isSubmitting ? 'Đang tải...' : 'Tải từ máy tính'}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            disabled={isSubmitting}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(isEditingPrize.id, file);
                            }}
                          />
                        </label>
                        <p className="text-[9px] text-slate-400 font-medium px-1">Hoặc dán link ảnh bên dưới</p>
                      </div>
                    </div>
                    <input 
                      type="text"
                      value={isEditingPrize.image}
                      onChange={e => setIsEditingPrize({ ...isEditingPrize, image: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none text-[10px]"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Đối tượng (Category)</label>
                  {currentProgram.categories ? (
                    <div className="relative">
                      <select 
                        value={isEditingPrize.category || ''}
                        onChange={e => setIsEditingPrize({ ...isEditingPrize, category: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none appearance-none"
                      >
                         <option value="">-- Tất cả đối tượng (Apply to All) --</option>
                         {currentProgram.categories.split(',').map(cat => (
                           <option key={cat.trim()} value={cat.trim()}>{cat.trim()}</option>
                         ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold">
                        ↓
                      </div>
                    </div>
                  ) : (
                    <input 
                      type="text"
                      value={isEditingPrize.category || ''}
                      onChange={e => setIsEditingPrize({ ...isEditingPrize, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                      placeholder="VD: ENGINEER (Cần định nghĩa trong cài đặt chương trình)"
                    />
                  )}
                  <p className="text-[9px] text-slate-400 italic px-1">
                    * Chỉ những người có Category khớp với giá trị này mới được tham gia quay giải này.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Thứ tự ưu tiên</label>
                  <input 
                    type="number"
                    value={isEditingPrize.priority}
                    onChange={e => setIsEditingPrize({ ...isEditingPrize, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Giá trị (VNĐ)</label>
                  <input 
                    type="number"
                    value={isEditingPrize.value}
                    onChange={e => setIsEditingPrize({ ...isEditingPrize, value: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                  />
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => {
                      updatePrize(isEditingPrize.id, isEditingPrize);
                      setIsEditingPrize(null);
                    }}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Lưu Thay Đổi
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
