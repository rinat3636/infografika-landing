(function () {
  "use strict";

  // ---- Настройки Telegram ----
  // Заполните значениями от @BotFather и чат/группы, куда слать заявки.
  // Внимание: это статичный сайт — токен будет виден в исходном коде страницы.
  // Используйте отдельного бота только для заявок.
  var TELEGRAM = {
    token: "", // например "1234567890:AA..."
    chatId: "" // например "123456789" или "-1001234567890" для группы
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

  var form = document.querySelector(".form");
  if (!form) return;

  var success = form.querySelector(".form-success");
  var button = form.querySelector(".btn");

  function buildMessage(name, contact) {
    var lines = [
      "<b>🆕 Новая заявка с сайта</b>",
      "",
      "<b>Имя:</b> " + name,
      "<b>Контакт:</b> " + contact,
      "",
      "🌐 " + location.host
    ];
    return lines.join("\n");
  }

  function sendToTelegram(name, contact) {
    var url = "https://api.telegram.org/bot" + TELEGRAM.token + "/sendMessage";
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM.chatId,
        text: buildMessage(name, contact),
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    }).then(function (res) {
      if (!res.ok) throw new Error("Telegram HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      if (!data.ok) throw new Error(data.description || "Telegram error");
      return data;
    });
  }

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

    // Если Telegram не настроен — просто показываем успех (заглушка).
    if (!TELEGRAM.token || !TELEGRAM.chatId) {
      showResult("Спасибо! Заявка принята — скоро свяжусь с вами.", true);
      button.disabled = true;
      name.value = "";
      contact.value = "";
      return;
    }

    button.disabled = true;
    var oldText = button.textContent;
    button.textContent = "Отправляю…";

    sendToTelegram(nameVal, contactVal)
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
})();
