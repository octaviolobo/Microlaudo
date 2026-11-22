/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
// Troca o dist/index.html gerado pelo Expo pela página inicial pública
// (site/index.html). Motivo: o index do Expo é uma casca vazia que só redireciona
// para o /login via JavaScript, e o Google (verificação da marca do login com
// Google), as lojas e os buscadores precisam de uma página inicial que explique
// o app sem login. As rotas do app continuam com os próprios HTMLs (login.html,
// home.html...). Quem tem sessão é mandado para o /home por public/inicio.js.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'site', 'index.html');
const TARGET = path.join(ROOT, 'dist', 'index.html');

for (const required of [TARGET, path.join(ROOT, 'dist', 'inicio.js'), path.join(ROOT, 'dist', 'home.html')]) {
  if (!fs.existsSync(required)) {
    console.error(`install-landing: ${required} não existe — o export mudou?`);
    process.exit(1);
  }
}

fs.copyFileSync(SOURCE, TARGET);
console.log('install-landing: site/index.html → dist/index.html');
