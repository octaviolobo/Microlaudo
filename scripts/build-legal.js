/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
// Gera as páginas legais públicas (public/*.html) a partir de docs/legal/*.md.
//
// O Markdown em docs/legal/ é a fonte única. Este script roda no `build:web`
// (antes do `expo export`, que copia public/ para dist/), e o Cloudflare Pages
// serve public/privacidade.html em https://microlaudo.com/privacidade — página
// estática, sem JavaScript e sem login, como as lojas exigem.
//
// Converte só o subconjunto de Markdown usado nesses documentos: títulos (#, ##,
// ###), parágrafos, listas "- " (com linhas de continuação indentadas), tabelas,
// "---", **negrito**, *itálico*, `código`, URLs e e-mails.
// Blocos de citação (>) são NOTAS INTERNAS (rascunho, pendências) e não são
// publicados. Um **[PENDENTE...]** no meio do texto também é removido.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://microlaudo.com';

const PAGES = [
  {
    source: 'docs/legal/politica-privacidade.md',
    output: 'public/privacidade.html',
    slug: 'privacidade',
    description:
      'Como o MicroLaudo coleta, usa, armazena, compartilha e elimina dados pessoais, conforme a LGPD.',
  },
];

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(raw) {
  const text = raw.replace(/\s*\*\*\[PENDENTE[^\]]*\]\*\*/g, '');
  // Código primeiro, guardado à parte para não receber negrito/links por dentro.
  const codes = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/https:\/\/[^\s<)]+[^\s<).,;:]/g, (url) => `<a href="${url}">${url}</a>`)
    .replace(/\b(www\.gov\.br\/anpd)\b/g, '<a href="https://$1">$1</a>')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+[a-z]/gi, (mail) => `<a href="mailto:${mail}">${mail}</a>`);
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function convert(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let title = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      while (i < lines.length && lines[i].startsWith('>')) i++;
      continue;
    }

    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1) {
        title = text;
        out.push(`<h1>${inline(text)}</h1>`);
      } else {
        const id = slugify(text);
        if (level === 2) toc.push({ id, text });
        out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      }
      i++;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const [head, , ...body] = rows;
      const th = splitRow(head).map((c) => `<th scope="col">${inline(c)}</th>`).join('');
      const trs = body
        .map((r) => `<tr>${splitRow(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('\n');
      out.push(`<div class="table"><table>\n<thead><tr>${th}</tr></thead>\n<tbody>\n${trs}\n</tbody>\n</table></div>`);
      continue;
    }

    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || (/^ {2,}\S/.test(lines[i]) && items.length))) {
        if (lines[i].startsWith('- ')) items.push(lines[i].slice(2).trim());
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      out.push(`<ul>\n${items.map((it) => `<li>${inline(it)}</li>`).join('\n')}\n</ul>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |>|\||- |-{3,}\s*$)/.test(lines[i])) {
      para.push(lines[i++].trim());
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return { title, body: out.join('\n'), toc };
}

function page({ title, body, toc }, { slug, description }) {
  const nav = toc.map((t) => `<li><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${SITE}/${slug}">
<link rel="icon" href="/favicon.ico">
<style>
:root {
  --bg: #ffffff; --surface: #f4f8fa; --text: #1b2428; --muted: #55656c;
  --border: #dbe4e8; --accent: #0e7490; --accent-strong: #0891b2;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1719; --surface: #172226; --text: #e4ecef; --muted: #9db0b7;
    --border: #2a3a40; --accent: #5ccde6; --accent-strong: #22b8d6;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
}
header { border-bottom: 1px solid var(--border); }
header .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; padding-bottom: 14px; }
.brand { font-weight: 700; font-size: 18px; color: var(--accent-strong); text-decoration: none; }
.wrap { max-width: 760px; margin: 0 auto; padding: 0 16px; }
main { padding: 32px 0 64px; }
h1 { font-size: 30px; line-height: 1.25; margin: 0 0 12px; }
h2 { font-size: 21px; line-height: 1.3; margin: 40px 0 12px; padding-top: 8px; scroll-margin-top: 16px; }
h3 { font-size: 17px; margin: 28px 0 8px; scroll-margin-top: 16px; }
p, ul { margin: 0 0 14px; }
ul { padding-left: 22px; }
li { margin-bottom: 6px; }
a { color: var(--accent); overflow-wrap: anywhere; }
code { font-size: 14px; background: var(--surface); padding: 1px 5px; border-radius: 4px; }
hr { border: 0; border-top: 1px solid var(--border); margin: 28px 0; }
nav.toc { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin: 24px 0 8px; }
nav.toc strong { display: block; margin-bottom: 6px; }
nav.toc ol { margin: 0; padding-left: 0; list-style: none; columns: 2; column-gap: 24px; font-size: 15px; }
nav.toc li { break-inside: avoid; margin-bottom: 4px; }
.table { overflow-x: auto; margin: 0 0 18px; border: 1px solid var(--border); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; font-size: 15px; }
th, td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--border); }
th { background: var(--surface); font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
footer { border-top: 1px solid var(--border); color: var(--muted); font-size: 14px; padding: 20px 0 32px; }
@media (max-width: 600px) {
  h1 { font-size: 25px; }
  nav.toc ol { columns: 1; }
  table { font-size: 14px; }
  th, td { padding: 8px 10px; min-width: 140px; }
}
@media print {
  header, nav.toc, footer { display: none; }
  a { color: inherit; text-decoration: none; }
}
</style>
</head>
<body>
<header><div class="wrap"><a class="brand" href="/">MicroLaudo</a></div></header>
<main class="wrap">
${body.replace('<hr>', `<nav class="toc" aria-label="Sumário"><strong>Sumário</strong><ol>\n${nav}\n</ol></nav>`)}
</main>
<footer><div class="wrap">IGARATECH SISTEMAS E DESENVOLVIMENTO LTDA · CNPJ 66.173.331/0001-31</div></footer>
</body>
</html>
`;
}

for (const cfg of PAGES) {
  const markdown = fs.readFileSync(path.join(ROOT, cfg.source), 'utf8');
  const html = page(convert(markdown), cfg);
  fs.writeFileSync(path.join(ROOT, cfg.output), html);
  console.log(`build-legal: ${cfg.source} → ${cfg.output}`);
}
