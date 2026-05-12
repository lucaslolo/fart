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
const dexChartEl = document.getElementById("dexChart");
const dexChartLinkEl = document.getElementById("dexChartLink");
const fartParticlesEl = document.getElementById("fartParticles");
const systemErrorLayer = document.getElementById("systemErrorLayer");

const TOKEN_ADDRESS = "3dk9CNre8tmv6bbNXd5F6dgkNnEzsyQ7sPhVT8kKpump";
let price = null;
let marketCap = null;
let holders = null;
let volume = null;
let fartAudioContext = null;
let fartSpeedResetTimer = null;

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

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function buildFartParticle({ fast = false } = {}) {
  const particle = document.createElement("img");
  particle.className = "fart-particle";
  particle.src = "fart.png";
  particle.alt = "";
  if (fast) {
    particle.classList.add("fart-particle-red");
  }

  const size = fast ? randomBetween(32, 72) : randomBetween(28, 64);
  const duration = fast ? randomBetween(4.5, 10.5) : randomBetween(12, 28);
  const startX = randomBetween(-10, 110);
  const startY = randomBetween(-10, 110);
  const midX = randomBetween(-15, 115);
  const midY = randomBetween(-15, 115);
  const endX = randomBetween(-10, 110);
  const endY = randomBetween(-10, 110);

  particle.dataset.baseDuration = duration.toFixed(2);
  particle.style.setProperty("--size", `${size}px`);
  particle.style.setProperty("--scale", randomBetween(0.7, fast ? 1.35 : 1.2).toFixed(2));
  particle.style.setProperty("--duration", `${duration.toFixed(2)}s`);
  particle.style.setProperty("--x0", `${startX}vw`);
  particle.style.setProperty("--y0", `${startY}vh`);
  particle.style.setProperty("--x1", `${midX}vw`);
  particle.style.setProperty("--y1", `${midY}vh`);
  particle.style.setProperty("--x2", `${endX}vw`);
  particle.style.setProperty("--y2", `${endY}vh`);
  particle.style.setProperty("--rot1", `${randomBetween(-180, 180).toFixed(0)}deg`);
  particle.style.setProperty("--rot2", `${randomBetween(-360, 360).toFixed(0)}deg`);
  particle.style.animationDelay = `${randomBetween(-28, 0).toFixed(2)}s`;
  particle.style.opacity = String(randomBetween(0.35, fast ? 1 : 0.9));

  return particle;
}

function addFartParticles(count, options = {}) {
  if (!fartParticlesEl) return;

  const maxParticles = options.maxParticles ?? 160;
  for (let index = 0; index < count; index += 1) {
    while (fartParticlesEl.childElementCount >= maxParticles) {
      fartParticlesEl.removeChild(fartParticlesEl.firstElementChild);
    }

    fartParticlesEl.appendChild(buildFartParticle(options));
  }
}

function createFartParticles() {
  if (!fartParticlesEl) return;

  fartParticlesEl.innerHTML = "";
  addFartParticles(18);
}

function boostFartParticles(multiplier = 0.6, duration = 2200) {
  if (!fartParticlesEl) return;

  window.clearTimeout(fartSpeedResetTimer);

  fartParticlesEl.querySelectorAll(".fart-particle").forEach((particle) => {
    const baseDuration = Number(particle.dataset.baseDuration || "18");
    particle.style.animationDuration = `${Math.max(2.2, baseDuration * multiplier).toFixed(2)}s`;
  });

  fartSpeedResetTimer = window.setTimeout(() => {
    fartParticlesEl.querySelectorAll(".fart-particle").forEach((particle) => {
      const baseDuration = Number(particle.dataset.baseDuration || "18");
      particle.style.animationDuration = `${baseDuration.toFixed(2)}s`;
    });
  }, duration);
}

function playFartSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!fartAudioContext) {
    fartAudioContext = new AudioContextClass();
  }

  if (fartAudioContext.state === "suspended") {
    fartAudioContext.resume().catch(() => {});
  }

  const now = fartAudioContext.currentTime;
  const output = fartAudioContext.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  output.connect(fartAudioContext.destination);

  const noiseBuffer = fartAudioContext.createBuffer(1, fartAudioContext.sampleRate * 0.5, fartAudioContext.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseData.length; index += 1) {
    noiseData[index] = Math.random() * 2 - 1;
  }

  const noiseSource = fartAudioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = fartAudioContext.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(180, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(95, now + 0.45);
  noiseFilter.Q.value = 1.2;

  const hissGain = fartAudioContext.createGain();
  hissGain.gain.setValueAtTime(0.0001, now);
  hissGain.gain.exponentialRampToValueAtTime(1.8, now + 0.02);
  hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(hissGain);
  hissGain.connect(output);

  const tone = fartAudioContext.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(92, now);
  tone.frequency.exponentialRampToValueAtTime(42, now + 0.4);

  const toneFilter = fartAudioContext.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(520, now);

  const toneGain = fartAudioContext.createGain();
  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.exponentialRampToValueAtTime(0.4, now + 0.03);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

  tone.connect(toneFilter);
  toneFilter.connect(toneGain);
  toneGain.connect(output);

  noiseSource.start(now);
  noiseSource.stop(now + 0.5);
  tone.start(now);
  tone.stop(now + 0.5);
}

function triggerFartStorm() {
  addFartParticles(28, { fast: true });
  boostFartParticles(0.5, 2600);
  playFartSound();
}

function showSystemErrorBurst() {
  if (!systemErrorLayer) return;

  const burst = document.createElement("div");
  burst.className = "system-error-burst";
  burst.textContent = "SYSTEM ERROR";
  systemErrorLayer.appendChild(burst);

  window.setTimeout(() => {
    burst.classList.add("visible");
  }, 10);

  window.setTimeout(() => {
    burst.classList.remove("visible");
    burst.remove();
  }, 900);
}

function triggerClickChaos() {
  triggerFartStorm();
  showSystemErrorBurst();
}

function setChartFallback(chartUrl) {
  if (!dexChartEl || !dexChartLinkEl) return;

  dexChartLinkEl.href = chartUrl || "https://dexscreener.com";
  dexChartLinkEl.target = "_blank";
  dexChartLinkEl.rel = "noreferrer";

  window.clearTimeout(window.__dexChartFallbackTimer);
  window.__dexChartFallbackTimer = window.setTimeout(() => {
    dexChartEl.classList.add("is-hidden");
    dexChartLinkEl.classList.add("is-visible");
  }, 12000);

  dexChartEl.addEventListener(
    "load",
    () => {
      window.clearTimeout(window.__dexChartFallbackTimer);
      dexChartLinkEl.classList.remove("is-visible");
      dexChartEl.classList.remove("is-hidden");
    },
    { once: true }
  );
}

async function fetchTokenMetrics() {
	try {
    const [dexResponse, holdersResponse] = await Promise.all([
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`),
      fetch("/.netlify/functions/holders"),
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

        const chartUrl = getChartUrl(bestPair);
        if (dexChartEl && chartUrl) {
          dexChartEl.src = chartUrl;
          setChartFallback(chartUrl);
        }
      }
    }

    if (holdersResponse.ok) {
      const holdersData = await holdersResponse.json();
      const nextHolders = Number(holdersData.holders);

      if (Number.isFinite(nextHolders) && nextHolders >= 0) {
        holders = nextHolders;
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
    return;
  }

  const targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
  if (targetTag === "input" || targetTag === "textarea" || targetTag === "select" || (e.target && e.target.isContentEditable)) {
    return;
  }

  if (!e.repeat && e.key && e.key.toLowerCase() === "f") {
    triggerFartStorm();
  }
});

document.addEventListener("pointerdown", (e) => {
  const targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
  if (targetTag === "input" || targetTag === "textarea" || targetTag === "select" || (e.target && e.target.isContentEditable)) {
    return;
  }

  triggerClickChaos();
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
