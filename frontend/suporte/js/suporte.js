/* ============================================================
   Dafix — Central de Suporte
   suporte.js — interatividade compartilhada
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const ready = (fn) => document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn);

  const STORAGE_THEME = "dafix_theme";

  /* ====== TEMA ====== */
  function initTheme() {
    const root = document.documentElement;
    const btn = $("#themeToggle");
    const saved = localStorage.getItem(STORAGE_THEME) || localStorage.getItem("dafix.theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = saved || (prefersDark ? "dark" : "light");
    btn && btn.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_THEME, root.dataset.theme);
    });
  }

  /* ====== TOAST ====== */
  function showToast({ title, message, type = "info", duration = 4000 }) {
    const wrap = $("#toasts");
    if (!wrap) return;
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      info:    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8h.01M11 12h1v5h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    const t = document.createElement("div");
    t.className = "toast toast--" + type;
    t.innerHTML = '<span class="toast__icon">' + (icons[type] || icons.info) + '</span><div class="toast__body"><p>' + title + '</p>' + (message ? '<small>' + message + '</small>' : '') + '</div>';
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add("is-leaving");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }, duration);
  }
  window._showToast = showToast;

  /* ====== FAQ ACCORDION ====== */
  function initFaq() {
    $$(".faq-item__trigger").forEach((btn) => {
      const item = btn.closest(".faq-item");
      const body = item.querySelector(".faq-item__body");
      const inner = item.querySelector(".faq-item__inner");

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");

        // fechar todos os outros
        $$(".faq-item.is-open").forEach((other) => {
          if (other === item) return;
          other.classList.remove("is-open");
          const ob = other.querySelector(".faq-item__body");
          if (ob) { ob.style.maxHeight = null; ob.inert = true; }
          other.querySelector(".faq-item__trigger")?.setAttribute("aria-expanded", "false");
        });

        if (isOpen) {
          item.classList.remove("is-open");
          body.style.maxHeight = null;
          body.inert = true;
        } else {
          item.classList.add("is-open");
          body.inert = false;
          body.style.maxHeight = (inner ? inner.scrollHeight + 40 : body.scrollHeight) + "px";
        }
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  /* ====== BUSCA NO FAQ ====== */
  function initSearch() {
    const searchInput = $("#faqSearch");
    const faqEmpty   = $(".faq-empty");
    if (!searchInput) return;

    function doSearch(term) {
      const q = term.trim().toLowerCase();
      const items = $$(".faq-item");
      let visible = 0;

      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        const match = !q || text.includes(q);
        item.style.display = match ? "" : "none";
        if (match) visible++;
      });

      if (faqEmpty) faqEmpty.classList.toggle("is-visible", visible === 0);
    }

    searchInput.addEventListener("input", (e) => doSearch(e.target.value));

    // busca pela barra do hero (index)
    const heroForm = $("#heroSearchForm");
    heroForm && heroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const heroInput = heroForm.querySelector("input");
      if (!heroInput) return;
      const q = heroInput.value.trim();
      if (!q) return;
      // scroll para a seção de FAQ e filtra
      const faqSection = $(".faq-section");
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        setTimeout(() => {
          if (searchInput) {
            searchInput.value = q;
            searchInput.dispatchEvent(new Event("input"));
          }
          doSearch(q);
        }, 500);
      }
    });
  }

  /* ====== FILTRO DE CATEGORIA (CHIPS) ====== */
  function initChips() {
    $$(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".filter-chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");

        const cat = chip.dataset.cat;
        const items = $$(".faq-item");
        const empty = $(".faq-empty");
        let visible = 0;

        // também limpar busca
        const searchInput = $("#faqSearch");
        if (searchInput) searchInput.value = "";

        items.forEach((item) => {
          const match = cat === "all" || item.dataset.cat === cat;
          item.style.display = match ? "" : "none";
          if (match) visible++;
        });

        if (empty) empty.classList.toggle("is-visible", visible === 0);
        syncCategoryExtras(cat);

        // fechar accordions abertos de outros grupos
        $$(".faq-item.is-open").forEach((it) => {
          if (!it.dataset.cat || (cat !== "all" && it.dataset.cat !== cat)) {
            it.classList.remove("is-open");
            const b = it.querySelector(".faq-item__body");
            if (b) { b.style.maxHeight = null; b.inert = true; }
            it.querySelector(".faq-item__trigger")?.setAttribute("aria-expanded", "false");
          }
        });
      });
    });
  }

  /* ====== EXTRAS POR CATEGORIA ====== */
  const SUBJECT = { conta: "conta", pedidos: "pedidos", pagamentos: "pagamentos", tecnico: "tecnico" };
  function syncCategoryExtras(cat) {
    $$(".filter-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === cat)));
    const quick = $("#quickAccess");
    if (quick) quick.hidden = quick.dataset.for !== cat;
    const contact = $("#faqContact");
    if (contact) contact.href = "contato.html" + (SUBJECT[cat] ? "?assunto=" + SUBJECT[cat] : "");
  }
  // Links como index.html?cat=pagamentos abrem a Central já filtrada.
  function initFromAddress() {
    const cat = new URLSearchParams(location.search).get("cat");
    const chip = cat && $('.filter-chip[data-cat="' + cat + '"]');
    if (chip) chip.click(); else syncCategoryExtras("all");
  }

  ready(() => { initTheme(); initFaq(); initSearch(); initChips(); initFromAddress(); });
})();
