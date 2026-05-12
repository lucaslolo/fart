const formatPrice = (value) => `$${value.toFixed(6)}`;
const formatNumber = (value) => value.toLocaleString("fr-FR");

const priceEl = document.getElementById("priceValue");
const holdersEl = document.getElementById("holdersValue");
const volumeEl = document.getElementById("volumeValue");

const TOKEN_ADDRESS = "3dk9CNre8tmv6bbNXd5F6dgkNnEzsyQ7sPhVT8kKpump";
let price = 0.000001;
let holders = 5821;
let volume = 182340;

// Fetch price from Birdeye API
async function fetchRealPrice() {
	try {
		const response = await fetch(
			`https://api.birdeye.so/defi/token_price?address=${TOKEN_ADDRESS}`,
			{
				headers: {
					"X-API-KEY": "c9d0280e6c6f4cd1bb9a8ba5d06fcbf6"
				}
			}
		);
		
		if (response.ok) {
			const data = await response.json();
			if (data.data && data.data.value) {
				price = data.data.value;
				if (priceEl) priceEl.textContent = formatPrice(price);
			}
		}
	} catch (error) {
		console.log("Birdeye API unavailable, using default price");
	}
}

function updateMockMetrics() {
	// Price variation
	const swing = (Math.random() - 0.45) * price * 0.05;
	price = Math.max(0.000001, price + swing);
	
	holders += Math.floor(Math.random() * 9);
	volume += Math.floor(Math.random() * 12000);

	if (priceEl) priceEl.textContent = formatPrice(price);
	if (holdersEl) holdersEl.textContent = formatNumber(holders);
	if (volumeEl) volumeEl.textContent = `$${formatNumber(volume)}`;
}

// Fetch real price on page load
fetchRealPrice();

// Update metrics every 5 seconds
setInterval(updateMockMetrics, 5000);

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
