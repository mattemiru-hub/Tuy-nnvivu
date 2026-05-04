/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCcw, Table as TableIcon, Split, Search, Trash2, Edit3, UserPlus, X } from 'lucide-react';
import { AppState, Ticket, DrawProgram } from '../types';
import { generateId, cn } from '../lib/utils';
import { INITIAL_PRIZES } from '../constants';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { cleanParticipantData } from '../utils/drawEngine';
import { supabaseService } from '../services/supabaseService';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface ColumnMapping {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  programNameCol?: string;
  [key: string]: string | undefined;
}

export default function ParticipantManager({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'list'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    id: '',
    name: '',
    employeeId: '',
    department: '',
    programNameCol: '',
    upi: '',
    location: '',
    region: '',
    lineManager: ''
  });
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const currentProgram = state.programs.find(p => p.id === state.activeProgramId);

  const filteredTickets = useMemo(() => {
    if (!currentProgram) return [];
    if (!searchQuery) return currentProgram.ticketPool;
    const q = searchQuery.toLowerCase();
    return currentProgram.ticketPool.filter(t => 
      t.name?.toLowerCase().includes(q) || 
      t.id?.toLowerCase().includes(q) || 
      t.employeeId?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q)
    );
  }, [currentProgram, searchQuery]);

  const deleteTicket = async (ticketId: string) => {
    if (!currentProgram || !isSupabaseConfigured()) return;
    try {
      const { error } = await getSupabase().from('participants').delete().eq('id', ticketId);
      if (error) throw error;
      // Real-time will handle the state update
    } catch (err) {
      console.error('Error deleting participant:', err);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket || !currentProgram || !isSupabaseConfigured()) return;

    try {
      const { error } = await getSupabase().from('participants').update({
        name: editingTicket.name,
        employee_id: editingTicket.employeeId,
        department: editingTicket.department,
        upi: editingTicket.upi,
        location: editingTicket.location,
        region: editingTicket.region,
        line_manager: editingTicket.lineManager
      }).eq('id', editingTicket.id);
      
      if (error) throw error;
      setEditingTicket(null);
    } catch (err) {
      console.error('Error updating participant:', err);
    }
  };

  const clearAllTickets = async () => {
    if (!currentProgram || !isSupabaseConfigured()) return;
    if (!confirm(t('participants.confirm_bulk_delete'))) return;
    try {
      const { error } = await getSupabase().from('participants').delete().eq('program_id', currentProgram.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error clearing participants:', err);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

        // Skip empty rows (rows where all values are empty or whitespace)
        jsonData = jsonData.filter(row => 
          Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== "")
        );

        if (jsonData.length === 0) {
          throw new Error("The Excel/CSV file is empty or contains only empty rows.");
        }

        const cols = Object.keys(jsonData[0]);
        if (cols.length < 2) {
           throw new Error("File formatting issue: Too few columns detected. Please check your data structure.");
        }
        setColumns(cols);
        setRawData(jsonData);
        
        // Auto-detect mappings
        const autoMap: ColumnMapping = { 
          id: '', name: '', employeeId: '', department: '', programNameCol: '',
          upi: '', location: '', region: '', lineManager: '' 
        };
        cols.forEach(col => {
          const l = col.toLowerCase();
          if (l.includes('phiếu') || l.includes('ticket') || (l.includes('id') && !l.includes('staff') && !l.includes('emp'))) autoMap.id = col;
          if (l.includes('tên') || l.includes('name')) autoMap.name = col;
          if (l.includes('mã') || l.includes('staff') || l.includes('emp')) autoMap.employeeId = col;
          if (l.includes('phòng') || l.includes('dept') || l.includes('kênh') || l.includes('channel')) autoMap.department = col;
          if (l.includes('ct') || l.includes('program')) autoMap.programNameCol = col;
          if (l.includes('upi')) autoMap.upi = col;
          if (l.includes('vị trí') || l.includes('location')) autoMap.location = col;
          if (l.includes('vùng') || l.includes('region')) autoMap.region = col;
          if (l.includes('manager') || l.includes('quản lý')) autoMap.lineManager = col;
        });
        setMapping(autoMap);

      } catch (err: any) {
        setError(err.message || "Lỗi xử lý file Excel");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls', '.csv'],
      'text/csv': ['.csv'],
      'application/octet-stream': ['.xlsx', '.xls']
    },
    multiple: false
  } as any);

  const handleApply = async () => {
    if (rawData.length === 0) return;

    // Check for duplicates in the new data
    const ids = rawData.map(row => String(row[mapping.id] || ""));
    const duplicateIdsInFile = ids.filter((id, index) => id && ids.indexOf(id) !== index);
    
    if (duplicateIdsInFile.length > 0 && !confirm(`Phát hiện ${duplicateIdsInFile.length} mã bị trùng trong file. Hệ thống sẽ tự động lọc bỏ các mã trùng. Bạn có muốn tiếp tục?`)) {
      return;
    }

    const processedData = cleanParticipantData(rawData.map((row, index) => ({
      id: String(row[mapping.id] || `T-${1000 + index}`),
      name: String(row[mapping.name] || "-"),
      employeeId: String(row[mapping.employeeId] || "-"),
      department: String(row[mapping.department] || "-"),
      upi: String(row[mapping.upi] || "-"),
      location: String(row[mapping.location] || "-"),
      region: String(row[mapping.region] || "-"),
      lineManager: String(row[mapping.lineManager] || "-"),
      position: String(row['Position'] || row['Chức vụ'] || "-"),
      programName: isSplitMode && mapping.programNameCol ? String(row[mapping.programNameCol] || "General") : "",
    })));

    try {
      setIsProcessing(true);
      if (isSplitMode && mapping.programNameCol) {
        const programGroups: Record<string, Ticket[]> = {};
        processedData.forEach(item => {
          const pName = item.programName;
          if (!programGroups[pName]) programGroups[pName] = [];
          programGroups[pName].push(item);
        });

        for (const [name, tickets] of Object.entries(programGroups)) {
          let targetProgram = state.programs.find(p => p.name === name);
          if (!targetProgram) {
            targetProgram = await supabaseService.createProgram(name);
          }
          await supabaseService.uploadParticipants(targetProgram.id, tickets);
        }
      } else {
        const activeId = state.activeProgramId;
        if (activeId) {
          await supabaseService.uploadParticipants(activeId, processedData);
        }
      }
      setRawData([]);
      alert("Đã xử lý dữ liệu và nạp vào hệ thống!");
    } catch (err: any) {
      console.error('Error uploading participants:', err);
      // Hiển thị chi tiết lỗi để dễ chẩn đoán trên Vercel
      const errorMsg = err.message || err.details || "Unknown error";
      alert(`Lỗi khi tải dữ liệu lên Supabase: ${errorMsg}\nVui lòng kiểm tra RLS Policies và kết nối mạng.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Sub-navigation */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveSubTab('upload')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
            activeSubTab === 'upload' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          {t('upload.tab_upload')}
        </button>
        <button 
          onClick={() => setActiveSubTab('list')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
            activeSubTab === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          {t('upload.tab_list')}
        </button>
      </div>

      {activeSubTab === 'upload' ? (
        <>
          {/* Context Header */}
          {!rawData.length && state.activeProgramId && (
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Target Session</p>
                    <p className="font-black text-slate-900 italic uppercase tracking-tighter">
                      {state.programs.find(p => p.id === state.activeProgramId)?.name}
                    </p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pool Status</p>
                  <p className="font-black text-indigo-600">
                    {state.programs.find(p => p.id === state.activeProgramId)?.ticketPool.length || 0} Tickets Loaded
                  </p>
               </div>
            </div>
          )}

          <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
              <div>
                <h3 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-800">Import Master Data</h3>
                <p className="text-sm text-slate-400 mt-1 font-medium">
                  {t('upload.supports')}
                </p>
              </div>
              <button 
                onClick={() => {
                  const ws = XLSX.utils.json_to_sheet([
                    { "Phiếu": "LUCKY001", "Tên": "John Doe", "Mã NV": "NV001", "Phòng ban": "Technology", "Program": "New Year 2024" },
                    { "Phiếu": "LUCKY002", "Tên": "Mary Jane", "Mã NV": "NV002", "Phòng ban": "Sales", "Program": "Summer 2024" }
                  ]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Candidates");
                  XLSX.writeFile(wb, "Sample_LuckyDraw_Pool.xlsx");
                }}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-5 py-3 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
              >
                <FileText size={16} /> DOWNLOAD TEMPLATE
              </button>
            </div>

            {!rawData.length ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-4 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-8 md:p-16 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-6 group relative overflow-hidden",
                  isDragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-100 hover:border-blue-400 hover:bg-slate-50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Upload size={40} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-900 tracking-tight">{t('upload.drop_files')}</p>
                  <p className="text-sm text-slate-400 mt-2 font-medium">Supports .xlsx, .xls, .csv</p>
                </div>
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                    <RefreshCcw className="animate-spin text-blue-600" size={40} />
                    <p className="font-black uppercase tracking-widest text-sm">Processing Data...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="flex items-center gap-2 font-black uppercase tracking-widest text-xs text-slate-400">
                      <TableIcon size={16} /> {t('upload.mapping')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {['id', 'name', 'employeeId', 'department'].map(field => (
                        <div key={field} className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 px-1">{field}</label>
                          <select 
                            value={mapping[field]} 
                            onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold appearance-none hover:border-blue-300 transition-colors cursor-pointer"
                          >
                            <option value="">Select Column</option>
                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="flex items-center gap-2 font-black uppercase tracking-widest text-xs text-slate-400">
                      <Split size={16} /> Mode Selection
                    </h4>
                    <div className="flex flex-col gap-4">
                       <button 
                        onClick={() => setIsSplitMode(false)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                          !isSplitMode ? "bg-blue-50 border-blue-600 text-blue-600 shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                       >
                         <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <CheckCircle2 size={20} />
                         </div>
                         <div>
                            <p className="font-black text-sm uppercase">{t('upload.one_file_per')}</p>
                            <p className="text-[10px] font-bold opacity-70">Import all data into the current active program.</p>
                         </div>
                       </button>

                       <button 
                        onClick={() => setIsSplitMode(true)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                          isSplitMode ? "bg-blue-50 border-blue-600 text-blue-600 shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                       >
                         <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Split size={20} />
                         </div>
                         <div>
                            <p className="font-black text-sm uppercase">{t('upload.one_file_multi')}</p>
                            <p className="text-[10px] font-bold opacity-70">Automatically split entries into multiple programs based on a column.</p>
                         </div>
                       </button>

                       {isSplitMode && (
                         <div className="animate-in zoom-in-95 mt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Program Name Column</label>
                            <select 
                              value={mapping.programNameCol} 
                              onChange={(e) => setMapping(prev => ({ ...prev, programNameCol: e.target.value }))}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                            >
                              <option value="">Select Split Column</option>
                              {columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setRawData([]);
                      setWarning(null);
                    }}
                    className="flex-1 px-8 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApply}
                    disabled={!mapping.id || !mapping.name || (isSplitMode && !mapping.programNameCol)}
                    className="flex-[2] px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all"
                  >
                    {t('upload.process')}
                  </button>
                </div>

                {/* Data Preview */}
                {rawData.length > 0 && columns.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h4 className="font-black uppercase tracking-widest text-xs text-slate-400">Data Preview (First 5 rows)</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
                      <table className="w-full text-left border-collapse text-xs table-fixed">
                        <thead className="bg-slate-50">
                          <tr>
                            {columns.slice(0, 6).map((col, idx) => (
                              <th key={`head-${col}-${idx}`} className="px-4 py-3 font-black text-slate-500 uppercase tracking-tighter border-b border-slate-100">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawData.slice(0, 5).map((row, i) => (
                            <tr key={`row-${i}`} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                              {columns.slice(0, 6).map((col, j) => (
                                <td key={`cell-${i}-${j}`} className="px-4 py-3 text-slate-600 truncate border-b border-slate-50">
                                  {String(row[col] || "-")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={t('participants.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none font-bold text-sm transition-all"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    {filteredTickets.length} / {currentProgram?.ticketPool.length || 0} Records
                 </div>
                 <button 
                  onClick={clearAllTickets}
                  className="px-5 py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                 >
                   {t('participants.clear_all')}
                 </button>
              </div>
           </div>

           <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Ticket</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredTickets.length > 0 ? (
                         filteredTickets.slice(0, 100).map((ticket) => (
                           <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-8 py-4">
                                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{ticket.id}</span>
                             </td>
                             <td className="px-8 py-4 font-bold text-slate-700">{ticket.name}</td>
                             <td className="px-8 py-4 text-sm text-slate-400 font-bold">{ticket.employeeId}</td>
                             <td className="px-8 py-4">
                                <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                                  {ticket.department}
                                </span>
                             </td>
                             <td className="px-8 py-4 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                 <button 
                                  onClick={() => setEditingTicket(ticket)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                 >
                                   <Edit3 size={16} />
                                 </button>
                                 <button 
                                  onClick={() => deleteTicket(ticket.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                               <div className="flex flex-col items-center gap-4">
                                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                                     <TableIcon size={32} />
                                  </div>
                                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t('participants.no_data')}</p>
                               </div>
                            </td>
                         </tr>
                       )}
                       {filteredTickets.length > 100 && (
                         <tr>
                           <td colSpan={5} className="px-8 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                              Showing first 100 results... Use search to find specific people.
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTicket(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative z-10 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Edit Profile</h3>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">ID: {editingTicket.id}</p>
                </div>
                <button 
                  onClick={() => setEditingTicket(null)}
                  className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateTicket} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Candidate Name</label>
                  <input 
                    type="text"
                    value={editingTicket.name}
                    onChange={e => setEditingTicket({ ...editingTicket, name: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Employee ID</label>
                    <input 
                      type="text"
                      value={editingTicket.employeeId}
                      onChange={e => setEditingTicket({ ...editingTicket, employeeId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Department</label>
                    <input 
                      type="text"
                      value={editingTicket.department}
                      onChange={e => setEditingTicket({ ...editingTicket, department: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
