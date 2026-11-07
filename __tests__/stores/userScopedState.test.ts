import { beforeEach, describe, expect, it } from '@jest/globals';

import { useDoctorStore } from '@/stores/doctorStore';
import { useReportStore } from '@/stores/reportStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import {
  __resetUserScopedTracking,
  clearUserScopedState,
  syncUserScopedState,
} from '@/stores/userScopedState';

import type { DoctorRow } from '@/types/database';

function dirtyStores() {
  useReportStore.getState().setReportId('report-do-medico-a');
  useReportStore.getState().setPatientData({ patient_name: 'Paciente A' } as never);
  useDoctorStore.getState().setDoctor({ id: 'doctor-a' } as DoctorRow);
  useSubscriptionStore.getState().setStatus('active');
  useSubscriptionStore.getState().setTrialUsed(3);
}

function expectClean() {
  expect(useReportStore.getState().reportId).toBeNull();
  expect(useReportStore.getState().currentReport).toBeNull();
  expect(useDoctorStore.getState().doctor).toBeNull();
  expect(useSubscriptionStore.getState().status).toBe('trial');
  expect(useSubscriptionStore.getState().trialUsed).toBe(0);
}

describe('userScopedState', () => {
  beforeEach(() => {
    __resetUserScopedTracking();
    clearUserScopedState();
  });

  it('clearUserScopedState limpa rascunho, perfil e assinatura', () => {
    dirtyStores();
    clearUserScopedState();
    expectClean();
  });

  it('limpa no logout (usuário → null)', () => {
    syncUserScopedState('user-a');
    dirtyStores();
    syncUserScopedState(null);
    expectClean();
  });

  it('limpa quando outro usuário entra (troca de conta em aba compartilhada)', () => {
    syncUserScopedState('user-a');
    dirtyStores();
    syncUserScopedState('user-b');
    expectClean();
  });

  it('não limpa em refresh de token do mesmo usuário', () => {
    syncUserScopedState('user-a');
    dirtyStores();
    syncUserScopedState('user-a');
    expect(useReportStore.getState().reportId).toBe('report-do-medico-a');
  });

  it('não limpa no primeiro login (null → usuário)', () => {
    dirtyStores();
    syncUserScopedState('user-a');
    expect(useReportStore.getState().reportId).toBe('report-do-medico-a');
  });
});
