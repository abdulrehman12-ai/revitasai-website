document.getElementById("year").textContent = new Date().getFullYear();

const apiBase = (document.documentElement.getAttribute("data-api-base") || "").trim();
const quotePanel = document.getElementById("quote-panel");
const statusNode = document.getElementById("checkout-status");
const startButton = document.getElementById("start-checkout");
let quote = null;

function setStatus(message) {
  statusNode.textContent = message;
}

function formatWhen(value) {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toUTCString();
}

async function loadQuote() {
  if (!apiBase) {
    setStatus("Checkout is not configured yet. The public site needs a trusted HTTPS API origin before Stripe Checkout can start.");
    startButton.disabled = true;
    return;
  }
  try {
    const response = await fetch(new URL("/api/v1/saas/billing/quote", apiBase).toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error("quote");
    }
    quote = await response.json();
    quotePanel.hidden = false;
    quotePanel.innerHTML =
      "<p><strong>$" +
      quote.amount_usd +
      " USD / month</strong> per team, up to " +
      quote.member_limit +
      " members.</p>" +
      "<p>$" +
      quote.charge_at_signup_usd +
      " charged at signup. Trial ends " +
      formatWhen(quote.trial_end_at) +
      ". First billing attempt " +
      formatWhen(quote.first_billing_at) +
      ".</p>" +
      "<p>" +
      quote.tax +
      "</p><p>" +
      quote.cancellation +
      "</p><p>" +
      quote.non_phi +
      "</p><p>" +
      quote.legal_status +
      "</p>";
    setStatus("Review the dates and terms, then continue to Stripe Checkout. Confirming checkout collects a payment method and charges $0 today.");
  } catch (_error) {
    setStatus("The plan quote could not be loaded. Checkout is paused.");
    startButton.disabled = true;
  }
}

startButton.addEventListener("click", async function startCheckout() {
  if (startButton.disabled) return;
  if (!apiBase) {
    setStatus("Checkout is not configured yet.");
    return;
  }
  startButton.disabled = true;
  setStatus("Opening Stripe Checkout…");
  try {
    const response = await fetch(new URL("/api/v1/saas/billing/checkout", apiBase).toString(), {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(function empty() {
      return {};
    });
    if (!response.ok || typeof payload.url !== "string" || payload.url.indexOf("https://") !== 0) {
      throw new Error("checkout");
    }
    window.location.assign(payload.url);
  } catch (_error) {
    setStatus("Checkout could not be started. No charge was made.");
    startButton.disabled = false;
  }
});

loadQuote();
