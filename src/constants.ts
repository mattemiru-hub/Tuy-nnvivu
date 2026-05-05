/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, Prize, Ticket } from "./types";

export const STORAGE_KEY = "LUCKY_DRAW_PRO_DATA";

export const INITIAL_PRIZES: Prize[] = [];

export const DEMO_TICKETS: Ticket[] = [];

export const DEFAULT_RULES = {
  maxWinsPerTicket: 1,
  maxWinsPerPerson: 1,
  preventDuplicatePrizeType: true,
  fairnessRandom: true,
};

export const INITIAL_STATE: AppState = {
  programs: [],
  winners: [],
  activeProgramId: null,
  participants: [],
  prizes: [],
  settings: {
    currency: "VND"
  },
  isLoading: false
};

export function loadState(): AppState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const programs = (parsed.programs || INITIAL_STATE.programs).map((p: any) => ({
        ...DEFAULT_RULES,
        ...p,
        prizes: (p.prizes || []).map((prize: any) => ({
          value: 0,
          ...prize
        })),
        ticketPool: p.ticketPool || [],
      }));

      let activeProgramId = parsed.activeProgramId;
      if (programs.length > 0 && (!activeProgramId || !programs.find((p: any) => p.id === activeProgramId))) {
        activeProgramId = programs[0].id;
      }

      return {
        ...INITIAL_STATE,
        ...parsed,
        programs,
        activeProgramId,
        winners: parsed.winners || [],
        settings: parsed.settings || INITIAL_STATE.settings,
      };
    } catch (e) {
      console.error("Failed to parse stored state", e);
    }
  }
  return INITIAL_STATE;
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state to localStorage. Storage might be full.", e);
    // Optionally notify the user or handle the error gracefully
  }
}
