/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppState } from '../types';
import { Trophy, Users, Ticket, CheckCircle2, ChevronRight, RotateCcw, LayoutGrid, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function Dashboard({ state, onSwitchProgram }: { state: AppState, onSwitchProgram: (id: string) => void }) {
  const { t } = useTranslation();
  const currentProgram = state.programs.find(p => p.id === state.activeProgramId);
  
  const stats = [
    { label: t('dashboard.active_programs'), value: state.programs.length, icon: Trophy, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('dashboard.total_tickets'), value: state.programs.reduce((acc, p) => acc + p.ticketPool.length, 0), icon: Ticket, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: t('dashboard.lucky_winners'), value: state.winners.length, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  // Data for charts
  const programData = state.programs.map(p => ({
    name: p.name,
    tickets: p.ticketPool.length,
    winners: state.winners.filter(w => w.programId === p.id).length
  }));

  const prizeData = currentProgram ? currentProgram.prizes.map(p => ({
    name: p.name,
    total: p.quantity,
    won: p.quantity - p.remaining
  })) : [];

  const COLORS = ['#6366f1', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'];

  return (
    <div className="space-y-12 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-6 relative overflow-hidden group">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-4xl font-black tracking-tighter text-slate-900 italic">{stat.value}</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 z-0" />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2 mb-8">
             <BarChart3 className="text-blue-500" size={20} /> {t('dashboard.ticket_stats')}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900 }}
                />
                <Bar dataKey="tickets" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="winners" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2 mb-8">
             <PieIcon className="text-pink-500" size={20} /> {t('dashboard.prize_allocation')}
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {prizeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prizeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="won"
                    nameKey="name"
                  >
                    {prizeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">{t('dashboard.no_session')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2">
           <Trophy className="text-energy-yellow" size={24} /> {t('dashboard.spotlight')}
        </h3>
        {currentProgram ? (
          <div className="bg-energy-vibrant text-white rounded-[2.5rem] p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden shadow-[0_40px_100px_rgba(99,102,241,0.3)] transition-all hover:shadow-[0_40px_100px_rgba(99,102,241,0.5)]">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <RotateCcw size={180} strokeWidth={1} className="animate-spin-slow" />
            </div>
            <div className="relative z-10">
              <span className="px-4 py-1.5 bg-white text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl">{t('dashboard.live_now')}</span>
              <p className="text-5xl font-black mt-6 tracking-tighter italic bg-gradient-to-r from-energy-yellow via-white to-white bg-clip-text text-transparent uppercase leading-tight">{currentProgram.name}</p>
              <p className="text-white/70 mt-3 max-w-lg font-bold text-lg leading-snug">{currentProgram.description || 'Elevate your event with our high-energy lucky draw engine.'}</p>
              <div className="flex items-center gap-6 mt-10">
                <div>
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">{t('dashboard.session_launch')}</p>
                   <p className="text-base font-black">{formatDate(currentProgram.createdAt)}</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div>
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">{t('dashboard.engine_status')}</p>
                   <p className="text-base font-black text-energy-yellow flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
                     {t('dashboard.optimized')}
                   </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-10 relative z-10 lg:pl-12 lg:border-l lg:border-white/20">
               <div className="text-center">
                 <p className="text-5xl font-black italic tracking-tighter text-energy-yellow drop-shadow-lg">{currentProgram.prizes.length}</p>
                 <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2">{t('dashboard.rewards')}</p>
               </div>
               <div className="text-center">
                 <p className="text-5xl font-black italic tracking-tighter text-white drop-shadow-lg">{currentProgram.ticketPool.length}</p>
                 <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2">{t('dashboard.entries')}</p>
               </div>
               <div className="text-center">
                 <p className="text-5xl font-black italic tracking-tighter text-white drop-shadow-lg">{state.winners.filter(w => w.programId === currentProgram.id).length}</p>
                 <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2">{t('dashboard.winners')}</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border-4 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center transition-all hover:bg-slate-200">
            <Trophy className="mx-auto text-slate-300 mb-6" size={64} />
            <p className="text-slate-500 font-black uppercase tracking-widest text-sm">{t('dashboard.no_session')}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2">
           <LayoutGrid className="text-energy-purple" size={24} /> {t('dashboard.library')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.programs.map((p) => (
            <button
              key={p.id}
              onClick={() => onSwitchProgram(p.id)}
              className={cn(
                "p-8 rounded-[2rem] border-2 text-left transition-all duration-300 group relative overflow-hidden",
                p.id === state.activeProgramId 
                  ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-[1.02]" 
                  : "bg-white border-slate-100 hover:border-blue-400 hover:translate-y-[-4px]"
              )}
            >
              <div className="relative z-10">
                <p className="font-black text-xl italic tracking-tighter uppercase leading-tight">{p.name}</p>
                <div className="mt-4 flex items-center gap-3">
                   <div className={cn("px-2 py-1 text-[9px] font-black rounded border", p.id === state.activeProgramId ? "bg-white/20 text-white border-white/30" : "bg-blue-50 text-blue-600 border-blue-100")}>
                     {p.ticketPool.length} {t('common.tickets')}
                   </div>
                   <div className={cn("px-2 py-1 text-[9px] font-black rounded border", p.id === state.activeProgramId ? "bg-white/20 text-white border-white/30" : "bg-amber-50 text-amber-600 border-amber-100")}>
                     {p.prizes.length} {t('common.rewards_caps')}
                   </div>
                </div>
              </div>
              <ChevronRight className={cn("absolute bottom-8 right-8 transition-transform group-hover:translate-x-2", p.id === state.activeProgramId ? "text-energy-yellow" : "text-slate-200")} size={24} strokeWidth={3} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
