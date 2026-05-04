import { Ticket, Winner, Prize } from '../types';

/**
 * Lọc danh sách những người chưa trúng giải trong chương trình hiện tại
 */
export const getEligibleParticipants = (
  participants: Ticket[],
  winners: Winner[],
  programId: string
): Ticket[] => {
  const winnerIds = new Set(
    winners
      .filter(w => w.programId === programId)
      .map(w => w.participantId)
  );
  
  return participants.filter(p => !winnerIds.has(p.id));
};

/**
 * Logic chọn người trúng ngẫu nhiên
 */
export const pickRandomWinner = (eligiblePool: Ticket[]): Ticket | null => {
  if (eligiblePool.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * eligiblePool.length);
  return eligiblePool[randomIndex];
};

/**
 * Làm sạch dữ liệu đầu vào
 */
export const cleanParticipantData = (data: any[]): any[] => {
  const seen = new Set<string>();
  return data
    .map(val => ({
      ...val,
      name: String(val.name || '').trim(),
      id: String(val.id || '').trim()
    }))
    .filter(val => {
      const uniqueKey = `${val.id.toLowerCase()}`;
      if (!val.id || seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    });
};
