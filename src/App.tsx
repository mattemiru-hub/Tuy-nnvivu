/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutGrid, PlusCircle, Trophy, History, Upload, Settings, RotateCcw, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AppState, DrawProgram, Prize, Winner, Ticket } from './types';
import { INITIAL_STATE } from './constants';
import { cn } from './lib/utils';
import { supabaseService } from './services/supabaseService';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Views
import Dashboard from './components/Dashboard';
import ProgramManager from './components/ProgramManager';
import PrizeManager from './components/PrizeManager';
import ParticipantManager from './components/ParticipantManager';
import DrawScreen from './components/DrawScreen';
import HistoryView from './components/HistoryView';
import SystemSettings from './components/SystemSettings';
import Login from './components/Login';

import BackgroundMusic from './components/BackgroundMusic';

export default function App() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'prizes' | 'participants' | 'draw' | 'history' | 'settings'>('dashboard');
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async (programId?: string) => {
    try {
      setLoading(true);
      setFetchError(null);
      const programs = await supabaseService.getPrograms();
      let activeId = programId || state.activeProgramId;
      
      // If the current activeId is invalid (like the old 'prog-demo'), reset it
      const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (activeId && !isValidUuid(activeId)) {
        activeId = undefined;
      }

      if (!activeId && programs.length > 0) activeId = programs[0].id;
      
      if (activeId && isValidUuid(activeId)) {
        const [participants, prizes, winners] = await Promise.all([
          supabaseService.getParticipants(activeId),
          supabaseService.getPrizes(activeId),
          supabaseService.getWinners(activeId)
        ]);

        setState(prev => ({
          ...prev,
          programs,
          activeProgramId: activeId,
          participants,
          prizes,
          winners,
          isLoading: false
        }));
      } else {
        setState(prev => ({ ...prev, programs, isLoading: false }));
      }
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu ban đầu:', error);
      let errorMsg = error.message || 'Failed to connect to Supabase.';
      
      if (errorMsg.includes('fetch') || errorMsg.includes('Không thể tải')) {
        errorMsg = i18n.language === 'vi' 
          ? 'Không thể kết nối tới server Supabase. Vui lòng kiểm tra lại URL Supabase (phải bắt đầu bằng https://) và đảm bảo bạn đã cung cấp Anon Key chính xác trong phần Settings.'
          : 'Failed to fetch from Supabase. Please check your Supabase URL (it must start with https://) and ensure your Anon Key is correct in the Settings.';
      }
      
      setFetchError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!isSupabaseConfigured()) {
      alert("Please configure Supabase first in the Settings menu.");
      return;
    }
    await fetchData();
  };

  // Initial Data Fetch & Auth Check
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync active program data when it changes
  useEffect(() => {
    if (!state.activeProgramId || loading || !session) return;
    fetchData(state.activeProgramId);
  }, [state.activeProgramId]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!state.activeProgramId || !isSupabaseConfigured() || !session) return;

    const supabase = getSupabase();

    const winnersChannel = supabase
      .channel('winners-changes')
      .on('postgres_changes' as any, { event: '*', table: 'winners' }, () => fetchData(state.activeProgramId!))
      .subscribe();

    const participantsChannel = supabase
      .channel('participants-changes')
      .on('postgres_changes' as any, { event: '*', table: 'participants' }, () => fetchData(state.activeProgramId!))
      .subscribe();

    const prizesChannel = supabase
      .channel('prizes-changes')
      .on('postgres_changes' as any, { event: '*', table: 'prizes' }, () => fetchData(state.activeProgramId!))
      .subscribe();

    const programsChannel = supabase
      .channel('programs-changes')
      .on('postgres_changes' as any, { event: '*', table: 'programs' }, async () => {
        const programs = await supabaseService.getPrograms();
        setState(prev => ({ ...prev, programs }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(winnersChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(prizesChannel);
      supabase.removeChannel(programsChannel);
    };
  }, [state.activeProgramId, session]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutGrid },
    { id: 'setup', label: t('nav.programs'), icon: PlusCircle },
    { id: 'prizes', label: t('nav.prizes'), icon: Trophy },
    { id: 'participants', label: t('nav.participants'), icon: Upload },
    { id: 'draw', label: t('nav.draw'), icon: RotateCcw },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const currentProgram = state.programs.find(p => p.id === state.activeProgramId) || state.programs[0];

  return (
    <div className={cn(
      "flex h-screen text-slate-900 font-sans selection:bg-energy-yellow selection:text-black transition-colors duration-1000",
      activeTab === 'draw' && !showSidebar ? "bg-slate-900" : "bg-[#FFFDF0]"
    )}>
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-100 flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.02)] transition-all duration-500 overflow-hidden relative z-50",
        showSidebar ? "w-72 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full pointer-events-none"
      )}>
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-energy-vibrant rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
               <RotateCcw className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none text-slate-900 border-b-2 border-energy-yellow">{t('app.title')}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-1">{t('app.subtitle')}</p>
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
      <main className={cn(
        "flex-1 relative bg-transparent flex flex-col",
        activeTab === 'draw' ? "overflow-hidden" : "overflow-y-auto"
      )}>
        <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl px-4 md:px-8 lg:px-12 py-3 md:py-6 flex justify-between items-center border-b border-gray-100/50 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="w-9 h-9 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg md:rounded-xl text-slate-500 transition-all"
              title="Toggle Menu"
            >
              {showSidebar ? <PlusCircle className="rotate-45" size={18} /> : <LayoutGrid size={18} />}
            </button>
            <h2 className="text-lg md:text-2xl font-black tracking-tighter text-slate-900 uppercase italic truncate">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
             <div className="hidden md:flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
               <span className="text-[9px] font-black uppercase text-slate-400 pl-2 tracking-widest">{t('nav.programs')}</span>
               <select 
                value={state.activeProgramId || ''} 
                onChange={(e) => setState(prev => ({ ...prev, activeProgramId: e.target.value }))}
                className="bg-white border-none rounded-xl px-4 py-2 font-black text-xs shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
               >
                 {state.programs.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </select>
             </div>
             <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-[10px] font-black uppercase tracking-widest text-slate-600"
             >
               <Languages size={14} />
               {i18n.language === 'vi' ? 'English' : 'Tiếng Việt'}
             </button>
             <button 
              onClick={refreshData}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
             >
               <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
               Cloud Sync
             </button>
             {session && (
               <button 
                 onClick={() => getSupabase().auth.signOut()}
                 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600 transition-colors"
               >
                 Sign Out
               </button>
             )}
             <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs">AI</div>
          </div>
        </header>

        <div className={cn(
          "max-w-6xl mx-auto w-full flex-1 min-h-0",
          activeTab === 'draw' ? "p-0 flex flex-col max-w-none" : "p-4 md:p-8"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={activeTab === 'draw' ? "h-full" : ""}
            >
              {!isSupabaseConfigured() ? (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Settings font-black size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic">Supabase Connection Required</h3>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                    To enable the cloud-synced Lucky Draw features, you need to connect your Supabase project. 
                    Please set <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">VITE_SUPABASE_URL</code> and 
                    <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">VITE_SUPABASE_ANON_KEY</code> in the 
                    <strong className="mx-1">Settings</strong> menu of AI Studio.
                  </p>
                  <div className="flex flex-col items-center gap-4">
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
                       Need a Supabase project? <br/>
                       <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Sign up for free at supabase.com</a>
                     </p>
                  </div>
                </div>
              ) : !session ? (
                <Login />
              ) : fetchError ? (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <RotateCcw className="animate-spin-slow" size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic">Lỗi Kết Nối Dữ Liệu</h3>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                    Có vẻ như ứng dụng không thể kết nối tới cơ sở dữ liệu Supabase. 
                    Lỗi chi tiết: <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-800 break-all">{fetchError}</code>
                  </p>
                  <button 
                    onClick={() => fetchData()}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
                  >
                    Thử Lại Ngay
                  </button>
                </div>
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard state={state} onSwitchProgram={(id) => updateState(s => ({ ...s, activeProgramId: id }))} />}
                  {activeTab === 'setup' && <ProgramManager state={state} updateState={updateState} />}
                  {activeTab === 'prizes' && <PrizeManager state={state} updateState={updateState} />}
                  {activeTab === 'participants' && <ParticipantManager state={state} updateState={updateState} />}
                  {activeTab === 'draw' && <DrawScreen state={state} updateState={updateState} onNavigate={setActiveTab} />}
                  {activeTab === 'history' && <HistoryView state={state} updateState={updateState} />}
                  {activeTab === 'settings' && <SystemSettings state={state} updateState={updateState} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Background Music */}
      <BackgroundMusic 
        url={currentProgram?.bgmUrl} 
        volume={currentProgram?.bgmVolume} 
        enabled={currentProgram?.bgmEnabled} 
      />
    </div>
  );
}
