/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { AppState, Ticket } from '../types';
import { cn } from '../lib/utils';

export default function DataUpload({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Ticket[]>([]);

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

        // Map data to Ticket format
        // Required column: "Phiếu" or "id" or "code"
        const mappedData: Ticket[] = jsonData.map((row, index) => {
          const findVal = (keys: string[]) => {
            const found = Object.keys(row).find(k => keys.some(key => k.toLowerCase().includes(key.toLowerCase())));
            return found ? row[found] : null;
          };

          const findValString = (keys: string[]) => {
            const val = findVal(keys);
            return val !== null && val !== undefined ? String(val) : "";
          };

          return {
            id: findValString(["phiếu", "ticket", "code", "id", "mã"]) || `T-${1000 + index}`,
            name: findValString(["tên", "name", "họ tên", "full name"]) || "-",
            employeeId: findValString(["mã nv", "id", "employee", "manv"]) || "-",
            department: findValString(["phòng", "department", "bộ phận", "team"]) || "-",
            position: findValString(["vị trí", "chức danh", "position", "title"]) || "-",
            channel: findValString(["kênh", "channel"]) || "-",
            lineManager: findValString(["manager", "người quản lý", "line manager"]) || "-",
            region: findValString(["khu vực", "region", "miền"]) || "-",
            email: findValString(["email", "thư"]),
            ...row
          };
        });

        setPreview(mappedData);
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
    if (preview.length === 0) return;
    
    updateState(prev => {
      const activeProgramId = prev.activeProgramId;
      if (!activeProgramId) return prev;

      return {
        ...prev,
        programs: prev.programs.map(p => 
          p.id === activeProgramId ? { ...p, ticketPool: preview } : p
        )
      };
    });
    
    setPreview([]);
    alert(`Đã nạp ${preview.length} phiếu vào chương trình hiện tại!`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">Import Master Data</h3>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Populate your draw pool with candidates using an Excel (.xlsx) file.
            </p>
          </div>
          <button 
            onClick={() => {
              const ws = XLSX.utils.json_to_sheet([
                { "Phiếu": "LUCKY001", "Tên": "John Doe", "Mã NV": "NV001", "Phòng ban": "Technology", "Email": "john@example.com", "Vị trí": "Developer", "Kênh": "Fireside", "Người quản lý": "Jane Smith", "Khu vực": "Headquarters" },
                { "Phiếu": "LUCKY002", "Tên": "Mary Jane", "Mã NV": "NV002", "Phòng ban": "Sales", "Email": "mary@example.com", "Vị trí": "Account Exec", "Kênh": "Field", "Người quản lý": "Richard Roe", "Khu vực": "Satellite Office" }
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
            <p className="font-black text-xl text-slate-900 tracking-tight">Drop your Excel file here</p>
            <p className="text-sm text-slate-400 mt-2 font-medium">Supports .xlsx, .xls, .csv (Max 10MB)</p>
          </div>
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
              <RefreshCcw className="animate-spin text-blue-600" size={40} />
              <p className="font-black uppercase tracking-widest text-sm">Processing Data...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight italic">Scan Finished</h3>
                <p className="text-sm text-slate-400 font-medium">Found {preview.length} valid tickets in your file.</p>
              </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => setPreview([])} 
                className="flex-1 md:flex-none px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all"
              >
                Abort
              </button>
              <button 
                onClick={handleApply}
                className="flex-1 md:flex-none px-10 py-4 text-xs font-black uppercase tracking-widest bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all"
              >
                Inject into Pool
              </button>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-[2rem]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Draft ID</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Candidate Name</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Staff Code</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Unit / Guild</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.slice(0, 10).map((ticket, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-black text-blue-600">{ticket.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{ticket.name || "-"}</td>
                    <td className="px-6 py-4 font-medium text-slate-500">{ticket.employeeId || "-"}</td>
                    <td className="px-6 py-4">
                       <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase">{ticket.department || "-"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <div className="p-3 text-center bg-gray-50/50 border-t border-gray-100 italic text-xs text-gray-500">
                Hiển thị 10 trong tổng số {preview.length} hàng
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
