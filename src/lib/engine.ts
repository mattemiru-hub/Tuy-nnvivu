/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, Prize, DrawProgram, Winner, RuleConfig } from "../types";

export function getEligibleTickets(
  participants: Ticket[],
  allWinners: Winner[],
  program: DrawProgram,
  targetPrize: Prize
): Ticket[] {
  const rules = program.rules;
  
  // Winners for this program
  const programWinners = allWinners.filter(w => w.program_id === program.id);

  return participants.filter(p => {
    // 1. Check maxWinsPerTicket
    const ticketWins = programWinners.filter(w => w.participant_id === p.id).length;
    if (ticketWins >= (rules.maxWinsPerTicket || 1)) return false;

    // 2. Check maxWinsPerPerson
    // We identify a person by phone, employee_id, or name (in that order of priority)
    const personKey = p.phone || p.employee_id || p.name;
    const personWins = programWinners.filter(w => {
      const pw = w.participant;
      if (!pw) return false;
      const pwKey = pw.phone || pw.employee_id || pw.name;
      return pwKey === personKey;
    });

    if (personWins.length >= (rules.maxWinsPerPerson || 1)) return false;

    // 3. Check preventDuplicatePrizeType
    if (rules.preventDuplicatePrizeType) {
      const alreadyHasThisType = personWins.some(w => {
        // We consider it the same "type" if prize_id is the same OR prize name is exactly the same
        return w.prize_id === targetPrize.id || (w.prize && w.prize.name === targetPrize.name);
      });
      if (alreadyHasThisType) return false;
    }

    return true;
  });
}

export function pickWinner(
  participants: Ticket[],
  allWinners: Winner[],
  program: DrawProgram,
  targetPrize: Prize
): Ticket | null {
  const eligible = getEligibleTickets(participants, allWinners, program, targetPrize);
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
