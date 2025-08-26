import { create } from "zustand";

type MemoState = {
  text: string;
  setText: (t: string) => void;
  clear: () => void;
};

export const useMemoStore = create<MemoState>((set) => ({
  text: "",
  setText: (t) => set({ text: t }),
  clear: () => set({ text: "" }),
}));
