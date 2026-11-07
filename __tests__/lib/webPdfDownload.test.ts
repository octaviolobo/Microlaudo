import { describe, expect, it } from '@jest/globals';

import { pdfFileName } from '@/lib/webPdfDownload';

describe('pdfFileName', () => {
  it('remove acentos e caracteres especiais do nome', () => {
    expect(pdfFileName('laudo-usg', 'Maria José da Conceição')).toBe('laudo-usg-maria-jose-da-conceicao.pdf');
  });

  it('não deixa barras ou pontos passarem para o nome do arquivo', () => {
    expect(pdfFileName('laudo', '../a/b.c')).toBe('laudo-a-b-c.pdf');
  });

  it('sem nome usa só o prefixo', () => {
    expect(pdfFileName('laudo', null)).toBe('laudo.pdf');
    expect(pdfFileName('laudo', '   ')).toBe('laudo.pdf');
  });
});
