/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, Prize, DrawProgram, Winner, RuleConfig } from "../types";

export function getEligibleTickets(
  program: DrawProgram,
  winners: Winner[],
  prize: Prize
): Ticket[] {
  const { rules } = program;
  
  return program.ticketPool.filter((ticket) => {
    // Rule 1: Max wins per ticket
    const ticketWins = winners.filter(w => w.ticketId === ticket.id && w.programId === program.id);
    if (ticketWins.length >= rules.maxWinsPerTicket) return false;

    // Rule 2: Max wins per person
    const empId = ticket.employeeId && ticket.employeeId !== "-" ? ticket.employeeId : null;
    const upi = ticket.upi && ticket.upi !== "-" ? ticket.upi : null;
    const name = ticket.name && ticket.name !== "-" ? ticket.name : null;

    if (empId || upi || name) {
      const personWins = winners.filter(w => 
        w.programId === program.id && 
        ((empId && w.employeeId === empId) || 
         (upi && w.upi === upi) || 
         (name && w.ticketName === name))
      );
      if (personWins.length >= rules.maxWinsPerPerson) return false;
      
      // Rule 4: Anti-duplicate prize type
      if (rules.preventDuplicatePrizeType) {
        const hasSamePrize = personWins.some(w => w.prizeId === prize.id);
        if (hasSamePrize) return false;
      }
    }

    return true;
  });
}

export function pickWinner(
  program: DrawProgram,
  winners: Winner[],
  prize: Prize
): Ticket | null {
  const eligible = getEligibleTickets(program, winners, prize);
  if (eligible.length === 0) return null;

  // Rule 5: Fairness (Secure random)
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
