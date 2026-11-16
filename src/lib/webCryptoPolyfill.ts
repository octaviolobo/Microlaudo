import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

// O Hermes (motor JS do app nativo) não tem crypto.subtle. Sem ele, o supabase-js
// gera o desafio PKCE em modo "plain" (o verificador vai em claro na URL do e-mail
// de reset / login social) em vez de SHA-256, e avisa "WebCrypto API is not
// supported". Aqui cobrimos só o que o supabase-js usa: getRandomValues e
// subtle.digest('SHA-256'), ambos implementados nativamente pelo expo-crypto.
// Precisa ser importado antes de criar o cliente do Supabase.
type CryptoLike = {
  getRandomValues?: typeof ExpoCrypto.getRandomValues;
  subtle?: { digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> };
};

if (Platform.OS !== 'web') {
  const g = globalThis as unknown as { crypto?: CryptoLike };
  const cryptoObj: CryptoLike = g.crypto ?? {};
  if (typeof cryptoObj.getRandomValues !== 'function') {
    cryptoObj.getRandomValues = ExpoCrypto.getRandomValues;
  }
  if (!cryptoObj.subtle) {
    cryptoObj.subtle = {
      digest: (algorithm, data) => ExpoCrypto.digest(algorithm as ExpoCrypto.CryptoDigestAlgorithm, data),
    };
  }
  g.crypto = cryptoObj;
}
