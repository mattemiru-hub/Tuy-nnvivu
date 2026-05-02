/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, DrawProgram } from '../types';
import { Plus, Trash2, Calendar, LayoutGrid, FileText, CheckCircle2, Copy, History } from 'lucide-react';
import { generateId, cn, formatDate } from '../lib/utils';
import { DEFAULT_RULES, INITIAL_PRIZES } from '../constants';
import { useTranslation } from 'react-i18next';

export default function ProgramManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();
  const [newProgramName, setNewProgramName] = useState('');
  const [description, setDescription] = useState('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const handleCreateProgram = (template?: DrawProgram) => {
    const name = template ? `${template.name} - ${month}/${year}` : newProgramName;
    if (!name.trim()) return;

    const prizes = template 
      ? template.prizes.map(p => ({ ...p, id: generateId(), remaining: p.quantity }))
      : INITIAL_PRIZES.map(p => ({ ...p, id: generateId() }));

    const newProgram: DrawProgram = {
      id: `prog-${generateId()}`,
      name: name,
      description: template ? template.description : description,
      createdAt: Date.now(),
      prizes: prizes,
      rules: template ? { ...template.rules } : { ...DEFAULT_RULES },
      ticketPool: [],
      isActive: true,
      month: month,
      year: year
    };

    updateState(prev => ({
      ...prev,
      programs: [...prev.programs, newProgram],
      activeProgramId: newProgram.id
    }));

    setNewProgramName('');
    setDescription('');
  };

  const deleteProgram = (id: string) => {
    if (state.programs.length === 1) {
      alert(t('setup.error_last_program'));
      return;
    }
    if (!confirm(t('setup.confirm_delete'))) return;

    updateState(prev => {
      const nextPrograms = prev.programs.filter(p => p.id !== id);
      return {
        ...prev,
        programs: nextPrograms,
        activeProgramId: prev.activeProgramId === id ? (nextPrograms.length > 0 ? nextPrograms[0].id : null) : prev.activeProgramId,
        winners: prev.winners.filter(w => w.programId !== id)
      };
    });
  };

  const toggleActive = (id: string) => {
    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
    }));
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Create Section */}
      <section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <h3 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-800 mb-6 md:mb-8 border-b-4 border-indigo-600 inline-block">{t('setup.create_title')}</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('setup.program_name')}</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly Draw April 2024"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('common.month')}</label>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('common.year')}</label>
                    <select 
                      value={year} 
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                 </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('setup.program_desc')}</label>
              <textarea 
                placeholder="Details about this recurring draw cycle..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold h-24 resize-none transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-6">
            <button 
              onClick={() => handleCreateProgram()}
              disabled={!newProgramName.trim()}
              className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus size={24} strokeWidth={3} /> {t('setup.create_button')}
            </button>
          </div>
        </div>
      </section>

      {/* Grid List Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-3">
              <LayoutGrid className="text-indigo-600" size={24} /> {t('dashboard.library')} ({state.programs.length})
           </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {state.programs.map((p) => (
            <div 
              key={p.id} 
              className={cn(
                "bg-white border-2 rounded-[2.5rem] p-8 transition-all duration-500 relative group overflow-hidden flex flex-col",
                state.activeProgramId === p.id 
                  ? "border-indigo-600 shadow-2xl shadow-indigo-600/10" 
                  : "border-slate-100 hover:border-indigo-200 shadow-xl shadow-slate-200/40"
              )}
            >
              {p.isActive && (
                <div className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase rounded-full tracking-widest shadow-lg z-10">
                  <CheckCircle2 size={12} strokeWidth={3} /> ONLINE
                </div>
              )}
              
              <div className="mb-6 flex justify-between items-start">
                <div className="flex gap-2 items-center">
                   <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <History size={18} />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">#{p.id.split('-')[1]}</span>
                </div>
                <button 
                  onClick={() => toggleActive(p.id)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    p.isActive ? "bg-green-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                    p.isActive ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex-1">
                <h4 className="text-xl font-black mb-1 tracking-tighter uppercase italic text-slate-900 leading-tight line-clamp-2">{p.name}</h4>
                {p.month && (
                  <p className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded leading-none mb-4 uppercase tracking-widest">
                    Cycle: {p.month}/{p.year}
                  </p>
                )}
                <p className="text-xs text-slate-400 line-clamp-2 h-8 mb-6 font-medium leading-relaxed">{p.description || "No session description provided."}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('draw.total_prizes')}</p>
                      <p className="text-xs font-bold text-slate-600">{p.prizes.reduce((acc, curr) => acc + curr.quantity, 0)}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('common.tickets')}</p>
                      <p className="text-xs font-bold text-slate-600">{p.ticketPool.length}</p>
                   </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => updateState(prev => ({ ...prev, activeProgramId: p.id }))}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm",
                      state.activeProgramId === p.id 
                        ? "bg-indigo-600 text-white shadow-indigo-600/20" 
                        : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent shadow-none"
                    )}
                  >
                    {state.activeProgramId === p.id ? "CURRENT" : t('setup.select_button')}
                  </button>
                  <button 
                    onClick={() => handleCreateProgram(p)}
                    className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-2xl transition-all group"
                    title="Clone for next cycle"
                  >
                    <Copy size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                <button 
                  onClick={() => deleteProgram(p.id)}
                  className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} /> {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
