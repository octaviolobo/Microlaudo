// Carrega o jsPDF sob demanda. Import dinâmico pelo mesmo motivo de reportPdf.ts: o build
// browser do jsPDF quebra ao ser avaliado no Hermes, e o expo-router importa todo app/
// no boot. Isolado em um módulo para os testes (Node) poderem trocar pelo build node.
export async function loadJsPdf() {
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
  return jsPDF;
}
