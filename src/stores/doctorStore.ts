import { create } from 'zustand';

import type { DoctorRow } from '@/types/database';

type DoctorState = {
  doctor: DoctorRow | null;
  isLoading: boolean;
  setDoctor: (doctor: DoctorRow | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useDoctorStore = create<DoctorState>((set) => ({
  doctor: null,
  isLoading: false,
  setDoctor: (doctor) => set({ doctor }),
  setLoading: (isLoading) => set({ isLoading }),
}));
