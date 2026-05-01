/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutGrid, PlusCircle, Trophy, History, Upload, Settings, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, DrawProgram, Prize, Winner, Ticket } from './types';
import { loadState, saveState, INITIAL_STATE } from './constants';
import { cn } from './lib/utils';

// Views
import Dashboard from './components/Dashboard';
import ProgramManager from './components/ProgramManager';
import PrizeManager from './components/PrizeManager';
import DataUpload from './components/DataUpload';
import DrawScreen from './components/DrawScreen';
import HistoryView from './components/HistoryView';

export default function App() {
  const [state, setState] = useState<AppState>(loadState());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'prizes' | 'upload' | 'draw' | 'history'>('dashboard');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutGrid },
    { id: 'setup', label: 'Chương trình', icon: PlusCircle },
    { id: 'prizes', label: 'Giải thưởng', icon: Trophy },
    { id: 'upload', label: 'Dữ liệu', icon: Upload },
    { id: 'draw', label: 'Quay số', icon: RotateCcw },
    { id: 'history', label: 'Lịch sử', icon: History },
  ];

  const currentProgram = state.programs.find(p => p.id === state.activeProgramId) || state.programs[0];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-energy-yellow selection:text-black">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-energy-vibrant rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
               <RotateCcw className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none text-slate-900 border-b-2 border-energy-yellow">LUCKYDRAW</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-1">PRO ENGINE</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 text-sm font-black rounded-2xl transition-all uppercase tracking-tight relative group",
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/20 translate-x-1" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-energy-yellow" : "text-slate-300 group-hover:text-slate-400")} />
              {item.label}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute left-0 w-1.5 h-6 bg-energy-yellow rounded-full -translate-x-1"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-inner">
            <p className="text-[9px] uppercase font-black text-slate-400 mb-2 tracking-widest">Active Session</p>
            <p className="text-sm font-black text-slate-800 truncate mb-3">{currentProgram?.name || "No Session"}</p>
            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
               <motion.div 
                className="h-full bg-energy-vibrant" 
                initial={{ width: 0 }}
                animate={{ width: currentProgram ? '100%' : '0%' }}
               />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-[#fcfcfc]">
        <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl px-12 py-6 flex justify-between items-center border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
             <button 
              onClick={() => {
                if(confirm("Bạn có chắc chắn muốn reset toàn bộ dữ liệu?")) {
                  setState(INITIAL_STATE);
                }
              }}
              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
             >
               Purge Database
             </button>
             <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs">AI</div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard state={state} onSwitchProgram={(id) => updateState(s => ({ ...s, activeProgramId: id }))} />}
              {activeTab === 'setup' && <ProgramManager state={state} updateState={updateState} />}
              {activeTab === 'prizes' && <PrizeManager state={state} updateState={updateState} />}
              {activeTab === 'upload' && <DataUpload state={state} updateState={updateState} />}
              {activeTab === 'draw' && <DrawScreen state={state} updateState={updateState} onNavigate={setActiveTab} />}
              {activeTab === 'history' && <HistoryView state={state} updateState={updateState} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
