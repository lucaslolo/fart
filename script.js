const formatPrice = (value) => `$${value.toFixed(6)}`;
const formatNumber = (value) => value.toLocaleString("fr-FR");
const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const priceEl = document.getElementById("priceValue");
const marketCapEl = document.getElementById("marketCapValue");
const holdersEl = document.getElementById("holdersValue");
const volumeEl = document.getElementById("volumeValue");

const TOKEN_ADDRESS = "3dk9CNre8tmv6bbNXd5F6dgkNnEzsyQ7sPhVT8kKpump";
let price = 0.000001;
let marketCap = null;
let holders = null;
let volume = null;

function pickBestPair(pairs = []) {
  return pairs.reduce((best, pair) => {
    if (!best) return pair;
    const bestScore = (best.liquidity?.usd || 0) + (best.volume?.h24 || 0);
    const pairScore = (pair.liquidity?.usd || 0) + (pair.volume?.h24 || 0);
    return pairScore > bestScore ? pair : best;
  }, null);
}

async function fetchTokenMetrics() {
	try {
    const [dexResponse, holdersResponse] = await Promise.all([
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`),
      fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getProgramAccounts",
          params: [
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            {
              encoding: "jsonParsed",
              filters: [
                { dataSize: 165 },
                { memcmp: { offset: 0, bytes: TOKEN_ADDRESS } },
              ],
            },
          ],
        }),
      }),
    ]);

    if (dexResponse.ok) {
      const dexData = await dexResponse.json();
      const bestPair = pickBestPair(dexData.pairs || []);
      if (bestPair) {
        const nextPrice = Number(bestPair.priceUsd);
        const nextMarketCap = Number(bestPair.marketCap || bestPair.fdv || 0);
        const nextVolume = Number(bestPair.volume?.h24 || 0);

        if (Number.isFinite(nextPrice) && nextPrice > 0) price = nextPrice;
        if (Number.isFinite(nextMarketCap) && nextMarketCap > 0) marketCap = nextMarketCap;
        if (Number.isFinite(nextVolume) && nextVolume >= 0) volume = nextVolume;
      }
    }

    if (holdersResponse.ok) {
      const holdersData = await holdersResponse.json();
      const uniqueOwners = new Set();

      for (const account of holdersData.result || []) {
        const parsed = account?.account?.data?.parsed?.info;
        const owner = parsed?.owner;
        const amount = Number(parsed?.tokenAmount?.uiAmount || 0);

        if (owner && amount > 0) {
          uniqueOwners.add(owner);
        }
      }

      holders = uniqueOwners.size;
    }
	} catch (error) {
    console.log("Token metrics unavailable, keeping current values");
	}

  if (priceEl) priceEl.textContent = formatPrice(price);
  if (marketCapEl && marketCap !== null) marketCapEl.textContent = formatCurrency(marketCap);
  if (holdersEl && holders !== null) holdersEl.textContent = formatNumber(holders);
  if (volumeEl && volume !== null) volumeEl.textContent = formatCurrency(volume);
}

fetchTokenMetrics();
setInterval(fetchTokenMetrics, 60000);

const copyButton = document.getElementById("copyContractBtn");
const contractAddress = document.getElementById("contractAddress");
const copyFeedback = document.getElementById("copyFeedback");

if (copyButton && contractAddress) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(contractAddress.textContent.trim());
      if (copyFeedback) {
        copyFeedback.textContent = "Copie";
        setTimeout(() => {
          copyFeedback.textContent = "";
        }, 1800);
      }
    } catch (error) {
      if (copyFeedback) {
        copyFeedback.textContent = "Echec copie";
      }
    }
  });
}

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("mainNav");

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const revealItems = document.querySelectorAll(".reveal, .reveal-delay");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => observer.observe(item));

// ── AI Terminal ─────────────────────────────────────────────

const aiFab = document.getElementById("aiFab");
const aiTerminal = document.getElementById("aiTerminal");
const aiTermClose = document.getElementById("aiTermClose");
const aiTermForm = document.getElementById("aiTermForm");
const aiTermInput = document.getElementById("aiTermInput");
const aiTermBody = document.getElementById("aiTermBody");

let chatHistory = [];
let isWaiting = false;

function toggleTerminal(open) {
  const shouldOpen = open !== undefined ? open : !aiTerminal.classList.contains("open");
  aiTerminal.classList.toggle("open", shouldOpen);
  aiTerminal.setAttribute("aria-hidden", String(!shouldOpen));
  aiFab.setAttribute("aria-expanded", String(shouldOpen));
  if (shouldOpen) {
    setTimeout(() => aiTermInput.focus(), 220);
  }
}

aiFab.addEventListener("click", () => toggleTerminal());
aiTermClose.addEventListener("click", () => toggleTerminal(false));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && aiTerminal.classList.contains("open")) {
    toggleTerminal(false);
  }
});

function appendMsg(role, text) {
  const msg = document.createElement("div");
  msg.className = `ai-term-msg ai-term-${role}`;

  const prompt = document.createElement("span");
  prompt.className = "ai-term-prompt";
  prompt.textContent = role === "bot" ? "FARTCAT-BOT>" : "anon>";

  const content = document.createElement("span");
  content.textContent = text;

  msg.appendChild(prompt);
  msg.appendChild(content);
  aiTermBody.appendChild(msg);
  aiTermBody.scrollTop = aiTermBody.scrollHeight;
  return msg;
}

function showTyping() {
  const msg = document.createElement("div");
  msg.className = "ai-term-msg ai-term-bot";
  msg.id = "aiTyping";

  const dots = document.createElement("div");
  dots.className = "ai-term-typing";
  dots.innerHTML = "<span></span><span></span><span></span>";

  msg.appendChild(dots);
  aiTermBody.appendChild(msg);
  aiTermBody.scrollTop = aiTermBody.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById("aiTyping");
  if (el) el.remove();
}

aiTermForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isWaiting) return;

  const text = aiTermInput.value.trim();
  if (!text) return;

  aiTermInput.value = "";
  isWaiting = true;
  aiTermForm.querySelector(".ai-term-send").disabled = true;

  appendMsg("user", text);
  chatHistory.push({ role: "user", content: text });

  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: chatHistory.slice(-6) }),
    });

    const data = await res.json();
    removeTyping();

    const reply = data.reply || data.error || "💨 erreur inconnue, ser";
    appendMsg("bot", reply);
    chatHistory.push({ role: "assistant", content: reply });

    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }
  } catch {
    removeTyping();
    appendMsg("bot", "💨 connexion perdue anon, réessaie plus tard.");
  }

  isWaiting = false;
  aiTermForm.querySelector(".ai-term-send").disabled = false;
  aiTermInput.focus();
});
