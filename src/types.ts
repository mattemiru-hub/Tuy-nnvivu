/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Ticket {
  id: string; // "Phiếu"
  name?: string;
  department?: string;
  email?: string;
  employeeId?: string;
  position?: string;
  channel?: string;
  lineManager?: string;
  region?: string;
  [key: string]: any;
}

export interface Prize {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  remaining: number;
  priority: number;
  isActive: boolean;
  value: number;
}

export interface RuleConfig {
  maxWinsPerTicket: number;
  maxWinsPerPerson: number;
  preventDuplicatePrizeType: boolean;
  fairnessRandom: boolean;
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
  month?: number;
  year?: number;
}

export interface Winner {
  id: string;
  drawTime: number;
  programId: string;
  programName: string;
  prizeId: string;
  prizeName: string;
  prizeImage?: string;
  ticketId: string;
  ticketName?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  channel?: string;
  lineManager?: string;
  region?: string;
  prizeRemainingAtDraw?: number;
}

export interface AppSettings {
  currency: string;
}

export interface AppState {
  programs: DrawProgram[];
  winners: Winner[];
  activeProgramId: string | null;
  settings: AppSettings;
}
