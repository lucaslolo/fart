const TOKEN_ADDRESS = "3dk9CNre8tmv6bbNXd5F6dgkNnEzsyQ7sPhVT8kKpump";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const CACHE_TTL_MS = 120000;

let cachedPayload = null;
let cachedAt = 0;

async function fetchBestPair() {
	const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`);

	if (!response.ok) {
		throw new Error(`DexScreener error: ${response.status}`);
	}

	const data = await response.json();
	const pairs = Array.isArray(data.pairs) ? data.pairs : [];
	const bestPair = pairs.reduce((best, pair) => {
		if (!best) return pair;
		const bestScore = (best.liquidity?.usd || 0) + (best.volume?.h24 || 0);
		const pairScore = (pair.liquidity?.usd || 0) + (pair.volume?.h24 || 0);
		return pairScore > bestScore ? pair : best;
	}, null);

	return { pairs, bestPair };
}

async function fetchHolderCount() {
	const response = await fetch("https://api.mainnet-beta.solana.com", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "getProgramAccounts",
			params: [
				TOKEN_PROGRAM_ID,
				{
					encoding: "jsonParsed",
					filters: [
						{ dataSize: 165 },
						{ memcmp: { offset: 0, bytes: TOKEN_ADDRESS } },
					],
				},
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`RPC error: ${response.status}`);
	}

	const data = await response.json();
	const owners = new Set();

	for (const account of data.result || []) {
		const parsed = account?.account?.data?.parsed?.info;
		const owner = parsed?.owner;
		const amount = Number(parsed?.tokenAmount?.uiAmount || 0);

		if (owner && amount > 0) {
			owners.add(owner);
		}
	}

	return owners.size;
}

async function getMetrics() {
	const [pairData, holders] = await Promise.all([
		fetchBestPair(),
		fetchHolderCount(),
	]);

	const bestPair = pairData.bestPair;

	return {
		price: Number(bestPair?.priceUsd || 0),
		marketCap: Number(bestPair?.marketCap || bestPair?.fdv || 0),
		volume: Number(bestPair?.volume?.h24 || 0),
		holders,
		pairs: pairData.pairs,
		bestPair,
	};
}

export default async () => {
	try {
		const now = Date.now();
		if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
			return Response.json(cachedPayload);
		}

		const payload = await getMetrics();
		cachedPayload = payload;
		cachedAt = now;
		return Response.json(payload);
	} catch (error) {
		console.error("Metrics function error:", error);
		return Response.json({ error: "Impossible de charger les métriques" }, { status: 500 });
	}
};

export const config = {
	path: "/api/metrics",
};