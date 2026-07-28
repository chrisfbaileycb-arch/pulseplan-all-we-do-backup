import { useState } from 'react'
import { Sparkles, Copy, Check, Image as ImageIcon, CheckCircle2, Trash2, AlertCircle, Film } from 'lucide-react'
import { db } from '../lib/db'
import { ai } from '../lib/ai'
import { useLive } from '../lib/useLive'
import { useBrief } from '../hooks/useBrief'
import { generateContentPack, today } from '../hooks/agents'
import { Card, SectionTitle, AgentButton, Empty, Pill } from '../components/UI'

function PostCard({ post, delay }) {
  const [copied, setCopied] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [err, setErr] = useState('')

  const text = `${post.hook}\n\n${post.body}\n\n${(post.hashtags || []).join(' ')}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setErr('Copy blocked — select the text manually.')
    }
  }

  const makeVisual = async () => {
    setImgBusy(true)
    setErr('')
    try {
      const res = await ai.run(
        `Marketing visual for a social post. Subject: ${post.visualIdea || post.hook}. Clean modern brand graphic, bold shapes, high contrast, no text overlays, no watermarks.`,
        { image: true, aspectRatio: post.format === 'video' ? '9:16' : '1:1' },
      )
      const url = res?.images?.[0]
      if (!url) {
        setErr('No visual came back. Try again.')
        return
      }
      await db.update('content-posts', post.id, { imageUrl: url })
    } catch (e) {
      setErr(e?.message || 'Visual generation failed.')
    } finally {
      setImgBusy(false)
    }
  }

  return (
    <Card delay={delay} className={post.status === 'posted' ? 'opacity-70' : ''}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill tone={post.format === 'video' ? 'gold' : 'cyan'}>{post.channel}</Pill>
          {post.format === 'video' && (
            <span className="flex items-center gap-1 text-[10px] text-amber-300/80"><Film size={11} /> SCRIPT</span>
          )}
        </div>
        {post.status === 'posted' && <Pill tone="green">POSTED</Pill>}
      </div>

      <p className="font-display text-white mt-3 leading-snug">{post.hook}</p>
      <p className="text-sm text-sky-200/70 mt-2 whitespace-pre-wrap">{post.body}</p>
      {post.cta && <p className="text-sm text-secondary mt-2">{post.cta}</p>}
      {(post.hashtags || []).length > 0 && (
        <p className="text-[11px] text-primary/70 mt-2">{post.hashtags.join('  ')}</p>
      )}

      {post.imageUrl && !imgFailed && (
        <img
          src={post.imageUrl}
          alt=""
          onError={() => setImgFailed(true)}
          className="mt-3 w-full rounded-xl border border-sky-400/15"
        />
      )}
      {imgFailed && (
        <div className="mt-3 h-32 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-sky-400/15 flex items-center justify-center text-xs text-sky-200/60">
          Visual unavailable
        </div>
      )}

      {err && (
        <p className="text-[11px] text-amber-300 mt-2 flex items-center gap-1"><AlertCircle size={12} /> {err}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/6 border border-white/10 text-sky-100 active:scale-95 transition"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
        </button>
        {!post.imageUrl && (
          <button
            onClick={makeVisual}
            disabled={imgBusy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-primary/12 border border-primary/30 text-primary active:scale-95 transition disabled:opacity-50"
          >
            <ImageIcon size={13} /> {imgBusy ? 'Drawing…' : 'Visual'}
          </button>
        )}
        <button
          onClick={() => db.update('content-posts', post.id, { status: post.status === 'posted' ? 'draft' : 'posted' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-secondary/12 border border-secondary/30 text-secondary active:scale-95 transition"
        >
          <CheckCircle2 size={13} /> {post.status === 'posted' ? 'Undo' : 'Mark posted'}
        </button>
        <button
          onClick={() => db.delete('content-posts', post.id)}
          className="ml-auto p-2 rounded-lg text-sky-200/40 hover:text-rose-300 transition"
          aria-label="Delete post"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  )
}

export default function Content() {
  const { brief } = useBrief()
  const { data: posts } = useLive('content-posts', { order: '-createdAt', limit: 60 })
  const { data: plans } = useLive('strategy-plans', { order: '-createdAt', limit: 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!brief) return
    setBusy(true)
    setError('')
    try {
      await generateContentPack({
        brief,
        plan: plans?.[0],
        recentHooks: (posts || []).slice(0, 8).map((p) => p.hook).filter(Boolean),
      })
    } catch (e) {
      setError(e?.message || 'The agent could not finish. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!brief) {
    return (
      <div>
        <SectionTitle kicker="AGENT 02" title="Content Agent" />
        <Empty icon={Sparkles} title="No product brief yet" body="Add your product brief and the Content Agent can start writing daily posts in your voice." />
      </div>
    )
  }

  const todays = (posts || []).filter((p) => p.day === today())

  return (
    <div>
      <SectionTitle
        kicker="AGENT 02"
        title="Content Agent"
        right={<AgentButton onClick={run} busy={busy}>GENERATE TODAY'S PACK</AgentButton>}
      />
      <p className="text-sm text-sky-200/55 -mt-2 mb-5 max-w-2xl">
        Five fresh pieces a day — captions, video scripts and visuals. The agent avoids angles it
        already used, so the feed keeps evolving. Video items come as shot-by-shot scripts you film
        or edit; the app writes and designs, it doesn't render footage.
      </p>

      {error && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {todays.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Pill tone="green">{todays.length} generated today</Pill>
          <Pill tone="dim">{(posts || []).filter((p) => p.status === 'posted').length} posted all-time</Pill>
        </div>
      )}

      {!posts?.length ? (
        <Empty
          icon={Sparkles}
          title="Nothing in the queue"
          body={`Run the agent to get today's five pieces for ${brief.name}.`}
          action={<AgentButton onClick={run} busy={busy}>GENERATE TODAY'S PACK</AgentButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} delay={i * 50} />
          ))}
        </div>
      )}
    </div>
  )
}
