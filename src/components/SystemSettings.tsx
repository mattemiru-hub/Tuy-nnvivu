/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppState } from '../types';
import { INITIAL_STATE, STORAGE_KEY } from '../constants';
import { Trash2, Download, Upload, ShieldAlert, Database, RotateCcw, Save, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabaseService } from '../services/supabaseService';

export default function SystemSettings({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `lucky_draw_backup_${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (confirm("This will overwrite all current data. Are you sure?")) {
          updateState(() => imported);
          alert("Data imported successfully!");
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const resetCurrentResults = async () => {
    if (!state.activeProgramId) return;
    if (!confirm("This will clear all winners for the current active program. Continue?")) return;

    try {
      await supabaseService.resetProgramWinners(state.activeProgramId);
      alert("Results reset for current program.");
    } catch (err) {
      console.error('Error resetting winners:', err);
      alert("Failed to reset results.");
    }
  };

  const purgeAll = () => {
    if (confirm(t('app.confirm_purge'))) {
      updateState(() => INITIAL_STATE);
      alert("System restored to factory defaults.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[2.5rem] flex items-center gap-8">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-red-500 shadow-sm border border-red-100">
           <ShieldAlert size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase text-red-600">Admin Control Center</h2>
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">High-privileged system operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Backup & Restore */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
           <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 mb-6 flex items-center gap-2">
              <Database size={20} className="text-indigo-600" /> Data Backup
           </h3>
           <div className="space-y-4">
              <button 
                onClick={handleExport}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 group"
              >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <Download size={18} />
                   </div>
                   <span className="font-black text-xs uppercase tracking-widest text-slate-600">Export Backup (.json)</span>
                </div>
              </button>

              <label className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 cursor-pointer group">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                      <Upload size={18} />
                   </div>
                   <span className="font-black text-xs uppercase tracking-widest text-slate-600">Restore from Backup</span>
                </div>
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>
           </div>
        </section>

        {/* General Settings */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
           <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 mb-6 flex items-center gap-2">
              <Settings size={20} className="text-indigo-600" /> General Settings
           </h3>
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Global Currency Display</label>
                 <select 
                   value={state.settings.currency}
                   onChange={(e) => updateState(prev => ({ ...prev, settings: { ...prev.settings, currency: e.target.value } }))}
                   className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                 >
                   <option value="VND">VND (Vietnamese Đồng)</option>
                   <option value="USD">USD (US Dollar)</option>
                   <option value="EUR">EUR (Euro)</option>
                   <option value="JPY">JPY (Yen)</option>
                 </select>
              </div>
           </div>
        </section>

        {/* Maintenance */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
           <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 mb-6 flex items-center gap-2">
              <RotateCcw size={20} className="text-indigo-600" /> Maintenance
           </h3>
           <div className="space-y-4">
              <button 
                onClick={resetCurrentResults}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 group"
              >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                      <RotateCcw size={18} />
                   </div>
                   <span className="font-black text-xs uppercase tracking-widest text-slate-600">Reset Current Winners</span>
                </div>
              </button>

              <button 
                onClick={purgeAll}
                className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-2xl transition-all border border-red-100 group"
              >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                      <Trash2 size={18} />
                   </div>
                   <span className="font-black text-xs uppercase tracking-widest text-red-600">Purge Entire System</span>
                </div>
              </button>
           </div>
        </section>

        {/* Database Health Help */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl md:col-span-2">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 flex items-center gap-2">
                 <ShieldAlert size={20} className="text-amber-500" /> Database Health & Migrations
              </h3>
              <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                Schema Helper
              </div>
           </div>
           
           <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-100/50">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                   If you see "column not found" or "remaining column missing", run this in Supabase SQL Editor:
                 </p>
              </div>
              <div className="p-6 relative">
                 <pre className="font-mono text-[11px] leading-relaxed text-indigo-900 overflow-x-auto whitespace-pre-wrap">
                   {`-- 1. Add missing 'remaining' column to prizes
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS remaining INTEGER DEFAULT 0;
UPDATE prizes SET remaining = quantity WHERE remaining IS NULL OR remaining = 0;

-- 2. Add 'is_active' to programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Create helper function for resetting
CREATE OR REPLACE FUNCTION reset_prizes_remaining(prog_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prizes
  SET remaining = quantity
  WHERE program_id = prog_id;
END;
$$ LANGUAGE plpgsql;`}
                 </pre>
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(`ALTER TABLE prizes ADD COLUMN IF NOT EXISTS remaining INTEGER DEFAULT 0;
UPDATE prizes SET remaining = quantity WHERE remaining IS NULL OR remaining = 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
CREATE OR REPLACE FUNCTION reset_prizes_remaining(prog_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prizes
  SET remaining = quantity
  WHERE program_id = prog_id;
END;
$$ LANGUAGE plpgsql;`);
                     alert("SQL copied to clipboard!");
                   }}
                   className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                 >
                   <Save size={14} /> Copy SQL Fix
                 </button>
              </div>
           </div>
        </section>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black italic tracking-tighter uppercase">Storage Status</h3>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Local Browser persistence</p>
             </div>
             <div className="px-4 py-1.5 bg-green-500 rounded-full text-[10px] font-black uppercase tracking-widest">Active</div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Programs Cached</span>
                <span className="font-black italic">{state.programs.length}</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Participants</span>
                <span className="font-black italic">{state.programs.reduce((acc, p) => acc + p.ticketPool.length, 0)}</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Storage Key</span>
                <span className="font-mono text-[10px] text-slate-500">{STORAGE_KEY}</span>
             </div>
          </div>
      </div>
    </div>
  );
}
