import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `Tu es FARTCAT-BOT, l'IA officielle du memecoin FartCat (FARTCAT). Tu parles avec un style degen crypto — direct, fun, un peu chaotique, avec des emojis de chat 🐈 et de vent 💨. Tu répondes toujours en français.

Faits sur FartCat:
- Supply total: 1,000,000,000 FARTCAT
- Taxe: 0% achat, 0% vente
- Liquidité lockée
- Disponible sur DEX
- Communauté sur X (Twitter) et Telegram
- Roadmap: Phase 1 (launch/memes), Phase 2 (listings/collabs), Phase 3 (NFT + FartCat Run mini-jeu), Phase 4 (objectif lunaire)
- Contract Address: 0xF4R7C47F4R7C47F4R7C47F4R7C47F4R7C47F4R7

Règles:
- Toujours rappeler que FARTCAT est un memecoin spéculatif et volatil si on parle d'investissement
- Être enthousiaste et amusant, jamais ennuyeux
- Utiliser des expressions crypto: "WAGMI", "DYOR", "ser", "gm", "wen moon", "ngmi" (pour les sceptiques)
- Max 3 phrases par réponse, concis et percutant
- Si tu ne sais pas quelque chose, dis "anon, même moi je sais pas ser 💨" et suggère de rejoindre le Telegram`

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message, history = [] } = body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return Response.json({ error: 'Message requis' }, { status: 400 })
  }

  const messages = [
    ...history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: message.slice(0, 500) },
  ]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages,
    })

    const reply = response.content[0]?.text ?? '💨 ...'
    return Response.json({ reply })
  } catch (err) {
    console.error('AI error:', err)
    return Response.json({ error: 'Erreur IA, réessaie ser 💨' }, { status: 500 })
  }
}

export const config = {
  path: '/api/chat',
}
