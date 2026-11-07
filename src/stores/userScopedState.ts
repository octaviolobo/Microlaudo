import { useDoctorStore } from './doctorStore';
import { useReportStore } from './reportStore';
import { useSubscriptionStore } from './subscriptionStore';

// Estado que pertence a UM médico e vive só em memória (rascunho do laudo com
// PII do paciente, perfil, assinatura). Precisa sumir quando a sessão termina ou
// muda de dono — senão, numa aba web compartilhada, o médico B veria o rascunho
// do médico A (achado "deferred" da auditoria run-1).
export function clearUserScopedState(): void {
  useReportStore.getState().reset();
  useDoctorStore.getState().setDoctor(null);
  useSubscriptionStore.getState().reset();
}

let lastUserId: string | null = null;

// Chamado a cada mudança de auth. Limpa quando havia um usuário e agora não há
// (logout, sessão expirada, conta excluída) ou quando o usuário mudou (login de
// outra conta em outra aba compartilhando o localStorage). Refresh de token do
// mesmo usuário não limpa nada.
export function syncUserScopedState(nextUserId: string | null): void {
  if (lastUserId !== null && lastUserId !== nextUserId) clearUserScopedState();
  lastUserId = nextUserId;
}

// Só para testes.
export function __resetUserScopedTracking(): void {
  lastUserId = null;
}
