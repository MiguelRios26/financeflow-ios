/* ============================================================================
 * FinanceFlow PRO — Paywall + Checkout Pro (Mercado Pago)
 * ----------------------------------------------------------------------------
 * Módulo único, sem dependências externas (JS puro).
 * ==========================================================================*/
(function () {
  'use strict';

  const BACKEND_URL = 'https://financeflow-backend-j0p2.onrender.com';
  const PLANO_ASSINATURA_URL = 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=49d69963b83948458d38a539960eff44';

  const PAGINAS_PRO = {
    investimentos: 'Investimentos',
    metas: 'Metas',
    livros: 'Educação Financeira',
  };

  const RECURSOS_PRO = Object.values(PAGINAS_PRO);

  const EMAILS_LIBERADOS = ['miguelcombe99@gmail.com'];

  // Investimentos, Metas e Educação Financeira são liberados pra todo mundo —
  // não faz mais parte do que é vendido na assinatura (só o acesso ao app em
  // si é pago). Por isso ehPro() sempre retorna true: nenhuma dessas telas
  // fica bloqueada, e o modal de upgrade nunca aparece dentro do app.
  const ehPro = () => true;

  function envolverGoPage() {
    if (typeof window.goPage !== 'function' || window.goPage.__proWrapped) {
      return false;
    }
    const goPageOriginal = window.goPage;
    function goPageComBloqueioPro(id) {
      if (!ehPro() && PAGINAS_PRO[id]) {
        abrirModalUpgrade(PAGINAS_PRO[id]);
        return;
      }
      return goPageOriginal.apply(this, arguments);
    }
    goPageComBloqueioPro.__proWrapped = true;
    window.goPage = goPageComBloqueioPro;
    return true;
  }

  function textoBate(el, alvo) {
    const textoProprio = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    const textoCompleto = (el.textContent || '').trim();
    const regexComIcone = new RegExp(`(^|\\s)${escapeRegex(alvo)}$`, 'i');
    return (
      textoProprio === alvo ||
      textoCompleto === alvo ||
      regexComIcone.test(textoCompleto)
    );
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function elementoJaEhFolhaDoMatch(el, alvo) {
    return !Array.from(el.children).some((filho) =>
      (filho.textContent || '').trim() === alvo
    );
  }

  function encontrarItensProBloqueados() {
    const encontrados = new Map();

    Object.keys(PAGINAS_PRO).forEach((id) => {
      document
        .querySelectorAll(`[onclick*="goPage('${id}')"], #sni-${id}`)
        .forEach((el) => encontrados.set(el, PAGINAS_PRO[id]));
    });

    document
      .querySelectorAll('button, a, li, [role="tab"], [role="button"], .tab, .nav-item, .card, .menu-item, .aba, .item, .sni')
      .forEach((el) => {
        if (encontrados.has(el) || el.dataset.proLocked === '1') return;
        for (const alvo of RECURSOS_PRO) {
          if (textoBate(el, alvo) && elementoJaEhFolhaDoMatch(el, alvo)) {
            encontrados.set(el, alvo);
            break;
          }
        }
      });

    return Array.from(encontrados, ([el, recurso]) => ({ el, recurso }));
  }

  function aplicarCadeado(el, recurso) {
    if (el.dataset.proLocked === '1') return;
    el.dataset.proLocked = '1';
    el.dataset.proRecurso = recurso;

    const cadeado = document.createElement('span');
    cadeado.textContent = ' 🔒';
    cadeado.setAttribute('aria-hidden', 'true');
    cadeado.style.cssText = 'margin-left:4px;font-size:0.85em;opacity:.85;';
    el.appendChild(cadeado);

    el.addEventListener(
      'click',
      function (e) {
        if (ehPro()) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        abrirModalUpgrade(recurso);
      },
      true
    );
  }

  function bloquearRecursosPro() {
    envolverGoPage();
    if (ehPro()) return;
    const itens = encontrarItensProBloqueados();
    itens.forEach(({ el, recurso }) => aplicarCadeado(el, recurso));
  }

  function observarNovasTelas() {
    const observer = new MutationObserver(() => {
      if (!ehPro()) bloquearRecursosPro();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function abrirModalUpgrade(recurso) {
    fecharModalUpgrade();

    const overlay = document.createElement('div');
    overlay.id = 'pro-upgrade-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;background:rgba(6,8,9,.72);
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(3px);animation:proFadeIn .15s ease-out;
      font-family:inherit;padding:20px;box-sizing:border-box;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background:#12161a;color:#f2f2f2;border-radius:16px;max-width:380px;
      width:100%;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.5);
      text-align:center;border:1px solid rgba(255,255,255,.08);
    `;

    modal.innerHTML = `
      <div style="font-size:40px;margin-bottom:10px;">🔒</div>
      <h2 style="margin:0 0 8px;font-size:19px;font-weight:700;">
        Recurso exclusivo PRO
      </h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#c7c7c7;">
        <strong>${escapeHtml(recurso)}</strong> faz parte da versão
        <strong>PRO</strong> do FinanceFlow. Assine por
        <strong>R$ 29,90/mês</strong> e tenha acesso completo a
        Investimentos, Metas e Educação Financeira.
      </p>
      <button id="pro-btn-desbloquear" style="
        width:100%;padding:14px;border:none;border-radius:10px;
        background:#009ee3;color:#fff;font-size:15px;font-weight:700;
        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
      ">
        Assinar com Mercado Pago
      </button>
      <button id="pro-btn-fechar" style="
        margin-top:12px;width:100%;padding:10px;border:none;background:transparent;
        color:#9a9a9a;font-size:13px;cursor:pointer;
      ">
        Agora não
      </button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('pro-btn-fechar').onclick = fecharModalUpgrade;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecharModalUpgrade();
    });
    document.getElementById('pro-btn-desbloquear').onclick = iniciarPagamentoMercadoPago;
  }

  function fecharModalUpgrade() {
    const existente = document.getElementById('pro-upgrade-overlay');
    if (existente) existente.remove();
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function iniciarPagamentoMercadoPago() {
    let email = localStorage.getItem('user_email');

    if (!email) {
      email = (window.prompt('Digite seu e-mail para continuar:') || '').trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        alert('E-mail inválido.');
        return;
      }
      localStorage.setItem('user_email', email);
    }

    window.location.href = PLANO_ASSINATURA_URL;
  }

  function telaConfirmandoPagamento() {
    const overlay = document.createElement('div');
    overlay.id = 'pro-confirmando-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:100000;background:#060809;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      color:#f2f2f2;font-family:inherit;gap:16px;
    `;
    overlay.innerHTML = `
      <div style="
        width:44px;height:44px;border-radius:50%;
        border:4px solid rgba(255,255,255,.15);border-top-color:#009ee3;
        animation:proSpin .8s linear infinite;
      "></div>
      <div style="font-size:15px;font-weight:600;">Confirmando pagamento...</div>
      <style>@keyframes proSpin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(overlay);
  }

  function removerTelaConfirmando() {
    const el = document.getElementById('pro-confirmando-overlay');
    if (el) el.remove();
  }

  async function checarStatusNoBackend(email) {
    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/checar-status?email=${encodeURIComponent(email)}`,
        { cache: 'no-store' }
      );
      if (!resp.ok) return false;
      const data = await resp.json();
      return !!data.pro;
    } catch (err) {
      console.error('[FinanceFlow PRO] erro ao checar status:', err);
      return false;
    }
  }

  function iniciarPollingConfirmacao(email) {
    telaConfirmandoPagamento();

    const MAX_TENTATIVAS = 40;
    let tentativas = 0;

    const intervalo = setInterval(async () => {
      tentativas++;
      const aprovado = await checarStatusNoBackend(email);

      if (aprovado) {
        clearInterval(intervalo);
        localStorage.setItem('usuario_pro', 'true');
        window.location.reload();
        return;
      }

      if (tentativas >= MAX_TENTATIVAS) {
        clearInterval(intervalo);
        removerTelaConfirmando();
        alert(
          'Ainda não recebemos a confirmação do pagamento. Se você já pagou, ' +
          'aguarde alguns instantes e reabra o app.'
        );
      }
    }, 3000);
  }

  function checarRetornoDoCheckout() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (!status) return false;

    const urlLimpa = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, urlLimpa);

    if (status === 'sucesso') {
      const email = localStorage.getItem('user_email');
      if (!email) {
        removerTelaConfirmando();
        return true;
      }
      iniciarPollingConfirmacao(email);
      return true;
    }
    return false;
  }

  async function verificarProAoAbrir() {
    if (ehPro()) return;
    const email = localStorage.getItem('user_email');
    if (!email) return;
    const aprovado = await checarStatusNoBackend(email);
    if (aprovado) {
      localStorage.setItem('usuario_pro', 'true');
      window.location.reload();
    }
  }

  function init() {
    const jaTratouRetorno = checarRetornoDoCheckout();
    bloquearRecursosPro();
    observarNovasTelas();
    if (!jaTratouRetorno) verificarProAoAbrir();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FinanceFlowPro = { iniciarPagamentoMercadoPago, ehPro };
})();
