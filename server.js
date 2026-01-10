const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const MARKET_CAP_PER_DAY = 15000;
const SECONDS_PER_DAY = 86400;

function secondsSinceMidnightUTC() {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return Math.floor((now - midnight) / 1000);
}

app.get("/counter", (req, res) => {
  const seconds = secondsSinceMidnightUTC();
  const value = (seconds * MARKET_CAP_PER_DAY) / SECONDS_PER_DAY;

  res.json({
    value,
    marketCapPerDay: MARKET_CAP_PER_DAY,
    serverTime: Date.now()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Backend running on port", PORT)
);
