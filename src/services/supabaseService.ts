
import { getSupabase } from '../lib/supabase';
import { DrawProgram, Prize, Winner, Ticket, RuleConfig } from '../types';
import { DEFAULT_RULES } from '../constants';

const mapProgram = (p: any): DrawProgram => ({
  ...p,
  id: p.id,
  name: p.name,
  description: p.description || '',
  thumbnail: p.thumbnail || '',
  createdAt: new Date(p.created_at).getTime(),
  rules: p.rules || DEFAULT_RULES,
  ticketPool: [], // Loaded separately or in join
  prizes: p.prizes?.map(mapPrize) || [],
  isActive: p.is_active ?? true,
  month: p.month,
  year: p.year
});

const mapPrize = (pr: any): Prize => ({
  id: pr.id,
  name: pr.name,
  quantity: pr.quantity || 0,
  remaining: pr.remaining ?? pr.quantity ?? 0,
  priority: pr.priority || 0,
  isActive: pr.is_active ?? true,
  image: pr.image || '',
  value: pr.value || 0
});

const mapParticipant = (p: any): Ticket => ({
  ...p,
  id: p.id,
  name: p.name,
  channel: p.channel,
  upi: p.upi,
  location: p.location,
  region: p.region,
  lineManager: p.line_manager,
  employeeId: p.employee_id,
  department: p.department,
});

const mapWinner = (w: any): Winner => ({
  id: w.id,
  drawTime: new Date(w.created_at).getTime(),
  programId: w.program_id,
  programName: w.program_name || '', 
  prizeId: w.prize_id,
  prizeName: w.prizes?.name || 'Unknown Prize',
  prizeImage: w.prizes?.image,
  ticketId: w.participant_id,
  ticketName: w.participants?.name,
  department: w.participants?.department,
  employeeId: w.participants?.employee_id,
  upi: w.participants?.upi,
});

export const supabaseService = {
  // Programs
  async getPrograms(): Promise<DrawProgram[]> {
    const { data: programs, error } = await getSupabase()
      .from('programs')
      .select(`
        *,
        prizes (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return programs.map(mapProgram);
  },

  async createProgram(name: string, details?: Partial<DrawProgram>) {
    const { data, error } = await getSupabase()
      .from('programs')
      .insert({ 
        name,
        description: details?.description || '',
        thumbnail: details?.thumbnail || '',
        rules: details?.rules || DEFAULT_RULES,
        month: details?.month || new Date().getMonth() + 1,
        year: details?.year || new Date().getFullYear(),
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return mapProgram(data);
  },

  async updateProgram(id: string, updates: Partial<DrawProgram>) {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.thumbnail !== undefined) payload.thumbnail = updates.thumbnail;
    if (updates.rules !== undefined) payload.rules = updates.rules;
    if (updates.month !== undefined) payload.month = updates.month;
    if (updates.year !== undefined) payload.year = updates.year;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { data, error } = await getSupabase()
      .from('programs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapProgram(data);
  },

  async deleteProgram(id: string) {
    const { error } = await getSupabase().from('programs').delete().eq('id', id);
    if (error) throw error;
  },

  async updateProgramRules(programId: string, rules: RuleConfig) {
    const { error } = await getSupabase()
      .from('programs')
      .update({ rules: rules })
      .eq('id', programId);

    if (error) throw error;
  },

  // Participants
  async getParticipants(programId: string): Promise<Ticket[]> {
    const { data, error } = await getSupabase()
      .from('participants')
      .select('*')
      .eq('program_id', programId)
      .limit(10000); // Increased limit for large events

    if (error) throw error;
    return data.map(mapParticipant);
  },

  async uploadParticipants(programId: string, participants: Ticket[]): Promise<void> {
    const records = participants.map(p => ({
      program_id: programId,
      name: p.name || 'Unknown',
      channel: p.channel || '',
      upi: p.upi || '',
      location: p.location || '',
      region: p.region || '',
      line_manager: p.lineManager || '',
      department: p.department || '',
      employee_id: p.employeeId || '',
    }));

    const { error } = await getSupabase()
      .from('participants')
      .insert(records);

    if (error) throw error;
  },

  // Prizes
  async createPrize(programId: string, prize: Partial<Prize>) {
    const { error } = await getSupabase().from('prizes').insert({
      program_id: programId,
      name: prize.name || 'New Prize',
      quantity: prize.quantity || 1,
      remaining: prize.remaining ?? prize.quantity ?? 1,
      priority: prize.priority || 0,
      is_active: prize.isActive ?? true,
      image: prize.image || '',
      value: prize.value || 0
    });
    if (error) throw error;
  },

  async updatePrize(prizeId: string, updates: Partial<Prize>) {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.remaining !== undefined) payload.remaining = updates.remaining;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.value !== undefined) payload.value = updates.value;

    const { error } = await getSupabase()
      .from('prizes')
      .update(payload)
      .eq('id', prizeId);

    if (error) throw error;
  },

  async deletePrize(prizeId: string) {
    const { error } = await getSupabase().from('prizes').delete().eq('id', prizeId);
    if (error) throw error;
  },

  async updatePrizeRemaining(prizeId: string, remaining: number): Promise<void> {
    const { error } = await getSupabase()
      .from('prizes')
      .update({ remaining })
      .eq('id', prizeId);

    if (error) throw error;
  },

  // Winners
  async getAllWinners(): Promise<Winner[]> {
    const { data, error } = await getSupabase()
      .from('winners')
      .select(`
        *,
        participants (*),
        prizes (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapWinner);
  },

  async recordWinner(programId: string, participantId: string, prizeId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('winners')
      .insert({
        program_id: programId,
        participant_id: participantId,
        prize_id: prizeId
      });

    if (error) throw error;
  },
  
  async revokeWinner(winnerId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('winners')
      .delete()
      .eq('id', winnerId);
      
    if (error) throw error;
  },

  async getWinners(programId: string): Promise<Winner[]> {
    const { data, error } = await getSupabase()
      .from('winners')
      .select(`
        *,
        participants (*),
        prizes (*)
      `)
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any[]).map(mapWinner);
  },

  async resetProgramWinners(programId: string) {
    const { error: winnerError } = await getSupabase()
      .from('winners')
      .delete()
      .eq('program_id', programId);
    
    if (winnerError) throw winnerError;

    // Reset remaining counts for all prizes in this program
    const { error: prizeError } = await getSupabase()
      .rpc('reset_prizes_remaining', { prog_id: programId });
    
    if (prizeError) {
       // Workaround if RPC is not defined
       const { data: prizes } = await getSupabase().from('prizes').select('id, quantity').eq('program_id', programId);
       if (prizes) {
         for (const p of prizes) {
           await getSupabase().from('prizes').update({ remaining: p.quantity }).eq('id', p.id);
         }
       }
    }
  }
};
