/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCcw, Table as TableIcon, Split } from 'lucide-react';
import { AppState, Ticket, DrawProgram } from '../types';
import { generateId, cn } from '../lib/utils';
import { INITIAL_PRIZES } from '../constants';
import { useTranslation } from 'react-i18next';

interface ColumnMapping {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  programNameCol?: string;
  [key: string]: string | undefined;
}

export default function DataUpload({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    id: '',
    name: '',
    employeeId: '',
    department: '',
    programNameCol: ''
  });
  const [isSplitMode, setIsSplitMode] = useState(false);

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          throw new Error("File Excel không có dữ liệu hoặc sai định dạng.");
        }

        const cols = Object.keys(jsonData[0]);
        setColumns(cols);
        setRawData(jsonData);
        
        // Auto-detect mappings
        const autoMap: ColumnMapping = { id: '', name: '', employeeId: '', department: '', programNameCol: '' };
        cols.forEach(col => {
          const l = col.toLowerCase();
          if (l.includes('phiếu') || l.includes('ticket') || l.includes('id')) autoMap.id = col;
          if (l.includes('tên') || l.includes('name')) autoMap.name = col;
          if (l.includes('mã') || l.includes('staff')) autoMap.employeeId = col;
          if (l.includes('phòng') || l.includes('dept')) autoMap.department = col;
          if (l.includes('ct') || l.includes('program')) autoMap.programNameCol = col;
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

  const handleApply = () => {
    if (rawData.length === 0) return;

    const processedData = rawData.map((row, index) => ({
      id: String(row[mapping.id] || `T-${1000 + index}`),
      name: String(row[mapping.name] || "-"),
      employeeId: String(row[mapping.employeeId] || "-"),
      department: String(row[mapping.department] || "-"),
      programName: isSplitMode && mapping.programNameCol ? String(row[mapping.programNameCol] || "General") : "",
      ...row
    }));

    updateState(prev => {
      let newPrograms = [...prev.programs];

      if (isSplitMode && mapping.programNameCol) {
        const programGroups: Record<string, Ticket[]> = {};
        processedData.forEach(item => {
          const pName = item.programName;
          if (!programGroups[pName]) programGroups[pName] = [];
          programGroups[pName].push(item);
        });

        Object.entries(programGroups).forEach(([name, tickets]) => {
          const existing = newPrograms.find(p => p.name === name);
          if (existing) {
            existing.ticketPool = tickets;
          } else {
            const newProgram: DrawProgram = {
              id: `prog-${generateId()}`,
              name: name,
              createdAt: Date.now(),
              prizes: INITIAL_PRIZES.map(p => ({ ...p, id: generateId(), remaining: p.quantity })),
              rules: {
                maxWinsPerTicket: 1,
                maxWinsPerPerson: 1,
                preventDuplicatePrizeType: true,
                fairnessRandom: true
              },
              ticketPool: tickets,
              isActive: true,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear()
            };
            newPrograms.push(newProgram);
          }
        });
      } else {
        const activeId = prev.activeProgramId;
        if (activeId) {
          newPrograms = newPrograms.map(p => 
            p.id === activeId ? { ...p, ticketPool: processedData } : p
          );
        }
      }

      return {
        ...prev,
        programs: newPrograms,
        activeProgramId: (isSplitMode && newPrograms.length > prev.programs.length) ? newPrograms[newPrograms.length - 1].id : prev.activeProgramId
      };
    });

    setRawData([]);
    alert("Đã xử lý dữ liệu và nạp vào hệ thống!");
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Context Header */}
      {!rawData.length && state.activeProgramId && (
        <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between">
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

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">Import Master Data</h3>
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
              "border-4 border-dashed rounded-[2rem] p-16 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-6 group relative overflow-hidden",
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
                onClick={() => setRawData([])}
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
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
