/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum DrawStatus {
  READY = 'READY',
  DRAWING = 'DRAWING',
  RESULT = 'RESULT'
}

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
  upi?: string;
  location?: string;
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
  config?: Record<string, any>;
}

export interface RuleConfig {
  maxWinsPerTicket: number;
  maxWinsPerPerson: number;
  preventDuplicatePrizeType: boolean;
  fairnessRandom: boolean;
  isActive?: boolean;
  bannerFit?: 'cover' | 'contain';
  bannerHeight?: number;
  bannerPosition?: number;
  theatreBadge?: string;
  theatreSubtitle?: string;
  bgmUrl?: string;
  bgmVolume?: number;
  bgmEnabled?: boolean;
  month?: number;
  year?: number;
  description?: string;
  thumbnail?: string;
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
  upi?: string;
  location?: string;
  prizeRemainingAtDraw?: number;
}

export interface AppSettings {
  currency: string;
  maxWinnersPerDraw?: number;
}

export interface AppState {
  programs: DrawProgram[];
  winners: Winner[];
  activeProgramId: string | null;
  settings: AppSettings;
}
