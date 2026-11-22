// Página inicial pública (site/index.html, publicada como dist/index.html).
// Quem já tem sessão salva, ou está voltando de um login com Google/Facebook ou
// do link de confirmação de e-mail (?code=... no fluxo PKCE), vai direto para o
// app. O /home carrega o app, o supabase-js troca o código pela sessão
// (detectSessionInUrl) e, sem sessão, o (tabs)/_layout manda para o /login.
// Arquivo externo porque a CSP não permite script inline (public/_headers).
(function () {
  var search = location.search;
  var hash = location.hash;
  var authReturn =
    /[?&](code|error|error_description|token_hash)=/.test(search) ||
    /(access_token|error_description)=/.test(hash);

  var hasSession = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
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
