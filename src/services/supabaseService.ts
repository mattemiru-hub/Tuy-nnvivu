
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
  year: p.year,
  bgmUrl: p.bgm_url || '',
  bgmVolume: p.bgm_volume ?? 0.5,
  bgmEnabled: p.bgm_enabled ?? true
});

const mapPrize = (pr: any): Prize => ({
  id: pr.id,
  program_id: pr.program_id,
  name: pr.name,
  quantity: pr.quantity || 0,
  remaining: pr.remaining ?? pr.quantity ?? 0,
  priority: pr.priority || 0,
  image: pr.image || '',
  value: pr.value || 0,
  isActive: pr.is_active ?? true
});

const mapParticipant = (p: any): Ticket => ({
  id: p.id,
  program_id: p.program_id,
  name: p.name,
  phone: p.phone || '',
  ticket_number: p.ticket_number || '',
  channel: p.channel || '',
  upi: p.upi || '',
  location: p.location || '',
  region: p.region || '',
  line_manager: p.line_manager || '',
  created_at: p.created_at || new Date().toISOString()
});

const mapWinner = (w: any): Winner => ({
  id: w.id,
  participant_id: w.participant_id,
  program_id: w.program_id,
  prize_id: w.prize_id,
  created_at: w.created_at,
  participant: w.participants ? mapParticipant(w.participants) : undefined,
  prize: w.prizes ? mapPrize(w.prizes) : undefined
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
    const supabase = getSupabase();
    let { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) {
      console.warn('Authentication missing when creating program');
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này. Vui lòng tải lại trang.');
    }

    const { data, error } = await supabase
      .from('programs')
      .insert({ 
        user_id: user.id,
        name,
        description: details?.description || '',
        thumbnail: details?.thumbnail || '',
        rules: details?.rules || DEFAULT_RULES,
        month: details?.month || new Date().getMonth() + 1,
        year: details?.year || new Date().getFullYear(),
        bgm_url: details?.bgmUrl || '',
        bgm_volume: details?.bgmVolume ?? 0.5,
        bgm_enabled: details?.bgmEnabled ?? true,
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
    if (updates.bgmUrl !== undefined) payload.bgm_url = updates.bgmUrl;
    if (updates.bgmVolume !== undefined) payload.bgm_volume = updates.bgmVolume;
    if (updates.bgmEnabled !== undefined) payload.bgm_enabled = updates.bgmEnabled;
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

  async getPrizes(programId: string): Promise<Prize[]> {
    const { data, error } = await getSupabase()
      .from('prizes')
      .select('*')
      .eq('program_id', programId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data.map(mapPrize);
  },

  async uploadParticipants(programId: string, participants: Ticket[]): Promise<void> {
    const supabase = getSupabase();
    let { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) throw new Error('Bạn cần đăng nhập để tải dữ liệu lên. Vui lòng tải lại trang.');

    const records = participants.map(p => ({
      program_id: programId,
      user_id: user?.id,
      name: p.name || 'Unknown',
      phone: p.phone || '',
      ticket_number: p.ticket_number || '',
      channel: p.channel || '',
      upi: p.upi || '',
      location: p.location || '',
      region: p.region || '',
      line_manager: p.line_manager || '',
    }));

    // Split records into chunks of 500 to avoid request size limits
    const CHUNK_SIZE = 500;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('participants')
        .insert(chunk);
      
      if (error) throw error;
    }
  },

  // Prizes
  async createPrize(programId: string, prize: Partial<Prize>) {
    const supabase = getSupabase();
    let { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) throw new Error('Bạn cần đăng nhập để tạo giải thưởng.');

    const { error } = await supabase.from('prizes').insert({
      program_id: programId,
      user_id: user?.id,
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

  async confirmWinner(participantId: string, programId: string, prizeId: string, currentRemaining: number) {
    const supabase = getSupabase();
    let { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) throw new Error('Bạn cần đăng nhập để xác nhận người thắng cuộc.');

    // 1. Insert Winner
    const { error: winnerError } = await supabase
      .from('winners')
      .insert({
        participant_id: participantId,
        program_id: programId,
        prize_id: prizeId,
        user_id: user?.id
      });
    if (winnerError) throw winnerError;

    // 2. Update Prize Remaining
    const { error: prizeError } = await supabase
      .from('prizes')
      .update({ remaining: Math.max(0, currentRemaining - 1) })
      .eq('id', prizeId);
    if (prizeError) throw prizeError;
  },

  async recordWinner(programId: string, participantId: string, prizeId: string): Promise<void> {
    const supabase = getSupabase();
    let { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) throw new Error('Bạn cần đăng nhập để lưu người thắng cuộc.');

    const { error } = await supabase
      .from('winners')
      .insert({
        program_id: programId,
        participant_id: participantId,
        prize_id: prizeId,
        user_id: user?.id
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
  },

  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const supabase = getSupabase();
    
    // Attempt to ensure bucket exists, but check specifically for the upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error(`Chưa tìm thấy thư mục lưu trữ '${bucket}'. Vui lòng vào Supabase Dashboard -> Storage -> Tạo Bucket mới tên là '${bucket}' và để chế độ Public.`);
      }
      if (error.message.includes('exceeded the maximum allowed size')) {
        throw new Error(`File quá lớn. Giới hạn tối đa của hệ thống hiện tại có thể thấp hơn file bạn chọn. Vui lòng thử file nhỏ hơn hoặc kiểm tra cấu hình Bucket trong Supabase.`);
      }
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  }
};
