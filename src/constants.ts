/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, Prize, Ticket } from "./types";

export const STORAGE_KEY = "LUCKY_DRAW_PRO_DATA";

export const INITIAL_PRIZES: Prize[] = [
  {
    id: "p1",
    name: "Giải Đặc Biệt - iPhone 15 Pro Max",
    image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&h=400&fit=crop",
    quantity: 1,
    remaining: 1,
    priority: 1,
    isActive: true,
  },
  {
    id: "p2",
    name: "Giải Nhất - MacBook Air M2",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=400&fit=crop",
    quantity: 2,
    remaining: 2,
    priority: 2,
    isActive: true,
  },
  {
    id: "p3",
    name: "Giải Nhì - Apple Watch Series 9",
    image: "https://images.unsplash.com/photo-1544117518-2b041580c797?w=400&h=400&fit=crop",
    quantity: 5,
    remaining: 5,
    priority: 3,
    isActive: true,
  },
];

export const DEMO_TICKETS: Ticket[] = Array.from({ length: 50 }, (_, i) => ({
  id: `T-${1000 + i}`,
  name: `Nhân viên ${i + 1}`,
  employeeId: `EMP${100 + i}`,
  department: i % 3 === 0 ? "Kinh doanh" : i % 3 === 1 ? "Kỹ thuật" : "Nhân sự",
  email: `user${i + 1}@example.com`,
}));

export const DEFAULT_RULES = {
  maxWinsPerTicket: 1,
  maxWinsPerPerson: 1,
  preventDuplicatePrizeType: true,
  fairnessRandom: true,
};

export const INITIAL_STATE: AppState = {
  programs: [
    {
      id: "prog-demo",
      name: "Tất Niên 2024 - Demo",
      description: "Chương trình quay số demo cuối năm",
      createdAt: Date.now(),
      prizes: INITIAL_PRIZES,
      rules: DEFAULT_RULES,
      ticketPool: DEMO_TICKETS,
      isActive: true,
    },
  ],
  winners: [],
  activeProgramId: "prog-demo",
};

export function loadState(): AppState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored state", e);
    }
  }
  return INITIAL_STATE;
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
