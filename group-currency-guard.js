(() => {
  const main = document.querySelector("#main");
  if (!main) return;

  const enforceSingleCurrency = () => {
    const select = document.querySelector('#group-expense-form select[name="currency"]');
    if (!select || select.dataset.currencyGuard === "true") return;

    const tripCurrency = select.options[0]?.value || "CLP";
    select.innerHTML = `<option value="${tripCurrency}">${tripCurrency}</option>`;
    select.dataset.currencyGuard = "true";

    const label = select.closest("label");
    if (label && !label.querySelector(".group-currency-note")) {
      const note = document.createElement("small");
      note.className = "group-currency-note";
      note.textContent = "Group balances use one currency. Convert other payments before adding them here.";
      label.append(note);
    }
  };

  new MutationObserver(enforceSingleCurrency).observe(main, { childList: true, subtree: true });
  enforceSingleCurrency();
})();
