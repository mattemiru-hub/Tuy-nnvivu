/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Ticket {
  id: string;
  program_id: string;
  name: string;
  phone?: string;
  ticket_number?: string;
  channel?: string;
  upi?: string;
  location?: string;
  region?: string;
  line_manager?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  category?: string;
  created_at: string;
}

export interface Prize {
  id: string;
  program_id: string;
  name: string;
  quantity: number;
  remaining: number;
  priority?: number;
  image?: string;
  value?: number;
  isActive?: boolean;
  category?: string;
}

export interface RuleConfig {
  maxWinsPerTicket: number;
  maxWinsPerPerson: number;
  preventDuplicatePrizeType: boolean;
  fairnessRandom: boolean;
  enablePriorityOneUpgrade?: boolean;
  revocablePriorities?: number[];
}

export interface DrawProgram {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  createdAt: number;
  prizes: Prize[];
  rules: RuleConfig;
  ticketPool: Ticket[];
  isActive: boolean;
  bannerFit?: 'cover' | 'contain';
  bannerHeight?: number;
  bannerPosition?: number;
  theatreBadge?: string;
  theatreSubtitle?: string;
  bgmUrl?: string;
  bgmVolume?: number;
  bgmEnabled?: boolean;
  categories?: string;
  month?: number;
  year?: number;
}

export interface Winner {
  id: string;
  participant_id: string;
  program_id: string;
  prize_id: string;
  created_at: string;
  participant?: Ticket;
  prize?: Prize;
}

export interface AppSettings {
  currency: string;
  maxWinnersPerDraw?: number;
}

export interface AppState {
  programs: DrawProgram[];
  activeProgramId: string | null;
  participants: Ticket[];
  prizes: Prize[];
  winners: Winner[];
  settings: AppSettings;
  isLoading: boolean;
}
