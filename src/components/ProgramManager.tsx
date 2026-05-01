/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, DrawProgram } from '../types';
import { Plus, Trash2, Calendar, LayoutGrid, FileText, CheckCircle2 } from 'lucide-react';
import { generateId, cn, formatDate } from '../lib/utils';
import { DEFAULT_RULES, INITIAL_PRIZES } from '../constants';

export default function ProgramManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const [newProgramName, setNewProgramName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateProgram = () => {
    if (!newProgramName.trim()) return;

    const newProgram: DrawProgram = {
      id: `prog-${generateId()}`,
      name: newProgramName,
      description: description,
      createdAt: Date.now(),
      prizes: INITIAL_PRIZES.map(p => ({ ...p, id: generateId() })), // Clone initial prizes with new IDs
      rules: { ...DEFAULT_RULES },
      ticketPool: [],
      isActive: true,
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
      alert("Không thể xóa chương trình cuối cùng.");
      return;
    }
    if (!confirm("Xóa chương trình này sẽ xóa toàn bộ dữ liệu quay số liên quan. Bạn có chắc?")) return;

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
      <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 mb-8 border-b-2 border-blue-600 inline-block">Configure New Session</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Session Identity</label>
              <input 
                type="text" 
                placeholder="e.g. Annual Town Hall 2024"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-lg transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Session Context (Notes)</label>
              <textarea 
                placeholder="Give this program some flavor..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold h-32 resize-none transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-6">
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
               <p className="text-sm font-bold text-blue-800 leading-relaxed mb-4">
                 Creating a new session will automatically initialize it with the default prize matrix and specialized rules. You can customize them later.
               </p>
               <div className="flex items-center gap-2 text-xs font-black text-blue-600/60 uppercase tracking-widest">
                  <CheckCircle2 size={16} /> Ready to Deploy
               </div>
            </div>
            <button 
              onClick={handleCreateProgram}
              disabled={!newProgramName.trim()}
              className="flex items-center justify-center gap-3 w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus size={24} strokeWidth={3} /> Launch & Activate Session
            </button>
          </div>
        </div>
      </section>

      {/* Grid List Section */}
      <section className="space-y-8">
        <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-3">
           <LayoutGrid className="text-blue-600" size={24} /> Library Registry ({state.programs.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {state.programs.map((p) => (
            <div 
              key={p.id} 
              className={cn(
                "bg-white border-2 rounded-[2.5rem] p-8 transition-all duration-500 relative group overflow-hidden",
                state.activeProgramId === p.id 
                  ? "border-blue-600 shadow-2xl shadow-blue-600/10" 
                  : "border-slate-100 hover:border-blue-200 shadow-xl shadow-slate-200/40"
              )}
            >
              {p.isActive && (
                <div className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase rounded-full tracking-widest shadow-lg">
                  <CheckCircle2 size={12} strokeWidth={3} /> ONLINE
                </div>
              )}
              
              <div className="mb-6 flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">#{p.id.split('-')[1]}</span>
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

              <h4 className="text-2xl font-black mb-2 tracking-tighter uppercase italic text-slate-900 leading-tight line-clamp-1">{p.name}</h4>
              <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-8 font-medium">{p.description || "No session description provided."}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Created</p>
                    <p className="text-xs font-bold text-slate-600">{formatDate(p.createdAt)}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Resources</p>
                    <p className="text-xs font-bold text-slate-600">{p.ticketPool.length} Pool / {p.prizes.length} Rewards</p>
                 </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => updateState(prev => ({ ...prev, activeProgramId: p.id }))}
                  className={cn(
                    "flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm",
                    state.activeProgramId === p.id 
                      ? "bg-blue-600 text-white shadow-blue-600/20" 
                      : "bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100"
                  )}
                >
                  {state.activeProgramId === p.id ? "SELECTED FOR DRAW" : "SELECT TO DRAW"}
                </button>
                <button 
                  onClick={() => deleteProgram(p.id)}
                  className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 border-2 border-slate-50 hover:border-red-100 rounded-2xl transition-all active:scale-90"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
