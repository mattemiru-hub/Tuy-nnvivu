/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as XLSX from 'xlsx';
import { AppState, Winner } from '../types';
import { Download, Trash2, Filter, Search, User, Trophy, Calendar } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { supabaseService } from '../services/supabaseService';

export default function HistoryView({ state, updateState }: { state: AppState, updateState: (updater: (prev: AppState) => AppState) => void }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterProgramId, setFilterProgramId] = React.useState<string>("all");
  const [filterPrizeName, setFilterPrizeName] = React.useState<string>("all");

  const uniquePrizes = Array.from(new Set(state.winners.map(w => w.prizeName)));

  const filteredWinners = state.winners.filter(winner => {
    const matchesSearch = 
      winner.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      winner.prizeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      winner.ticketName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProgram = filterProgramId === "all" || winner.programId === filterProgramId;
    const matchesPrize = filterPrizeName === "all" || winner.prizeName === filterPrizeName;
    
    return matchesSearch && matchesProgram && matchesPrize;
  });

  const exportToExcel = () => {
    if (state.winners.length === 0) return;

    const data = state.winners.map(w => ({
      "Thời gian": formatDate(w.drawTime),
      "Chương trình": w.programName,
      "Giải thưởng": w.prizeName,
      "Tên người trúng": w.ticketName || "-",
      "Mã nhân viên": w.employeeId || "-",
      "UPI": w.upi || "-",
      "Phòng ban": w.department || "-",
      "Mã số phiếu (ID)": w.ticketId,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Winners");
    
    // Auto-size columns
    const wscols = [
      {wch: 20}, {wch: 25}, {wch: 25}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `LuckyDraw_Winners_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const deleteRecord = async (id: string) => {
    if(!confirm("Xóa lịch sử trúng giải này? Phiếu sẽ được quay lại pool nếu chưa hết giới hạn.")) return;
    
    const record = state.winners.find(w => w.id === id);
    if (!record) return;

    try {
      await supabaseService.revokeWinner(id);
      
      const program = state.programs.find(p => p.id === record.programId);
      if (program) {
        const prize = program.prizes.find(pr => pr.id === record.prizeId);
        if (prize) {
          await supabaseService.updatePrizeRemaining(prize.id, prize.remaining + 1);
        }
      }
    } catch (err) {
      console.error('Error deleting winner record:', err);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="relative flex-1 w-full max-w-lg">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder="Search by ID, prize or name..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={exportToExcel}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
              disabled={state.winners.length === 0}
            >
              <Download size={20} /> Export Excel
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
              <Filter size={16} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filters:</span>
           </div>
           
           <select 
             value={filterProgramId}
             onChange={(e) => setFilterProgramId(e.target.value)}
             className="px-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
           >
              <option value="all">All Programs</option>
              {state.programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
           </select>

           <select 
             value={filterPrizeName}
             onChange={(e) => setFilterPrizeName(e.target.value)}
             className="px-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
           >
              <option value="all">All Prize Categories</option>
              {uniquePrizes.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
           </select>

           {(filterProgramId !== "all" || filterPrizeName !== "all" || searchTerm !== "") && (
             <button 
               onClick={() => {
                 setFilterProgramId("all");
                 setFilterPrizeName("all");
                 setSearchTerm("");
               }}
               className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 underline"
             >
               Clear Filters
             </button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Program</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Prize / Reward</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">The Winner</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Lucky ID</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWinners.length > 0 ? filteredWinners.map((winner) => (
                <tr key={winner.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                         <Calendar size={14} />
                      </div>
                      <span className="text-slate-500 font-bold text-xs">{formatDate(winner.drawTime)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                      {winner.programName}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 p-1">
                        <img src={winner.prizeImage} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                      </div>
                      <span className="font-black text-sm uppercase tracking-tight text-slate-800">{winner.prizeName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white shadow-sm ring-1 ring-slate-100">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900">{winner.ticketName || "Anonymous"}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{winner.department || "No Department"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="px-4 py-2 bg-slate-900 text-white font-mono font-black text-sm rounded-xl inline-flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                      {winner.ticketId}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => deleteRecord(winner.id)}
                      className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                     <div className="max-w-xs mx-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                           <Trophy className="text-slate-200" size={40} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Awaiting Winners...</p>
                        <p className="text-xs text-slate-300 mt-2 font-medium">Start a draw to see the hall of fame here.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
