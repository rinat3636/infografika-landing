(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var form = document.querySelector(".form");
  if (!form) return;

  var success = form.querySelector(".form-success");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = form.querySelector('input[name="name"]');
    var contact = form.querySelector('input[name="contact"]');
    var consent = form.querySelector('input[name="consent"]');

    if (!name.value.trim() || !contact.value.trim() || !consent.checked) {
      [name, contact].forEach(function (input) {
        input.parentElement.style.borderColor = input.value.trim()
          ? ""
          : "#e0556b";
      });
      if (!consent.checked) {
        consent.parentElement.style.color = "#e0556b";
      }
      return;
    }

    if (success) {
      success.hidden = false;
    }
    form.querySelector(".btn").disabled = true;
    name.value = "";
    contact.value = "";
  });
})();
