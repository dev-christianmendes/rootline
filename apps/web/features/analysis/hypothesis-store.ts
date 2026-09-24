"use client";

import { create } from "zustand";

import type { HypothesisStatus } from "@rootline/types";

interface HypothesisState {
  statuses: Record<string, HypothesisStatus>;
  setStatus: (id: string, status: HypothesisStatus) => void;
}

export const useHypothesisStore = create<HypothesisState>((set) => ({
  statuses: {},
  setStatus: (id, status) =>
    set((state) => ({ statuses: { ...state.statuses, [id]: status } })),
}));