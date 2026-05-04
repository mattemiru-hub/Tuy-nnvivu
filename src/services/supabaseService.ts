
import { supabase } from '../lib/supabase';
import { DrawProgram, Prize, Winner, Ticket, RuleConfig } from '../types';
import { DEFAULT_RULES } from '../constants';

const mapProgram = (p: any): DrawProgram | null => {
  if (!p) return null;
  // Use rules if available, fallback to config for older schemas
  const rawRules = p.rules || p.config || DEFAULT_RULES;
  
  // Ensure we have a valid object
  const rules = typeof rawRules === 'string' ? JSON.parse(rawRules) : (rawRules || DEFAULT_RULES);

  return {
    ...p,
    ...(rules || {}), // Spread rules for UI config (bannerFit, etc.)
    id: p.id,
    name: p.name,
    description: rules?.description || p.description || '',
    thumbnail: rules?.thumbnail || p.thumbnail || '',
    createdAt: new Date(p.created_at || Date.now()).getTime(),
    rules: rules,
    ticketPool: [], 
    prizes: p.prizes?.map((pr: any) => mapPrize(pr, rules)) || [],
    isActive: rules?.isActive ?? p.is_active ?? true,
    month: rules?.month || p.month,
    year: rules?.year || p.year
  };
};

const mapPrize = (pr: any, programRules?: any): Prize => {
  // Extract metadata from program rules if stored there for schema resilience
  const metadata = programRules?.prizeMetadata?.[pr.id] || {};
  return {
    id: pr.id,
    name: pr.name,
    quantity: metadata.quantity ?? pr.quantity ?? 1,
    remaining: metadata.remaining ?? pr.remaining ?? (metadata.quantity ?? pr.quantity ?? 1),
    priority: metadata.priority ?? pr.priority ?? 0,
    isActive: metadata.isActive ?? pr.is_active ?? true,
    image: pr.image,
    value: pr.value
  };
};

const mapParticipant = (p: any): Ticket => ({
  ...p,
  id: p.id,
  employeeId: p.employee_id,
  lineManager: p.line_manager,
});

const mapWinner = (w: any): Winner => ({
  id: w.id,
  drawTime: new Date(w.created_at || Date.now()).getTime(),
  programId: w.program_id,
  programName: w.programs?.name || w.program_name || '', 
  prizeId: w.prize_id,
  prizeName: w.prize_name || w.prizes?.name || 'Unknown Prize',
  prizeImage: w.prize_image || w.prizes?.image,
  ticketId: w.participant_id,
  ticketName: w.participant_name || w.participants?.name || 'Unknown',
  channel: w.participants?.channel,
  upi: w.participants?.upi,
  location: w.participants?.location,
  region: w.participants?.region,
  lineManager: w.participants?.line_manager,
  department: w.department || w.participants?.department,
  position: w.participants?.position,
  employeeId: w.employee_id || w.participants?.employee_id
});

export const supabaseService = {
  // Programs
  async getPrograms(): Promise<DrawProgram[]> {
    const { data: programs, error } = await supabase
      .from('programs')
      .select(`
        *,
        prizes (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return programs.map(mapProgram).filter((p): p is DrawProgram => p !== null);
  },

  async getProgramById(id: string): Promise<DrawProgram | null> {
    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        prizes (*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return mapProgram(data);
  },

  async createProgram(name: string, details?: Partial<DrawProgram>) {
    const rules = {
      ...(details?.rules || DEFAULT_RULES),
      month: details?.month,
      year: details?.year,
      isActive: details?.isActive ?? true,
      description: details?.description,
      thumbnail: details?.thumbnail
    };

    const insertData: any = { 
      name,
      rules: rules
    };

    const { data, error } = await supabase
      .from('programs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase createProgram error:", error);
      throw error;
    }
    const mapped = mapProgram(data);
    if (!mapped) throw new Error("Mapped program is null");
    return mapped;
  },

  async updateProgram(id: string, updates: Partial<DrawProgram>) {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    
    // Always sync optional metadata into the rules JSON for schema resilience
    const currentProgram = await this.getProgramById(id);
    const currentRules = currentProgram?.rules || DEFAULT_RULES;
    
    payload.rules = {
      ...currentRules,
      ...(updates.rules || {}),
      isActive: updates.isActive !== undefined ? updates.isActive : currentRules.isActive,
      description: updates.description !== undefined ? updates.description : currentRules.description,
      thumbnail: updates.thumbnail !== undefined ? updates.thumbnail : currentRules.thumbnail,
      month: updates.month !== undefined ? updates.month : currentRules.month,
      year: updates.year !== undefined ? updates.year : currentRules.year
    };

    const { data, error } = await supabase
      .from('programs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const mapped = mapProgram(data);
    if (!mapped) throw new Error("Mapped program is null");
    return mapped;
  },

  async deleteProgram(id: string) {
    const { error } = await supabase.from('programs').delete().eq('id', id);
    if (error) throw error;
  },

  async updateProgramRules(programId: string, rules: RuleConfig) {
    const { error } = await supabase
      .from('programs')
      .update({ rules: rules })
      .eq('id', programId);

    if (error) throw error;
  },

  // Participants
  async getParticipants(programId: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('program_id', programId);

    if (error) throw error;
    return data.map(mapParticipant);
  },

  async uploadParticipants(programId: string, participants: Ticket[]): Promise<void> {
    const records = participants.map(p => ({
      program_id: programId,
      name: p.name || 'Unknown',
      channel: p.channel,
      upi: p.upi,
      location: p.location,
      region: p.region,
      line_manager: p.lineManager,
      department: p.department,
      position: p.position,
      employee_id: p.employeeId
    }));

    const { error } = await supabase
      .from('participants')
      .insert(records);

    if (error) throw error;
  },

  // Prizes
  async createPrize(programId: string, prize: Partial<Prize>) {
    // 1. Create base record with only guaranteed core columns to avoid PGRST204
    const payload: any = {
      program_id: programId,
      name: prize.name || 'Prize'
    };

    // Try adding other columns but be ready to fail
    const optionalColumns = ['quantity', 'remaining', 'image', 'value'];
    optionalColumns.forEach(col => {
      if ((prize as any)[col] !== undefined) payload[col] = (prize as any)[col];
    });

    let newPrizeId = '';
    try {
      const { data, error } = await supabase.from('prizes').insert(payload).select('id').single();
      if (error) {
        if (error.code === 'PGRST204') {
          // Fallback to essential columns only
          const fallback = await supabase.from('prizes').insert({
            program_id: programId,
            name: prize.name || 'Prize'
          }).select('id').single();
          if (fallback.error) throw fallback.error;
          newPrizeId = fallback.data.id;
        } else {
          throw error;
        }
      } else {
        newPrizeId = data.id;
      }
    } catch (err) {
      console.error("Critical prize creation failure:", err);
      throw err;
    }

    // 2. Save ALL state (quantity, remaining, priority, isActive) into program rules for resilience
    if (newPrizeId) {
      await this.updatePrizeMetadata(programId, newPrizeId, {
        quantity: prize.quantity ?? 1,
        remaining: prize.remaining ?? (prize.quantity ?? 1),
        priority: prize.priority ?? 0,
        isActive: prize.isActive ?? true
      });
    }
  },

  async updatePrize(prizeId: string, updates: Partial<Prize>) {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.remaining !== undefined) payload.remaining = updates.remaining;
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.value !== undefined) payload.value = updates.value;

    // Try updating physical columns, ignore missing column errors
    const { error } = await supabase
      .from('prizes')
      .update(payload)
      .eq('id', prizeId);

    if (error && error.code !== 'PGRST204') throw error;

    // Also update metadata in program rules (Master Backup)
    const { data: prize } = await supabase.from('prizes').select('program_id').eq('id', prizeId).single();
    if (prize?.program_id) {
      const metadataUpdates: any = {};
      if (updates.quantity !== undefined) metadataUpdates.quantity = updates.quantity;
      if (updates.remaining !== undefined) metadataUpdates.remaining = updates.remaining;
      if (updates.priority !== undefined) metadataUpdates.priority = updates.priority;
      if (updates.isActive !== undefined) metadataUpdates.isActive = updates.isActive;
      
      if (Object.keys(metadataUpdates).length > 0) {
        await this.updatePrizeMetadata(prize.program_id, prizeId, metadataUpdates);
      }
    }
  },

  async updatePrizeMetadata(programId: string, prizeId: string, metadata: any) {
    const program = await this.getProgramById(programId);
    if (!program) return;
    
    const newRules = {
      ...(program.rules || {}),
      prizeMetadata: {
        ...(program.rules?.prizeMetadata || {}),
        [prizeId]: {
          ...(program.rules?.prizeMetadata?.[prizeId] || {}),
          ...metadata
        }
      }
    };

    await supabase.from('programs').update({ rules: newRules }).eq('id', programId);
  },

  async deletePrize(prizeId: string) {
    const { error } = await supabase.from('prizes').delete().eq('id', prizeId);
    if (error) throw error;
  },

  async updatePrizeRemaining(prizeId: string, remaining: number): Promise<void> {
    const { data: prize, error: fetchError } = await supabase.from('prizes').select('program_id').eq('id', prizeId).single();
    
    if (fetchError) throw fetchError;

    // Update physical column (resiliently)
    const { error } = await supabase
      .from('prizes')
      .update({ remaining })
      .eq('id', prizeId);

    // Update metadata backup
    if (prize?.program_id) {
      await this.updatePrizeMetadata(prize.program_id, prizeId, { remaining });
    }
    
    if (error && error.code !== 'PGRST204') throw error;
  },

  // Winners
  async getAllWinners(): Promise<Winner[]> {
    const { data, error } = await supabase
      .from('winners')
      .select(`
        *,
        participants (*),
        prizes (*),
        programs (name)
      `);

    if (error) throw error;
    return data.map(mapWinner);
  },

  async getWinnersByProgram(programId: string): Promise<Winner[]> {
    const { data, error } = await supabase
      .from('winners')
      .select(`
        *,
        participants (*),
        prizes (*),
        programs (name)
      `)
      .eq('program_id', programId);

    if (error) throw error;
    return data.map(mapWinner);
  },

  async recordWinner(programId: string, participant: Ticket, prize: Prize): Promise<void> {
    // Try exhaustive insert first, but be prepared for missing columns
    const payload: any = {
      program_id: programId,
      participant_id: participant.id,
      prize_id: prize.id,
      prize_name: prize.name,
      prize_image: prize.image,
      participant_name: participant.name,
      employee_id: participant.employeeId,
      department: participant.department
    };

    try {
      const { error } = await supabase.from('winners').insert(payload);
      if (error) {
        // If specific columns missing (PGRST204), fallback to basic insert
        if (error.code === 'PGRST204' || error.code === '42703') {
           const basicPayload = {
             program_id: programId,
             participant_id: participant.id,
             prize_id: prize.id
           };
           await supabase.from('winners').insert(basicPayload);
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.error("Winner recording fallback failed:", err);
      // Last ditch effort: basic columns
      await supabase.from('winners').insert({
        program_id: programId,
        participant_id: participant.id,
        prize_id: prize.id
      });
    }
  },
  
  async revokeWinner(winnerId: string): Promise<void> {
    const { error } = await supabase
      .from('winners')
      .delete()
      .eq('id', winnerId);
      
    if (error) throw error;
  },

  async resetProgramWinners(programId: string) {
    const { error: winnerError } = await supabase
      .from('winners')
      .delete()
      .eq('program_id', programId);
    
    if (winnerError) throw winnerError;

    // Reset remaining counts for all prizes in this program
    const { data: prizes } = await supabase.from('prizes').select('id, quantity').eq('program_id', programId);
    if (prizes) {
      const program = await this.getProgramById(programId);
      const rulesMetadata = program?.rules?.prizeMetadata || {};
      
      for (const p of prizes) {
        const metadata = rulesMetadata[p.id] || {};
        const quantity = metadata.quantity ?? p.quantity ?? 1;
        
        // Update physical and metadata
        await this.updatePrizeRemaining(p.id, quantity);
      }
    }
  }
};
