/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, DrawProgram, Prize } from '../types';
import { Plus, Trash2, Calendar, LayoutGrid, FileText, CheckCircle2, Copy, History, Image as ImageIcon, Trophy, Save } from 'lucide-react';
import { generateId, cn, formatDate, compressImage } from '../lib/utils';
import { DEFAULT_RULES, INITIAL_PRIZES } from '../constants';
import { useTranslation } from 'react-i18next';

export default function ProgramManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();
  const [newProgramName, setNewProgramName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [bannerFit, setBannerFit] = useState<'cover' | 'contain'>('cover');
  const [bannerHeight, setBannerHeight] = useState<number>(20);
  const [bannerPosition, setBannerPosition] = useState<number>(50);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setThumbnail(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProgram = (template?: DrawProgram) => {
    const name = template ? `${template.name} - ${month}/${year}` : newProgramName;
    if (!name.trim()) return;

    const finalPrizes = template 
      ? template.prizes.map(p => ({ ...p, id: generateId(), remaining: p.quantity }))
      : prizes.length > 0 ? prizes : INITIAL_PRIZES.map(p => ({ ...p, id: generateId() }));

    const newProgram: DrawProgram = {
      id: `prog-${generateId()}`,
      name: name,
      description: template ? template.description : description,
      thumbnail: template ? template.thumbnail : thumbnail,
      bannerFit: template ? template.bannerFit : bannerFit,
      bannerHeight: template ? template.bannerHeight : bannerHeight,
      bannerPosition: template ? template.bannerPosition : bannerPosition,
      createdAt: Date.now(),
      prizes: finalPrizes,
      rules: template ? { ...template.rules } : { ...DEFAULT_RULES },
      ticketPool: template ? [...template.ticketPool] : [],
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
    setThumbnail(undefined);
    setPrizes([]);
  };

  const handleUpdateProgram = () => {
    if (!editingProgramId || !newProgramName.trim()) return;

    updateState(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === editingProgramId ? {
        ...p,
        name: newProgramName,
        description,
        thumbnail,
        bannerFit,
        bannerHeight,
        bannerPosition,
        prizes: prizes.length > 0 ? prizes : p.prizes,
        month,
        year
      } : p)
    }));

    setEditingProgramId(null);
    setNewProgramName('');
    setDescription('');
    setThumbnail(undefined);
    setPrizes([]);
  };

  const startEditing = (p: DrawProgram) => {
    setEditingProgramId(p.id);
    setNewProgramName(p.name);
    setDescription(p.description || '');
    setThumbnail(p.thumbnail);
    setBannerFit(p.bannerFit || 'cover');
    setBannerHeight(p.bannerHeight || 20);
    setBannerPosition(p.bannerPosition || 50);
    setPrizes(p.prizes);
    setMonth(p.month || new Date().getMonth() + 1);
    setYear(p.year || new Date().getFullYear());
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const updateProgramThumbnail = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const compressed = await compressImage(dataUrl);
      updateState(prev => ({
        ...prev,
        programs: prev.programs.map(p => p.id === id ? { ...p, thumbnail: compressed } : p)
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Create / Edit Section */}
      <section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <h3 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-800 mb-6 md:mb-8 border-b-4 border-indigo-600 inline-block">
          {editingProgramId ? t('setup.edit_title') : t('setup.create_title')}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
          {/* Thumbnail Upload */}
          <div className="lg:col-span-1 border-4 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center p-6 bg-slate-50 relative group overflow-hidden transition-all hover:bg-slate-100">
             {thumbnail ? (
               <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
                 <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                 <button 
                   onClick={() => setThumbnail(undefined)}
                   className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
             ) : (
               <label className="cursor-pointer flex flex-col items-center gap-3">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-100">
                   <ImageIcon size={32} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight text-center">
                   Click to upload<br/>Thumbnail
                 </p>
                 <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
               </label>
             )}
          </div>

          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('setup.program_name')}</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly Draw April 2024"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('common.month')}</label>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
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
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('setup.program_desc')}</label>
                <textarea 
                  placeholder="Details about this recurring draw cycle..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold h-24 resize-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Banner Fine-tuning</label>
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 px-1">
                      <span>Height</span>
                      <span>{bannerHeight}vh</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="50" 
                      value={bannerHeight} 
                      onChange={(e) => setBannerHeight(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 px-1">
                      <span>Vertical Position</span>
                      <span>{bannerPosition}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={bannerPosition} 
                      onChange={(e) => setBannerPosition(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Banner Display Mode</label>
                <div className="grid grid-cols-2 gap-3 h-24">
                  <button 
                    onClick={() => setBannerFit('cover')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all p-2",
                      bannerFit === 'cover' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400"
                    )}
                  >
                    <span className="font-black text-[10px] uppercase tracking-widest">FILL (Cover)</span>
                    <span className="text-[8px] font-medium leading-tight">Image fills the banner area (Some cropping)</span>
                  </button>
                  <button 
                    onClick={() => setBannerFit('contain')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all p-2",
                      bannerFit === 'contain' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400"
                    )}
                  >
                    <span className="font-black text-[10px] uppercase tracking-widest">FIT (Contain)</span>
                    <span className="text-[8px] font-medium leading-tight">Show full image (No cropping)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-end gap-3">
            {editingProgramId ? (
              <>
                <button 
                  onClick={handleUpdateProgram}
                  disabled={!newProgramName.trim()}
                  className="flex items-center justify-center gap-3 w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save size={24} /> {t('setup.update_button')}
                </button>
                <button 
                  onClick={() => {
                    setEditingProgramId(null);
                    setNewProgramName('');
                    setDescription('');
                    setThumbnail(undefined);
                  }}
                  className="w-full py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleCreateProgram()}
                disabled={!newProgramName.trim()}
                className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <Plus size={24} strokeWidth={3} /> {t('setup.create_button')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Grid List Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
             <h3 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-800">{t('nav.programs')}</h3>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Manage your lucky draw sessions</p>
           </div>
           <div className="px-5 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{t('dashboard.library')}:</span>
              <span className="text-sm font-black text-indigo-600">{state.programs.length}</span>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {state.programs.map((p) => {
            const winnersCount = state.winners.filter(w => w.programId === p.id).length;
            const totalPrizes = p.prizes.reduce((acc, curr) => acc + curr.quantity, 0);
            const isActiveSession = state.activeProgramId === p.id;

            return (
              <div 
                key={p.id} 
                className={cn(
                  "bg-white border-2 rounded-[2.5rem] transition-all duration-500 relative group flex flex-col h-full",
                  isActiveSession 
                    ? "border-indigo-600 ring-4 ring-indigo-50 shadow-2xl shadow-indigo-600/10" 
                    : "border-slate-100 hover:border-indigo-200 shadow-xl shadow-slate-200/40"
                )}
              >
                {/* Image Section */}
                <div className="h-44 relative overflow-hidden rounded-t-[2.35rem] bg-slate-50 border-b border-slate-100">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <ImageIcon size={64} className="transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                  )}
                  
                  {/* Overlay Badges */}
                  <div className="absolute top-5 left-5 z-20 flex flex-col gap-2">
                     <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5",
                        p.isActive ? "bg-green-500 text-white" : "bg-slate-900 text-slate-400"
                     )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", p.isActive ? "bg-white animate-pulse" : "bg-slate-500")} />
                        {p.isActive ? "Live" : "Paused"}
                     </div>
                  </div>

                  <div className="absolute bottom-4 right-5 z-20">
                     {p.month && (
                       <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl text-indigo-600 border border-white">
                         {p.month}/{p.year}
                       </div>
                     )}
                  </div>
                  
                  {/* Selection Overlay */}
                  {!isActiveSession && (
                    <button 
                      onClick={() => updateState(prev => ({ ...prev, activeProgramId: p.id }))}
                      className="absolute inset-0 z-10 bg-indigo-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <div className="px-6 py-2.5 bg-white text-indigo-600 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                        Set as Active Session
                      </div>
                    </button>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <h4 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        ID: {p.id.split('-')[1]} • {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6 line-clamp-2 italic h-8">
                    {p.description || "No session description provided."}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                         <LayoutGrid size={12} className="text-indigo-400" />
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('common.tickets')}</span>
                      </div>
                      <p className="text-xl font-black italic text-slate-900 leading-none">{p.ticketPool.length}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-amber-50/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                         <Trophy size={12} className="text-amber-400" />
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Winners</span>
                      </div>
                      <p className="text-xl font-black italic text-slate-900 leading-none">{winnersCount}</p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEditing(p)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all"
                          title={t('common.edit')}
                        >
                          <FileText size={18} />
                        </button>
                        <button 
                          onClick={() => handleCreateProgram(p)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-blue-500 transition-all"
                          title="Clone Program"
                        >
                          <Copy size={18} />
                        </button>
                     </div>
                     
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleActive(p.id)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            p.isActive ? "bg-green-500 shadow-md shadow-green-200" : "bg-slate-200"
                          )}
                        >
                           <div className={cn(
                             "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                             p.isActive ? "left-7" : "left-1"
                           )} />
                        </button>
                        <button 
                          onClick={() => deleteProgram(p.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-300 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title={t('common.delete')}
                        >
                          <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
                </div>

                {isActiveSession && (
                  <div className="absolute -inset-[3px] rounded-[2.6rem] border-4 border-indigo-600/20 pointer-events-none animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
