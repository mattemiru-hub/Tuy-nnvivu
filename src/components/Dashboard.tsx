/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppState } from '../types';
import { Trophy, Users, Ticket, CheckCircle2, ChevronRight, RotateCcw, LayoutGrid, BarChart3, PieChart as PieIcon, TrendingUp, Zap, Sparkles, Image as ImageIcon } from 'lucide-react';
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
  Pie,
  LineChart,
  Line,
} from 'recharts';

export default function Dashboard({ state, onSwitchProgram }: { state: AppState, onSwitchProgram: (id: string) => void }) {
  const { t } = useTranslation();
  const currentProgram = state.programs.find(p => p.id === state.activeProgramId);
  
  const totalTickets = state.programs.reduce((acc, p) => acc + p.ticketPool.length, 0);
  const totalWinners = state.winners.length;
  const participationRate = totalTickets > 0 ? Math.round((totalWinners / totalTickets) * 100) : 0;

  const stats = [
    { label: t('dashboard.active_programs'), value: state.programs.length, icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
    { label: t('dashboard.total_tickets'), value: totalTickets, icon: Ticket, color: 'text-amber-500', bg: 'bg-amber-50', trend: '+5.4%' },
    { label: t('dashboard.lucky_winners'), value: totalWinners, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: '+8.1%' },
  ];

  // Distribution by Department
  const deptMap: Record<string, number> = {};
  state.winners.forEach(w => {
    const dept = w.department || 'Unknown';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });

  const deptData = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const programData = state.programs.map(p => ({
    name: p.name,
    tickets: p.ticketPool.length,
    winners: state.winners.filter(w => w.programId === p.id).length
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-12 pb-20">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-6 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <stat.icon size={28} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp size={12} /> {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-4xl font-black tracking-tighter text-slate-900 italic">{stat.value}</p>
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 translate-y-4">
              <stat.icon size={120} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Department Distribution (Expert Detail) */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2">
               <Zap className="text-amber-500" size={20} /> Win Velocity by Department
            </h3>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest leading-none">Last 30 Days</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900 }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={32}>
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Efficiency (Expert Detail) */}
        <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={140} className="animate-pulse" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Engine Utilization</p>
            <h4 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Engagement<br/>Efficiency</h4>
            
            <div className="mt-12 space-y-6">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Global Participation</p>
                  <p className="text-sm font-black text-energy-yellow">{participationRate}%</p>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-energy-yellow" style={{ width: `${participationRate}%` }} />
                </div>
              </div>
              
              <div className="flex gap-4">
                 <div className="flex-1 p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Avg Rate</p>
                    <p className="text-2xl font-black tabular-nums">4.2s</p>
                 </div>
                 <div className="flex-1 p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Confidence</p>
                    <p className="text-2xl font-black tabular-nums">99%</p>
                 </div>
              </div>
            </div>
          </div>
          <button className="mt-8 py-4 bg-white text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-energy-yellow transition-colors relative z-10 shadow-lg">
            Audit Real-time Engine
          </button>
        </div>
      </div>

      {/* Spotlight with Thumbnail */}
      <div className="space-y-6">
        <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2">
           <Trophy className="text-energy-yellow" size={24} /> {t('dashboard.spotlight')}
        </h3>
        {currentProgram ? (
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-4 md:p-6 border border-slate-100 shadow-2xl relative overflow-hidden group">
            <div className="flex flex-col lg:flex-row gap-8">
               {/* Thumbnail Side */}
               <div className="w-full lg:w-96 h-64 lg:h-96 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden relative shadow-inner bg-slate-100">
                  {currentProgram.thumbnail ? (
                    <img src={currentProgram.thumbnail} alt={currentProgram.name} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                       <ImageIcon size={64} strokeWidth={1} />
                       <p className="text-[10px] font-black uppercase tracking-widest">No program visual</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                  <div className="absolute bottom-6 left-6 flex items-center gap-2">
                     <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">System Operational</p>
                  </div>
               </div>

               {/* Info Side */}
               <div className="flex-1 py-4 pr-4">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl">LIVE SESSION</span>
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">ID: {currentProgram.id}</span>
                  </div>
                  <h4 className="text-4xl md:text-6xl font-black tracking-tighter italic text-slate-900 uppercase leading-none mb-6">
                    {currentProgram.name}
                  </h4>
                  <p className="text-slate-400 font-bold text-lg leading-snug line-clamp-3 mb-10 max-w-2xl italic">
                    "{currentProgram.description || 'Elevate your event with our high-energy lucky draw engine.'}"
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rewards</p>
                       <p className="text-2xl font-black text-indigo-600">{currentProgram.prizes.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pool</p>
                       <p className="text-2xl font-black text-slate-900">{currentProgram.ticketPool.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Won</p>
                       <p className="text-2xl font-black text-emerald-500">{state.winners.filter(w => w.programId === currentProgram.id).length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                       <p className="text-2xl font-black text-amber-500">
                          {currentProgram.prizes.reduce((a, b) => a + b.remaining, 0)}
                       </p>
                    </div>
                  </div>
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

      {/* Program Library - Advanced Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-800 flex items-center gap-2">
             <LayoutGrid className="text-energy-purple" size={24} /> {t('dashboard.library')}
          </h3>
          <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
            View All Infrastructure <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {state.programs.map((p) => (
            <button
              key={p.id}
              onClick={() => onSwitchProgram(p.id)}
              className={cn(
                "group rounded-[2rem] border-2 text-left transition-all duration-500 relative overflow-hidden flex flex-col",
                p.id === state.activeProgramId 
                  ? "bg-indigo-600 border-indigo-600 shadow-2xl scale-[1.02] text-white" 
                  : "bg-white border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100"
              )}
            >
              {/* Card Image */}
              <div className="h-40 relative overflow-hidden">
                 {p.thumbnail ? (
                   <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 ) : (
                   <div className={cn("w-full h-full flex items-center justify-center", p.id === state.activeProgramId ? "bg-white/10" : "bg-slate-50")}>
                      <Trophy size={40} className={cn(p.id === state.activeProgramId ? "text-white/20" : "text-slate-200")} />
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:opacity-0 transition-opacity" />
              </div>

              <div className="p-6 relative">
                <div className="flex items-center justify-between mb-2">
                   <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", p.id === state.activeProgramId ? "text-white/60" : "text-slate-400")}>
                     {p.month}/{p.year} Cycle
                   </p>
                   {p.isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
                <h5 className="font-black text-lg italic tracking-tighter uppercase leading-tight line-clamp-1 mb-4">{p.name}</h5>
                
                <div className="flex items-center gap-4">
                   <div>
                     <p className={cn("text-[8px] font-black uppercase tracking-widest", p.id === state.activeProgramId ? "text-white/40" : "text-slate-300")}>Pool</p>
                     <p className="text-sm font-black tabular-nums">{p.ticketPool.length}</p>
                   </div>
                   <div className={cn("w-px h-6", p.id === state.activeProgramId ? "bg-white/20" : "bg-slate-100")} />
                   <div>
                     <p className={cn("text-[8px] font-black uppercase tracking-widest", p.id === state.activeProgramId ? "text-white/40" : "text-slate-300")}>Wins</p>
                     <p className="text-sm font-black tabular-nums">{state.winners.filter(w => w.programId === p.id).length}</p>
                   </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
