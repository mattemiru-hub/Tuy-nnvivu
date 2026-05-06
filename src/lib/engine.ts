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

  // 0. Filter by Prize Category (Object)
  // If targetPrize has a category, only include participants with the matching category.
  // If no category is set for prize, everyone is included.
  let pool = participants;
  if (targetPrize.category && targetPrize.category.trim() !== '') {
    const targetCat = targetPrize.category.trim().toLowerCase();
    pool = participants.filter(p => p.category && p.category.trim().toLowerCase() === targetCat);
  }

  return pool.filter(p => {
    // 1. Check maxWinsPerTicket
    const ticketWins = programWinners.filter(w => w.participant_id === p.id).length;
    if (ticketWins >= (rules.maxWinsPerTicket || 1)) return false;

    // 2. Check maxWinsPerPerson
    // We identify a person by UPI first, then phone, employee_id, or name
    const personKey = p.upi || p.phone || p.employee_id || p.name;
    const personWins = programWinners.filter(w => {
      const pw = w.participant;
      if (!pw) return false;
      const pwKey = pw.upi || pw.phone || pw.employee_id || pw.name;
      return pwKey === personKey;
    });

    // Special Rule: Priority 1 Upgrade
    // If targetPrize.priority === 1 AND enablePriorityOneUpgrade is enabled,
    // we allow them to be eligible if all their existing wins are in the "revocable" list.
    if (targetPrize.priority === 1 && rules.enablePriorityOneUpgrade) {
      const hasPriorityOneWin = personWins.some(w => w.prize?.priority === 1);
      if (hasPriorityOneWin) return false;
      
      // If they have existing wins, check if all of them are revocable
      if (personWins.length > 0 && rules.revocablePriorities && rules.revocablePriorities.length > 0) {
        const hasUnrevocableWin = personWins.some(w => !rules.revocablePriorities?.includes(w.prize?.priority || 0));
        if (hasUnrevocableWin) return false;
      }
      // If they have lower priority wins that are all revocable, they ARE eligible for priority 1.
    } else {
      if (personWins.length >= (rules.maxWinsPerPerson || 1)) return false;
    }

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
