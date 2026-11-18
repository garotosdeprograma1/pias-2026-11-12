/* Página de Contato: envia a mensagem para a administração e mostra o protocolo. */
(() => {
  'use strict';
  const form = document.getElementById('contactForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const fields = form.elements, submit = $('contactSubmit'), error = $('contactError');
  const success = $('contactSuccess'), orderField = $('c-pedido-field'), count = $('c-mensagem-count');
  const SUBJECTS = ['conta', 'pedidos', 'pagamentos', 'tecnico', 'privacidade', 'outro'];
  const ORDER_SUBJECTS = ['pedidos', 'pagamentos'];
  let sending = false;

  // Quem está conectado já tem nome, e-mail e perfil conhecidos; o servidor confirma o perfil pela sessão.
  const session = window.DafixAccount?.readSession();
  function prefill() {
    if (!session || !['cliente', 'funcionario'].includes(session.perfil)) return;
    fields.nome.value = session.nome;
    fields.email.value = session.email;
    fields.perfil.value = session.perfil;
    fields.perfil.disabled = true;
    const signed = $('contactSigned');
    signed.textContent = 'Você está conectado como ' + session.nome + ' (' + (session.perfil === 'cliente' ? 'cliente' : 'profissional') + '). A mensagem ficará ligada à sua conta.';
    signed.hidden = false;
  }

  // Atalhos da Central de ajuda podem chegar com o assunto e o pedido já escolhidos.
  function fromAddress() {
    const params = new URLSearchParams(location.search);
    if (SUBJECTS.includes(params.get('assunto'))) fields.assunto.value = params.get('assunto');
    if (/^\d{1,9}$/.test(params.get('pedido') || '')) fields.pedido.value = params.get('pedido');
  }

  function syncOrderField() {
    const show = ORDER_SUBJECTS.includes(fields.assunto.value);
    orderField.hidden = !show;
    if (!show) { fields.pedido.value = ''; setError('pedido', ''); }
  }
  const syncCount = () => { count.textContent = fields.mensagem.value.length; };

  function setError(name, message) {
    const wrap = form.querySelector('[data-field="' + name + '"]');
    if (!wrap) return;
    wrap.classList.toggle('has-error', Boolean(message));
    const input = fields[name];
    if (input) { if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    const slot = $('c-' + name + '-err');
    if (slot) slot.textContent = message;
  }

  // Mesmas regras do servidor, para avisar antes de enviar.
  const RULES = {
    nome: v => v.trim().length < 2 ? 'Informe seu nome.' : v.trim().length > 100 ? 'Use no máximo 100 caracteres.' : '',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Informe um e-mail válido para receber a resposta.',
    assunto: v => SUBJECTS.includes(v) ? '' : 'Escolha o assunto da mensagem.',
    pedido: v => !v.trim() || /^[1-9]\d{0,8}$/.test(v.trim()) ? '' : 'Use apenas o número do pedido, por exemplo 12.',
    mensagem: v => v.trim().length < 20 ? 'Escreva pelo menos 20 caracteres para entendermos o pedido.' : v.trim().length > 2000 ? 'Use no máximo 2000 caracteres.' : '',
  };
  function validate(name) { const message = RULES[name](fields[name].value); setError(name, message); return !message; }

  Object.keys(RULES).forEach(name => {
    fields[name].addEventListener('blur', () => { if (fields[name].value || fields[name].closest('.has-error')) validate(name); });
    fields[name].addEventListener('input', () => { if (fields[name].closest('.has-error')) validate(name); });
  });
  fields.assunto.addEventListener('change', () => { syncOrderField(); validate('assunto'); });
  fields.mensagem.addEventListener('input', syncCount);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    error.textContent = '';
    const invalid = Object.keys(RULES).filter(name => !validate(name));
    if (invalid.length) { fields[invalid[0]].focus(); return; }
    const body = {
      nome: fields.nome.value.trim(), email: fields.email.value.trim(), perfil: fields.perfil.value,
      assunto: fields.assunto.value, mensagem: fields.mensagem.value.trim(), site: fields.site.value,
    };
    if (ORDER_SUBJECTS.includes(body.assunto) && fields.pedido.value.trim()) body.pedido = Number(fields.pedido.value.trim());
    sending = true; submit.disabled = true; submit.classList.add('is-loading');
    try {
      let response;
      try { response = await fetch('/api/contato', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); }
      catch { throw new Error('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Não foi possível enviar a mensagem. Tente novamente.');
      $('contactProtocol').textContent = 'Protocolo ' + data.protocolo;
      $('contactSuccessEmail').textContent = body.email.toLowerCase();
      form.hidden = true;
      success.classList.add('is-visible');
      success.focus();
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      sending = false; submit.disabled = false; submit.classList.remove('is-loading');
    }
  });

  $('contactAgain').addEventListener('click', () => {
    form.reset(); prefill(); syncOrderField(); syncCount();
    Object.keys(RULES).forEach(name => setError(name, ''));
    success.classList.remove('is-visible');
    form.hidden = false;
    fields.assunto.focus();
  });

  prefill(); fromAddress(); syncOrderField(); syncCount();
})();
