/* eslint-env browser */
// Página inicial pública (site/index.html, publicada como dist/index.html).
// Quem já tem sessão salva, ou está voltando de um login com Google ou
// do link de confirmação de e-mail (?code=... no fluxo PKCE), vai direto para o
// app. O /home carrega o app, o supabase-js troca o código pela sessão
// (detectSessionInUrl) e, sem sessão, o (tabs)/_layout manda para o /login.
// Arquivo externo porque a CSP não permite script inline (public/_headers).
(function () {
  let search = location.search;
  let hash = location.hash;
  let authReturn =
    /[?&](code|error|error_description|token_hash)=/.test(search) ||
    /(access_token|error_description)=/.test(hash);

  let hasSession = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (/^sb-.+-auth-token$/.test(localStorage.key(i) || '')) {
        hasSession = true;
        break;
      }
    }
  } catch (e) {
    // localStorage bloqueado (aba anônima restrita): mostra a página inicial.
  }

  if (authReturn || hasSession) location.replace('/home' + search + hash);
})();

// Navegador interno do Instagram/Facebook/TikTok/LinkedIn (quem toca no link da
// bio): mostra no topo um aviso para abrir no Safari/Chrome, onde o login com
// Google funciona e a sessão fica salva. Mesma lógica de src/lib/inAppBrowser.ts.
(function () {
  const ua = navigator.userAgent;
  const apps = [
    ['Instagram', /Instagram/i],
    ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS|Messenger/i],
    ['TikTok', /musical_ly|BytedanceWebview|TikTok/i],
    ['LinkedIn', /LinkedInApp/i],
  ];
  const match = apps.find(function (a) { return a[1].test(ua); });
  if (!match) return;

  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const url = location.href;
  let external = null;
  if (android) {
    external = 'intent://' + location.host + location.pathname + location.search +
      '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
      encodeURIComponent(url) + ';end';
  } else if (ios) {
    external = 'x-safari-' + url;
  }

  function show() {
    const box = document.createElement('div');
    box.className = 'iab';
    box.setAttribute('role', 'alert');
    const title = document.createElement('strong');
    title.textContent = 'Abra no navegador para usar o MicroLaudo';
    const body = document.createElement('p');
    body.textContent = 'Você está no navegador interno do ' + match[0] +
      '. Aqui o login com o Google pode falhar e a sua conta não fica salva.';
    box.appendChild(title);
    box.appendChild(body);
    if (external) {
      const btn = document.createElement('a');
      btn.className = 'btn btn-primary';
      btn.href = external;
      btn.textContent = ios ? 'Abrir no Safari' : 'Abrir no Chrome';
      box.appendChild(btn);
    }
    const steps = document.createElement('p');
    steps.className = 'iab-steps';
    steps.textContent = 'Se não abrir, toque nos três pontinhos (··· ou ⋮) no canto da tela e escolha "Abrir no navegador".';
    box.appendChild(steps);
    document.body.insertBefore(box, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})();
