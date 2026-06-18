(function () {
  "use strict";

  // Сайт всегда открывается сверху (на главной), а не на форме заявки,
  // даже если в URL остался якорь #zayavka или браузер хочет восстановить прокрутку.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (location.hash === "#zayavka") {
    history.replaceState(null, "", location.pathname + location.search);
  }
  window.addEventListener("load", function () {
    if (!location.hash) window.scrollTo(0, 0);
  });

  // ---- Настройки Telegram ----
  // Заполните значениями от @BotFather и чат/группы, куда слать заявки.
  // Внимание: это статичный сайт — токен будет виден в исходном коде страницы.
  // Используйте отдельного бота только для заявок.
  var TELEGRAM = {
    token: "8733618781:AAGSRb30-XonVlVx5PYSrHHrUGs-dzrV8kc", // токен @Infographicvv_bot
    // Постоянный список получателей хранится на сервере: кто открыл бота и
    // нажал «Старт» — попадает в список; «стоп» — выход из списка.
    recipientsApi: "/api/recipients",
    ownerChatId: "8384059998" // владелец — получает заявки всегда
  };

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function wireToggle(toggleId, gridSelector) {
    var toggle = document.getElementById(toggleId);
    var grid = document.querySelector(gridSelector);
    if (!toggle || !grid) return;
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      var expanded = grid.classList.toggle("is-expanded");
      toggle.textContent = expanded ? "Свернуть" : "Смотреть больше";
    });
  }

  wireToggle("portfolioToggle", ".portfolio-grid");
  wireToggle("reviewsToggle", ".reviews-grid");

  // ---- Блок «Цены и услуги» ----
  var pricing = document.getElementById("pricing");
  var pricingToggle = document.getElementById("pricingToggle");
  var pricingClose = document.getElementById("pricingClose");
  if (pricing && pricingToggle) {
    pricingToggle.addEventListener("click", function (event) {
      event.preventDefault();
      pricing.classList.add("is-open");
      pricing.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (pricing && pricingClose) {
    pricingClose.addEventListener("click", function (event) {
      event.preventDefault();
      pricing.classList.remove("is-open");
      if (pricingToggle) pricingToggle.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (pricing) {
    document.querySelectorAll('a[href="#pricing"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        pricing.classList.add("is-open");
        pricing.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // ---- Модальная форма заявки ----
  var modal = document.getElementById("leadModal");
  var modalSub = document.getElementById("modalServiceSub");
  var modalForm = modal ? modal.querySelector(".form") : null;

  function openModal(service) {
    if (!modal) return;
    if (modalForm) modalForm.dataset.service = service || "";
    if (modalSub) {
      modalSub.textContent = service
        ? "Услуга: " + service
        : "и я свяжусь с вами по выбранной услуге";
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var firstInput = modal.querySelector('input[name="name"]');
    if (firstInput) firstInput.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  if (modal) {
    modal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  document.querySelectorAll(".price-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.getAttribute("data-service") || "");
    });
  });

  // На мобильном кнопка «Написать» скрыта — открываем форму по тапу на карточку.
  document.querySelectorAll(".price-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".price-btn")) return;
      var btn = card.querySelector(".price-btn");
      openModal(btn ? btn.getAttribute("data-service") || "" : "");
    });
  });

  // Кнопка «ОСТАВИТЬ ЗАЯВКУ»: плавно прокручиваем к форме без добавления якоря в URL.
  var ctaLead = document.querySelector('.cta-btn[href="#zayavka"]');
  if (ctaLead) {
    ctaLead.addEventListener("click", function (e) {
      e.preventDefault();
      var form = document.getElementById("zayavka");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ---- Обработка форм заявок ----
  function buildMessage(name, contact, service) {
    var lines = ["<b>🆕 Новая заявка с сайта</b>", ""];
    if (service) lines.push("<b>Услуга:</b> " + service);
    lines.push("<b>Имя:</b> " + name);
    lines.push("<b>Контакт:</b> " + contact);
    lines.push("");
    lines.push("🌐 " + location.host);
    return lines.join("\n");
  }

  function tgApi(method) {
    return "https://api.telegram.org/bot" + TELEGRAM.token + "/" + method;
  }

  var TELEGRAM_STOP_WORDS = ["стоп", "stop", "/stop", "отписаться", "отписка"];

  // Узнаём, кто писал боту (нажал «Старт» / «стоп»), и обновляем серверный список.
  function discoverRecipients() {
    if (!TELEGRAM.token) return Promise.resolve(null);
    var url = tgApi("getUpdates") + "?limit=100&allowed_updates=" +
      encodeURIComponent('["message","my_chat_member"]');
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok || !d.result) return null;
      var state = {};
      d.result.forEach(function (u) {
        var ev = u.message || u.my_chat_member;
        if (!ev) return;
        var chat = ev.chat || {};
        if (!chat.id || chat.type !== "private") return;
        var cid = String(chat.id);
        var name = [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
          chat.username || cid;
        var remove = false;
        if (u.message) {
          var text = (u.message.text || "").trim().toLowerCase();
          if (TELEGRAM_STOP_WORDS.indexOf(text) !== -1) remove = true;
        }
        if (u.my_chat_member) {
          var st = (u.my_chat_member.new_chat_member || {}).status;
          if (st === "kicked" || st === "left") remove = true;
        }
        state[cid] = { name: name, remove: remove };
      });
      var add = [], rem = [];
      Object.keys(state).forEach(function (cid) {
        if (state[cid].remove) rem.push(cid);
        else add.push({ id: cid, name: state[cid].name });
      });
      if (!add.length && !rem.length) return null;
      return fetch(TELEGRAM.recipientsApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add: add, remove: rem })
      }).then(function (r) { return r.json(); }).catch(function () { return null; });
    }).catch(function () { return null; });
  }

  // Список получателей с сервера (+ владелец как страховка).
  function getRecipients() {
    return fetch(TELEGRAM.recipientsApi, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var ids = (d && d.ok && d.ids) ? d.ids.slice() : [];
        if (TELEGRAM.ownerChatId && ids.indexOf(TELEGRAM.ownerChatId) === -1) {
          ids.push(TELEGRAM.ownerChatId);
        }
        return ids;
      })
      .catch(function () {
        return TELEGRAM.ownerChatId ? [TELEGRAM.ownerChatId] : [];
      });
  }

  function sendOne(chatId, text) {
    return fetch(tgApi("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    }).then(function (r) { return r.json(); })
      .then(function (d) { return !!(d && d.ok); })
      .catch(function () { return false; });
  }

  // Рассылаем заявку всем получателям из списка (отправка идёт из браузера).
  function sendToTelegram(name, contact, service) {
    var text = buildMessage(name, contact, service);
    return discoverRecipients().then(getRecipients).then(function (ids) {
      if (!ids.length) throw new Error("no recipients");
      return Promise.all(ids.map(function (cid) { return sendOne(cid, text); }));
    }).then(function (results) {
      if (!results.some(function (x) { return x; })) throw new Error("no delivery");
      return true;
    });
  }

  function initForm(form) {
    var success = form.querySelector(".form-success");
    var button = form.querySelector('button[type="submit"]');

    function showResult(message, ok) {
      if (!success) return;
      success.hidden = false;
      success.textContent = message;
      success.style.color = ok ? "#16a34a" : "#e0556b";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.querySelector('input[name="name"]');
      var contact = form.querySelector('input[name="contact"]');
      var consent = form.querySelector('input[name="consent"]');

      if (!name.value.trim() || !contact.value.trim() || !consent.checked) {
        [name, contact].forEach(function (input) {
          input.parentElement.style.borderColor = input.value.trim() ? "" : "#e0556b";
        });
        if (!consent.checked) {
          consent.parentElement.style.color = "#e0556b";
        }
        return;
      }

      var nameVal = name.value.trim();
      var contactVal = contact.value.trim();
      var service = form.dataset.service || "";

      // Если Telegram не настроен — просто показываем успех (заглушка).
      if (!TELEGRAM.token) {
        showResult("Спасибо! Заявка принята — скоро свяжусь с вами.", true);
        button.disabled = true;
        name.value = "";
        contact.value = "";
        return;
      }

      button.disabled = true;
      var oldText = button.textContent;
      button.textContent = "Отправляю…";

      sendToTelegram(nameVal, contactVal, service)
        .then(function () {
          showResult("Спасибо! Заявка отправлена — скоро свяжусь с вами.", true);
          name.value = "";
          contact.value = "";
          button.textContent = oldText;
        })
        .catch(function () {
          showResult("Не удалось отправить заявку. Напишите мне напрямую в Telegram.", false);
          button.disabled = false;
          button.textContent = oldText;
        });
    });
  }

  document.querySelectorAll(".form").forEach(function (f) { initForm(f); });

  // Подхватываем тех, кто нажал «Старт», даже без отправки формы.
  if (TELEGRAM.token) { try { discoverRecipients(); } catch (e) {} }
})();
