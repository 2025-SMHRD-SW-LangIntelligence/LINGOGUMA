import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type ScenarioState = {
  currentScenarioId: string | null;
  setCurrentScenarioId: (id: string | null) => void;
  clear: () => void;
};

export const useScenario = create<ScenarioState>()(
  persist(
    (set, get) => ({
      currentScenarioId: null,
      setCurrentScenarioId: (id) => {
        // ✅ 동일 값이면 업데이트하지 않음 → 리렌더/루프 방지
        if (get().currentScenarioId === id) return;
        set({ currentScenarioId: id });
      },
      clear: () => set({ currentScenarioId: null }),
    }),
    {
      name: "current-scenario",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
