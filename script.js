const formatPrice = (value) => `$${value.toFixed(6)}`;
const formatNumber = (value) => value.toLocaleString("fr-FR");

const priceEl = document.getElementById("priceValue");
const holdersEl = document.getElementById("holdersValue");
const volumeEl = document.getElementById("volumeValue");

let price = 0.000042;
let holders = 5821;
let volume = 182340;

function updateMockMetrics() {
  const swing = (Math.random() - 0.45) * 0.000004;
  price = Math.max(0.000001, price + swing);
  holders += Math.floor(Math.random() * 9);
  volume += Math.floor(Math.random() * 12000);

  if (priceEl) priceEl.textContent = formatPrice(price);
  if (holdersEl) holdersEl.textContent = formatNumber(holders);
  if (volumeEl) volumeEl.textContent = `$${formatNumber(volume)}`;
}

updateMockMetrics();
setInterval(updateMockMetrics, 2200);

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
