// O `expo export` grava fontes e ícones em dist/assets/node_modules/..., mas o
// Cloudflare Pages não publica pastas chamadas node_modules: em produção esses
// arquivos caíam no fallback SPA (index.html) e o site ficava sem fontes e ícones.
// Este passo roda depois do export: renomeia a pasta e reescreve as referências.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const FROM_DIR = path.join(DIST, 'assets', 'node_modules');
const TO_DIR = path.join(DIST, 'assets', 'vendor');
const FROM_URL = 'assets/node_modules/';
const TO_URL = 'assets/vendor/';
const TEXT_EXTENSIONS = new Set(['.js', '.html', '.css', '.json', '.map']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// Falha alta de propósito: se o Expo mudar esse caminho, o build tem que parar
// em vez de publicar um site sem fontes.
if (!fs.existsSync(FROM_DIR)) {
  console.error(`fix-web-assets: ${FROM_DIR} não existe — o layout do export mudou?`);
  process.exit(1);
}

fs.renameSync(FROM_DIR, TO_DIR);

let rewritten = 0;
for (const file of walk(DIST)) {
  if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(FROM_URL)) continue;
  fs.writeFileSync(file, content.split(FROM_URL).join(TO_URL));
  rewritten += 1;
}

if (rewritten === 0) {
  console.error('fix-web-assets: nenhuma referência reescrita — o formato do bundle mudou?');
  process.exit(1);
}

console.log(`fix-web-assets: assets movidos para assets/vendor, ${rewritten} arquivo(s) reescrito(s).`);
