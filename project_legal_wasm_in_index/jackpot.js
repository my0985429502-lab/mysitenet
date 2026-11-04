// jackpot.js — публичное отображение джекпота.
// Положить рядом с index.html и подключить после объявления SUPABASE_URL/KEY.
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY
  };

  async function loadMinimum() {
    const el = $("min-withdrawal");
    if (!el) return;
    try {
      const r = await fetch(
        SUPABASE_URL + "/rest/v1/settings?key=eq.min_withdrawal&select=value",
        { headers }
      );
      if (!r.ok) throw new Error("HTTP " + r.status);
      const rows = await r.json();
      const n = rows.length ? Number(rows[0].value) : 1;
      el.textContent = Number.isFinite(n) && n > 0 ? n : 1;
    } catch (e) {
      console.warn("Не удалось загрузить минимум вывода:", e);
      el.textContent = "—";
    }
  }

  async function loadJackpot() {
    const amountEl = $("jackpot-total");
    const targetEl = $("jackpot-target");
    const progressEl = $("jackpot-progress");
    const roundEl = $("jackpot-round");
    const winnerEl = $("jackpot-last-winner");
    const stateEl = $("jackpot-state");
    if (!amountEl) return;

    try {
      const r = await fetch(
        SUPABASE_URL +
          "/rest/v1/jackpot_rounds?select=id,target_amount,total_amount,status,winner_wallet,closed_at,payout_txid&order=id.desc&limit=10",
        { headers, cache: "no-store" }
      );
      if (!r.ok) throw new Error("HTTP " + r.status + " — проверь SQL и RLS");
      const rows = await r.json();
      const current = rows.find(x => x.status === "open");
      const last = rows.find(x => x.status === "awaiting_payout" || x.status === "paid");

      if (current) {
        const amount = Number(current.total_amount) || 0;
        const target = Number(current.target_amount) || 100;
        amountEl.textContent = amount.toFixed(6);
        targetEl.textContent = target.toFixed(6);
        progressEl.max = target;
        progressEl.value = Math.min(amount, target);
        roundEl.textContent = "#" + current.id;
        stateEl.textContent = "Раунд открыт. Учтён только подтверждённый доход пула.";
      } else {
        amountEl.textContent = "0.000000";
        targetEl.textContent = "100.000000";
        progressEl.max = 100;
        progressEl.value = 0;
        roundEl.textContent = "ожидание";
        stateEl.textContent = "Открытый раунд ещё не создан.";
      }

      if (last) {
        winnerEl.textContent =
          "#" + last.id + " — " +
          (last.winner_wallet || "победитель не указан") +
          " — " + (last.status === "paid" ? "выплачено" : "ожидает выплаты");
      } else {
        winnerEl.textContent = "Пока розыгрышей не было.";
      }
    } catch (e) {
      console.error(e);
      stateEl.textContent = "Не удалось загрузить джекпот: " + e.message;
    }
  }

  const refresh = $("refresh-jackpot");
  if (refresh) refresh.addEventListener("click", () => {
    loadJackpot();
    loadMinimum();
  });

  loadJackpot();
  loadMinimum();
  setInterval(loadJackpot, 15000);
})();
