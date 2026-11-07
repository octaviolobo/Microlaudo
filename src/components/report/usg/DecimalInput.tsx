import { useState } from 'react';

import { Input } from '@/components/ui';
import { parseDecimalBR } from '@/lib/format';

type DecimalInputProps = {
  label: string;
  value: number | null;
  // `invalid` = texto digitado não é um número (ex.: "6,3,1"). O valor anterior não é
  // perdido: a tela bloqueia o avanço enquanto houver campo inválido.
  onChange: (value: number | null, invalid: boolean) => void;
  disabled?: boolean;
  error?: string;
};

// Campo numérico com vírgula decimal ("6,3"). Guarda o texto digitado localmente para não
// "comer" a vírgula enquanto a médica digita (6, → 6,3).
export function DecimalInput({ label, value, onChange, disabled, error }: DecimalInputProps) {
  const [text, setText] = useState(value == null ? '' : String(value).replace('.', ','));

  function handleChange(next: string) {
    setText(next);
    const parsed = parseDecimalBR(next);
    if (parsed != null && Number.isNaN(parsed)) {
      onChange(value, true);
      return;
    }
    onChange(parsed, false);
  }

  return (
    <Input label={label} value={text} onChangeText={handleChange} type="numeric" disabled={disabled} error={error} />
  );
}

export default DecimalInput;
