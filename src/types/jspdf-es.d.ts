// O runtime importa o build browser diretamente (ver src/lib/reportPdf.ts) porque
// o resolver do Metro pega o build "node" do pacote ao importar por `jspdf`.
// Os tipos continuam vindo do pacote normal, que resolve certinho.
declare module 'jspdf/dist/jspdf.es.min.js' {
  export * from 'jspdf';
}
