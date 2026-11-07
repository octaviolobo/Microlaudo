// Download do PDF do laudo na versão web.
//
// A URL assinada do Storage é de outra origem, então `<a download>` apontando
// direto para ela é ignorado pelo navegador (ele só abriria o PDF). Por isso o
// arquivo é baixado como blob e salvo via object URL, que é da mesma origem.
// Antes usava navigator.share, mas no desktop (Windows/macOS) isso abre a janela
// de compartilhar do sistema em vez de baixar.

export function pdfFileName(prefix: string, patientName: string | null | undefined): string {
  const safeName = (patientName ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${prefix}${safeName ? `-${safeName}` : ''}.pdf`;
}

export async function downloadPdfWeb(url: string, fileName: string): Promise<void> {
  let objectUrl: string | null = null;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    // Sem fetch/blob (rede, CORS): abre a URL assinada na própria aba.
    window.location.href = url;
  } finally {
    // Dá tempo para o navegador iniciar o download antes de liberar o blob.
    if (objectUrl) {
      const toRevoke = objectUrl;
      setTimeout(() => URL.revokeObjectURL(toRevoke), 10_000);
    }
  }
}
