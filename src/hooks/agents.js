import { db } from '../lib/db'
import { ai } from '../lib/ai'
import { briefPrompt } from './useBrief'

export const today = () => new Date().toISOString().slice(0, 10)

// AGENT 02 — writes today's content pack and stores it.
export async function generateContentPack({ brief, plan, recentHooks = [] }) {
  const { json } = await ai.run(
    `You are the Content Agent at the agency "All We Do". Produce today's content pack for this product.

${briefPrompt(brief)}

${plan ? `Current positioning: ${plan.positioning}\nAudience insight: ${plan.audienceInsight || ''}` : ''}
${recentHooks.length ? `Hooks already used (do NOT repeat the angle):\n${recentHooks.join(' | ')}` : ''}

Return JSON: { "posts": [ { "channel": "X|LinkedIn|Instagram|TikTok|Reddit|Email", "format": "post" or "video", "hook": "scroll-stopping first line", "body": "the post text, or for video a shot-by-shot script with timings", "cta": "one call to action", "hashtags": ["#tag"], "visualIdea": "what the image or thumbnail should show" } ] }
Give exactly 5 items: at least one video script and one LinkedIn or Email item. Vary the angle: proof, pain, behind-the-scenes, comparison, quick tip. Match this brand tone: ${brief.tone || 'clear and confident'}.`,
    { json: true },
  )
  const list = json?.posts
  if (!Array.isArray(list) || !list.length) throw new Error('The Content Agent came back empty. Try again.')
  await db.insertMany('content-posts', list.map((p) => ({ ...p, status: 'draft', day: today() })))
  return list.length
}

// AGENT 04 — reads yesterday's results and rewrites how the agency markets you.
export async function generateLearning({ brief, plan, metrics = [], posts = [], leads = [] }) {
  const recentMetrics = metrics
    .slice(0, 10)
    .map((m) => `${m.day}: reach ${m.reach ?? '-'}, clicks ${m.clicks ?? '-'}, signups ${m.signups ?? '-'}, revenue ${m.revenue ?? '-'}`)
    .join('\n')
  const posted = posts.filter((p) => p.status === 'posted').slice(0, 12)
  const stageCount = leads.reduce((a, l) => {
    const s = l.stage || 'new'
    a[s] = (a[s] || 0) + 1
    return a
  }, {})

  const { json } = await ai.run(
    `You are the Learning Agent at the agency "All We Do". Every day you study the results and
change how the agency markets this product. Be concrete and decisive — name what to stop, start and double down on.

${briefPrompt(brief)}
${plan ? `Current positioning: ${plan.positioning}` : ''}

Results logged so far (newest first):
${recentMetrics || 'no metrics logged yet'}

Content actually published:
${posted.map((p) => `${p.channel} (${p.format}): ${p.hook}`).join('\n') || 'nothing published yet'}

Outreach pipeline: ${JSON.stringify(stageCount)}

Return JSON: {
  "readout": "one paragraph on what the numbers actually say (say plainly if there is not enough data yet)",
  "working": ["what is working"],
  "stopping": ["what to stop or cut"],
  "changeToday": "the single change to make in today's marketing",
  "experiment": { "name": "experiment name", "hypothesis": "...", "measure": "the metric that decides it" },
  "confidence": "low|medium|high"
}`,
    { json: true },
  )
  if (!json?.readout) throw new Error('The Learning Agent came back empty. Try again.')
  await db.insert('agent-log', { ...json, day: today() })
  return json
}
