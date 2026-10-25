/* FinanceFlow — Assinatura via Apple In-App Purchase (RevenueCat)
 *
 * Roda SOMENTE no app iOS nativo (Capacitor). No Android e no site nada muda:
 * o pagamento continua pelo Mercado Pago.
 *
 * Regra: o app inteiro fica bloqueado por uma tela de assinatura até o usuário
 * ter o entitlement "pro" ativo. Exceção: e-mails da lista EMAILS_LIBERADOS
 * (clientes que já pagaram pelo Mercado Pago) entram sem assinar de novo.
 */
(function () {
  'use strict';

  const API_KEY = 'appl_smaJHrKnIrFWpptSoCeGvWIMOyk'; // chave pública do RevenueCat (iOS)
  const ENTITLEMENT = 'pro';
  const URL_TERMOS = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
  const URL_PRIVACIDADE = 'https://miguelrios26.github.io/financeflow-landing/privacy.html';
  const CACHE_HORAS = 24; // quanto tempo confiamos no último "é assinante" sem internet

  // Clientes que já pagaram pelo Mercado Pago (acesso liberado no iPhone).
  // Sempre em minúsculas.
  const EMAILS_LIBERADOS = [
    'miguelcombe99@gmail.com'
  ];

  const cap = window.Capacitor;
  const isIOSNative = !!(cap && cap.getPlatform && cap.getPlatform() === 'ios' &&
    cap.isNativePlatform && cap.isNativePlatform());
  if (!isIOSNative) return; // Android / web: não faz nada

  let configurado = false;
  let ofertaCache = null;
  let verificando = false;

  function plugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases;
  }

  function aguardarPlugin(tentativas) {
    return new Promise(function (resolve) {
      let n = 0;
      (function tick() {
        const p = plugin();
        if (p) return resolve(p);
        if (++n >= (tentativas || 40)) return resolve(null);
        setTimeout(tick, 300);
      })();
    });
  }

  function emailAtual() {
    try {
      return (typeof DB !== 'undefined' && DB && DB.user && DB.user.em ? String(DB.user.em) : '').trim().toLowerCase();
    } catch (e) { return ''; }
  }

  function chaveCache(email) { return 'ff_iap_pro_' + email; }

  function marcarPro(email, ativo) {
    try {
      if (ativo) localStorage.setItem(chaveCache(email), String(Date.now()));
      else localStorage.removeItem(chaveCache(email));
    } catch (e) {}
  }

  function proRecente(email) {
    try {
      const t = parseInt(localStorage.getItem(chaveCache(email)) || '0', 10);
      return t && (Date.now() - t) < CACHE_HORAS * 3600 * 1000;
    } catch (e) { return false; }
  }

  function temEntitlement(customerInfo) {
    return !!(customerInfo && customerInfo.entitlements && customerInfo.entitlements.active &&
      customerInfo.entitlements.active[ENTITLEMENT]);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function configurar(P, email) {
    if (!configurado) {
      await P.configure({ apiKey: API_KEY, appUserID: email || null });
      configurado = true;
    } else if (email) {
      try { await P.logIn({ appUserID: email }); } catch (e) {}
    }
  }

  async function consultarAssinatura(P, email) {
    await configurar(P, email);
    const r = await P.getCustomerInfo();
    return temEntitlement(r && r.customerInfo);
  }

  async function carregarOferta(P) {
    if (ofertaCache) return ofertaCache;
    const o = await P.getOfferings();
    const atual = (o && (o.current || (o.all && o.all['default']))) || null;
    ofertaCache = atual;
    return atual;
  }

  const PLANOS = {
    MONTHLY:     { ordem: 1, nome: 'Mensal',     per: '/mês' },
    THREE_MONTH: { ordem: 2, nome: 'Trimestral', per: '/trimestre' },
    SIX_MONTH:   { ordem: 3, nome: 'Semestral',  per: '/semestre' },
    ANNUAL:      { ordem: 4, nome: 'Anual',      per: '/ano' }
  };

  function injetarEstilo() {
    if (document.getElementById('ff-iap-style')) return;
    const st = document.createElement('style');
    st.id = 'ff-iap-style';
    st.textContent = [
      '#ff-iap{position:fixed;inset:0;z-index:2147483000;background:#060809;color:#f2f2f2;display:none;overflow-y:auto;-webkit-overflow-scrolling:touch;',
      'padding:calc(env(safe-area-inset-top,0px) + 28px) 20px calc(env(safe-area-inset-bottom,0px) + 28px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}',
      '#ff-iap .w{max-width:460px;margin:0 auto;}',
      '#ff-iap h1{font-size:24px;font-weight:800;text-align:center;margin:6px 0 6px;}',
      '#ff-iap p.s{font-size:14px;color:#c7c7c7;text-align:center;margin:0 0 20px;line-height:1.5;}',
      '#ff-iap .pl{background:linear-gradient(160deg,#12161a,#0c1216);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;margin-bottom:12px;}',
      '#ff-iap .pl.dest{border-color:#009ee3;}',
      '#ff-iap .nm{font-size:16px;font-weight:800;display:flex;justify-content:space-between;align-items:center;}',
      '#ff-iap .tag{font-size:11px;font-weight:800;background:#009ee3;color:#fff;border-radius:99px;padding:3px 9px;}',
      '#ff-iap .pr{font-size:26px;font-weight:900;color:#ffce45;margin:6px 0 2px;}',
      '#ff-iap .pr span{font-size:13px;font-weight:600;color:#9a9a9a;}',
      '#ff-iap .tr{font-size:13px;font-weight:700;color:#22c55e;margin:4px 0 10px;}',
      '#ff-iap button.b{width:100%;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;color:#fff;cursor:pointer;',
      'background:linear-gradient(135deg,#009ee3,#1e6fa8);margin-top:6px;}',
      '#ff-iap button.b:disabled{opacity:.55;}',
      '#ff-iap .lk{display:block;text-align:center;font-size:13px;color:#9a9a9a;background:none;border:none;margin:14px auto 0;padding:6px;text-decoration:underline;cursor:pointer;}',
      '#ff-iap .leg{font-size:11.5px;color:#7d848c;line-height:1.5;text-align:center;margin-top:16px;}',
      '#ff-iap .leg a{color:#009ee3;}',
      '#ff-iap .msg{font-size:13px;color:#ef4444;text-align:center;margin:8px 0;min-height:16px;}',
      '#ff-iap .ld{text-align:center;color:#c7c7c7;padding:60px 0;font-size:15px;}'
    ].join('');
    document.head.appendChild(st);
  }

  function raiz() {
    injetarEstilo();
    let el = document.getElementById('ff-iap');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ff-iap';
      document.body.appendChild(el);
    }
    return el;
  }

  function mostrar(html) {
    const el = raiz();
    el.innerHTML = '<div class="w">' + html + '</div>';
    el.style.display = 'block';
    document.documentElement.style.overflow = 'hidden';
    return el;
  }

  function esconder() {
    const el = document.getElementById('ff-iap');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    document.documentElement.style.overflow = '';
  }

  function rodape() {
    return '<div class="leg">A assinatura é cobrada na sua conta Apple e renova automaticamente, no mesmo período, ' +
      'a menos que seja cancelada pelo menos 24 horas antes do fim do período atual. ' +
      'Gerencie ou cancele em Ajustes › seu nome › Assinaturas.<br>' +
      '<a href="' + URL_TERMOS + '" target="_blank" rel="noopener">Termos de Uso</a> · ' +
      '<a href="' + URL_PRIVACIDADE + '" target="_blank" rel="noopener">Política de Privacidade</a></div>' +
      '<button class="lk" id="ff-iap-restore">Restaurar compras</button>' +
      '<button class="lk" id="ff-iap-sair">Sair da conta</button>' +
      '<button class="lk" id="ff-iap-excluir">Excluir minha conta</button>';
  }

  function textoTeste(prod) {
    const ip = prod && prod.introPrice;
    if (!ip || Number(ip.price) !== 0) return '';
    const n = ip.periodNumberOfUnits || 1;
    const u = String(ip.periodUnit || '').toUpperCase();
    let t = '';
    if (u === 'DAY') t = n + (n === 1 ? ' dia' : ' dias');
    else if (u === 'WEEK') t = n + (n === 1 ? ' semana' : ' semanas');
    else if (u === 'MONTH') t = n + (n === 1 ? ' mês' : ' meses');
    else if (u === 'YEAR') t = n + (n === 1 ? ' ano' : ' anos');
    return t ? '🎁 Teste grátis de ' + t : '';
  }

  function ligarRodape(P, email) {
    const q = function (id) { return document.getElementById(id); };
    if (q('ff-iap-restore')) q('ff-iap-restore').onclick = function () { if (P) restaurar(P, email); };
    if (q('ff-iap-sair')) q('ff-iap-sair').onclick = function () {
      esconder();
      if (typeof window.doLogout === 'function') window.doLogout();
    };
    if (q('ff-iap-excluir')) q('ff-iap-excluir').onclick = function () {
      if (typeof window.deleteAccount === 'function') window.deleteAccount();
    };
  }

  function msg(t) {
    const m = document.getElementById('ff-iap-msg');
    if (m) m.textContent = t || '';
  }

  async function restaurar(P, email) {
    msg('Restaurando compras…');
    try {
      const r = await P.restorePurchases();
      if (temEntitlement(r && r.customerInfo)) {
        marcarPro(email, true);
        esconder();
        if (typeof window.toast === 'function') window.toast('Assinatura restaurada!', 's');
      } else {
        msg('Nenhuma assinatura ativa encontrada nesta conta Apple.');
      }
    } catch (e) {
      msg('Não foi possível restaurar agora. Tente novamente.');
    }
  }

  async function comprar(P, email, pacote, botao) {
    msg('');
    if (botao) botao.disabled = true;
    try {
      const r = await P.purchasePackage({ aPackage: pacote });
      if (temEntitlement(r && r.customerInfo)) {
        marcarPro(email, true);
        esconder();
        if (typeof window.toast === 'function') window.toast('Assinatura ativada! Bem-vindo ao FinanceFlow Pro 🎉', 's');
      } else {
        const ok = await consultarAssinatura(P, email);
        if (ok) { marcarPro(email, true); esconder(); }
        else msg('Compra recebida. Aguarde alguns segundos e toque em "Restaurar compras".');
      }
    } catch (e) {
      if (e && (e.userCancelled || e.code === '1' || e.code === 1)) {
        // usuário cancelou
      } else {
        msg((e && e.message) ? e.message : 'Não foi possível concluir a compra.');
      }
    } finally {
      if (botao) botao.disabled = false;
    }
  }

  async function telaPlanos(P, email) {
    mostrar('<div class="ld">Carregando planos…</div>');
    let oferta = null;
    try { oferta = await carregarOferta(P); } catch (e) { oferta = null; }

    const pacotes = (oferta && oferta.availablePackages) || [];
    if (!pacotes.length) {
      mostrar('<h1>FinanceFlow Pro</h1><p class="s">Não conseguimos carregar os planos agora. ' +
        'Verifique sua internet e tente novamente.</p>' +
        '<button class="b" id="ff-iap-retry">Tentar novamente</button>' +
        '<div class="msg" id="ff-iap-msg"></div>' + rodape());
      const rt = document.getElementById('ff-iap-retry');
      if (rt) rt.onclick = function () { ofertaCache = null; telaPlanos(P, email); };
      ligarRodape(P, email);
      return;
    }

    pacotes.sort(function (a, b) {
      const oa = (PLANOS[a.packageType] || { ordem: 99 }).ordem;
      const ob = (PLANOS[b.packageType] || { ordem: 99 }).ordem;
      return oa - ob;
    });

    let html = '<h1>FinanceFlow Pro</h1>' +
      '<p class="s">Assine para usar o app completo: transações por voz, metas, investimentos, relatórios e muito mais.</p>';
    pacotes.forEach(function (pk, i) {
      const info = PLANOS[pk.packageType] || { nome: (pk.product && pk.product.title) || pk.identifier, per: '' };
      const teste = textoTeste(pk.product);
      html += '<div class="pl' + (pk.packageType === 'SIX_MONTH' ? ' dest' : '') + '">' +
        '<div class="nm"><span>' + esc(info.nome) + '</span>' +
        (pk.packageType === 'SIX_MONTH' ? '<span class="tag">Mais popular</span>' : '') +
        (pk.packageType === 'ANNUAL' ? '<span class="tag">Melhor preço</span>' : '') + '</div>' +
        '<div class="pr">' + esc(pk.product.priceString) + '<span> ' + esc(info.per) + '</span></div>' +
        (teste ? '<div class="tr">' + esc(teste) + '</div>' : '') +
        '<button class="b" data-i="' + i + '">Assinar ' + esc(info.nome) + '</button></div>';
    });
    html += '<div class="msg" id="ff-iap-msg"></div>' + rodape();
    const el = mostrar(html);
    el.querySelectorAll('button.b[data-i]').forEach(function (b) {
      b.onclick = function () { comprar(P, email, pacotes[parseInt(b.getAttribute('data-i'), 10)], b); };
    });
    ligarRodape(P, email);
  }

  async function verificar() {
    if (verificando) return;
    const email = emailAtual();
    const app = document.getElementById('app');
    if (!email || !app || app.style.display === 'none') return;

    if (EMAILS_LIBERADOS.indexOf(email) !== -1) { esconder(); return; }

    verificando = true;
    try {
      const confiaCache = proRecente(email);
      if (!confiaCache) mostrar('<div class="ld">Verificando assinatura…</div>');

      const P = await aguardarPlugin(40);
      if (!P) {
        if (confiaCache) return;
        mostrar('<h1>FinanceFlow Pro</h1><p class="s">Compras indisponíveis neste momento. ' +
          'Feche e abra o app novamente.</p><div class="msg" id="ff-iap-msg"></div>' + rodape());
        ligarRodape(null, email);
        return;
      }

      let ativo = false;
      let falhouRede = false;
      try {
        ativo = await consultarAssinatura(P, email);
      } catch (e) {
        falhouRede = true;
      }

      if (ativo) { marcarPro(email, true); esconder(); return; }
      if (falhouRede && confiaCache) return;
      marcarPro(email, false);
      await telaPlanos(P, email);
    } finally {
      verificando = false;
    }
  }

  function observarApp() {
    const app = document.getElementById('app');
    if (!app || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (app.style.display === 'none') esconder();
    }).observe(app, { attributes: true, attributeFilter: ['style'] });
  }

  function iniciar() {
    const orig = window.initApp;
    if (typeof orig === 'function' && !orig.__ffIap) {
      const novo = function () {
        const r = orig.apply(this, arguments);
        setTimeout(verificar, 50);
        return r;
      };
      novo.__ffIap = true;
      window.initApp = novo;
    }
    observarApp();

    try {
      const A = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (A && A.addListener) {
        A.addListener('appStateChange', function (st) {
          if (st && st.isActive) setTimeout(verificar, 300);
        });
      }
    } catch (e) {}

    setTimeout(verificar, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.FinanceFlowIAP = { verificar: verificar };
})();
