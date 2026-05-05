/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, Prize, DrawProgram, Winner, RuleConfig } from "../types";

export function getEligibleTickets(
  participants: Ticket[],
  winners: Winner[]
): Ticket[] {
  const winnerIds = new Set(winners.map(w => w.participant_id));
  return participants.filter(p => !winnerIds.has(p.id));
}

export function pickWinner(
  participants: Ticket[],
  winners: Winner[]
): Ticket | null {
  const eligible = getEligibleTickets(participants, winners);
  if (eligible.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * eligible.length);
  return eligible[randomIndex];
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
