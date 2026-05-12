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
const dexChartLinkEl = document.getElementById("dexChartLink");
const dexPairLabelEl = document.getElementById("dexPairLabel");
const dexLiquidityLabelEl = document.getElementById("dexLiquidityLabel");
const dexVolumeLabelEl = document.getElementById("dexVolumeLabel");
const openDexChartBtn = document.getElementById("openDexChartBtn");
const fartParticlesEl = document.getElementById("fartParticles");

const TOKEN_ADDRESS = "3dk9CNre8tmv6bbNXd5F6dgkNnEzsyQ7sPhVT8kKpump";
let price = null;
let marketCap = null;
let holders = null;
let volume = null;
let currentChartUrl = "https://dexscreener.com";

function pickBestPair(pairs = []) {
  return pairs.reduce((best, pair) => {
    if (!best) return pair;
    const bestScore = (best.liquidity?.usd || 0) + (best.volume?.h24 || 0);
    const pairScore = (pair.liquidity?.usd || 0) + (pair.volume?.h24 || 0);
    return pairScore > bestScore ? pair : best;
  }, null);
}

function getChartUrl(pair) {
	if (!pair) return null;
	if (pair.url) {
		return `${pair.url}${pair.url.includes("?") ? "&" : "?"}embed=1&theme=dark&trades=0&info=0`;
	}

	if (!pair.chainId || !pair.pairAddress) return null;
	return `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}?embed=1&theme=dark&trades=0&info=0`;
}

function formatCompactUsd(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function renderPairDetails(pair) {
  if (!pair) return;

  const baseSymbol = pair.baseToken?.symbol || "FARTCAT";
  const quoteSymbol = pair.quoteToken?.symbol || "SOL";
  const dexId = pair.dexId || "DEX";

  if (dexPairLabelEl) {
    dexPairLabelEl.textContent = `${baseSymbol} / ${quoteSymbol} sur ${dexId}`;
  }
  if (dexLiquidityLabelEl) {
    dexLiquidityLabelEl.textContent = formatCompactUsd(Number(pair.liquidity?.usd || 0));
  }
  if (dexVolumeLabelEl) {
    dexVolumeLabelEl.textContent = formatCompactUsd(Number(pair.volume?.h24 || 0));
  }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createFartParticles() {
  if (!fartParticlesEl) return;

  const count = 18;
  const particleSource = "fart.png";
  fartParticlesEl.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("img");
    particle.className = "fart-particle";
    particle.src = particleSource;
    particle.alt = "";

    const size = randomBetween(28, 64);
    const startX = randomBetween(-10, 110);
    const startY = randomBetween(-10, 110);
    const midX = randomBetween(-15, 115);
    const midY = randomBetween(-15, 115);
    const endX = randomBetween(-10, 110);
    const endY = randomBetween(-10, 110);

    particle.style.setProperty("--size", `${size}px`);
    particle.style.setProperty("--scale", randomBetween(0.7, 1.2).toFixed(2));
    particle.style.setProperty("--duration", `${randomBetween(12, 28).toFixed(2)}s`);
    particle.style.setProperty("--x0", `${startX}vw`);
    particle.style.setProperty("--y0", `${startY}vh`);
    particle.style.setProperty("--x1", `${midX}vw`);
    particle.style.setProperty("--y1", `${midY}vh`);
    particle.style.setProperty("--x2", `${endX}vw`);
    particle.style.setProperty("--y2", `${endY}vh`);
    particle.style.setProperty("--rot1", `${randomBetween(-180, 180).toFixed(0)}deg`);
    particle.style.setProperty("--rot2", `${randomBetween(-360, 360).toFixed(0)}deg`);
    particle.style.animationDelay = `${randomBetween(-28, 0).toFixed(2)}s`;
    particle.style.opacity = String(randomBetween(0.35, 0.9));

    fartParticlesEl.appendChild(particle);
  }
}

async function fetchTokenMetrics() {
	try {
    const dexResponse = await fetch("/.netlify/functions/metrics");

    if (dexResponse.ok) {
      const dexData = await dexResponse.json();
      const bestPair = dexData.bestPair || pickBestPair(dexData.pairs || []);
      if (bestPair) {
        const nextPrice = Number(bestPair.priceUsd);
        const nextMarketCap = Number(bestPair.marketCap || bestPair.fdv || 0);
        const nextVolume = Number(bestPair.volume?.h24 || 0);

        if (Number.isFinite(nextPrice) && nextPrice > 0) price = nextPrice;
        if (Number.isFinite(nextMarketCap) && nextMarketCap > 0) marketCap = nextMarketCap;
        if (Number.isFinite(nextVolume) && nextVolume >= 0) volume = nextVolume;

			currentChartUrl = getChartUrl(bestPair) || currentChartUrl;
			renderPairDetails(bestPair);
			if (dexChartLinkEl) {
				dexChartLinkEl.href = currentChartUrl;
			}
      }

      if (Number.isFinite(Number(dexData.price)) && Number(dexData.price) > 0) {
        price = Number(dexData.price);
      }
      if (Number.isFinite(Number(dexData.marketCap)) && Number(dexData.marketCap) > 0) {
        marketCap = Number(dexData.marketCap);
      }
      if (Number.isFinite(Number(dexData.volume)) && Number(dexData.volume) >= 0) {
        volume = Number(dexData.volume);
      }
      if (Number.isFinite(Number(dexData.holders)) && Number(dexData.holders) >= 0) {
        holders = Number(dexData.holders);
      }
    }
	} catch (error) {
    console.log("Token metrics unavailable, keeping current values");
	}

  if (priceEl) priceEl.textContent = price !== null ? formatPrice(price) : "—";
  if (marketCapEl) marketCapEl.textContent = marketCap !== null ? formatCurrency(marketCap) : "—";
  if (holdersEl) holdersEl.textContent = holders !== null ? formatNumber(holders) : "—";
  if (volumeEl) volumeEl.textContent = volume !== null ? formatCurrency(volume) : "—";
}

fetchTokenMetrics();
setInterval(fetchTokenMetrics, 300000);
createFartParticles();

if (openDexChartBtn) {
  openDexChartBtn.addEventListener("click", () => {
    window.open(currentChartUrl, "_blank", "noreferrer");
  });
}

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
