const TOKEN_ADDRESS = "3dk9CNre8tmv6bbNXd5F6dgkNnEzsyQ7sPhVT8kKpump";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

async function getHolderCount() {
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

export default async () => {
	try {
		const holders = await getHolderCount();
		return Response.json({ holders });
	} catch (error) {
		console.error("Holders function error:", error);
		return Response.json({ error: "Impossible de lire les holders" }, { status: 500 });
	}
};

export const config = {
	path: "/api/holders",
};