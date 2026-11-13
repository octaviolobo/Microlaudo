// Formatação para exibição (tela e PDF). Os valores são guardados sem máscara.

// 6.3 → "6,3". Medidas de laudo sempre saem com casa decimal fixa (5 → "5,0"), como no
// modelo da médica.
export function formatDecimalBR(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}

// Converte o que a médica digitou ("6,3", "6.3", " 6 ") em número. Vazio → null.
// Retorna NaN para texto não numérico, para a validação acusar o erro.
export function parseDecimalBR(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

export function formatCpf(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatSusCard(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 15) return digits;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`;
}

// 4900 → "R$ 49"; 3325 → "R$ 33,25"; 123400 → "R$ 1.234". Sem Intl: o Hermes do
// Android nem sempre traz os dados de locale.
export function formatCentsBRL(cents: number): string {
  const reais = Math.floor(Math.abs(cents) / 100);
  const centavos = Math.abs(cents) % 100;
  const inteiro = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sinal = cents < 0 ? '-' : '';
  return centavos === 0
    ? `${sinal}R$ ${inteiro}`
    : `${sinal}R$ ${inteiro},${String(centavos).padStart(2, '0')}`;
}
