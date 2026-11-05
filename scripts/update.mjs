// Pulls this week's long episodes from the YouTube channel feed and saves data/week.json + thumbnails.
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises"

const CHANNEL_ID = "UC-EAaNIDtW85oo7eDU1tlnQ"
const DAYS = 7
const SHOWS = ["وش كنا نقول", "سري للغاية", "من راعي السالفة", "هذي قائمتي"]
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]

const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
const bare = s => s.replace(/[ً-ٰٟـ؟?]/g, "").replace(/\s+/g, " ").trim()
const clean = s => s.replace(/[⁦-⁩‎‏]/g, "").replace(/\p{Extended_Pictographic}|️/gu, "").replace(/\s+/g, " ").trim()
const program = (title, after) => {
  const hit = SHOWS.find(s => bare(title + " " + after).includes(s))
  if (hit) return hit
  if (/فلوق/.test(title + after)) return "فلوقات مخرج"
  return bare(after).replace(/^بودكاست\s+/, "").replace(/\s+مع\s+.*$/, "").trim() || "مخرج ثمانية"
}
const riyadh = d => {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "numeric", day: "numeric" }).format(d).split("-").map(Number)
  return { y, m, day }
}

const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, { headers: { "user-agent": "Mozilla/5.0" } })
if (!res.ok) throw new Error(`YouTube feed ${res.status}`)
const xml = await res.text()
const now = new Date(), from = new Date(now - DAYS * 864e5)

const episodes = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
  const e = m[1]
  const id = (e.match(/<yt:videoId>([^<]+)</) || [])[1]
  const link = (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || ""
  const raw = clean(decode((e.match(/<title>([^<]*)</) || [])[1] || ""))
  const published = (e.match(/<published>([^<]+)</) || [])[1]
  const [t, ...rest] = raw.split(" | ")
  return { id, link, published, title: t.trim(), program: program(t, rest.join(" | ")) }
}).filter(e => e.id && e.link.includes("/watch?v=") && new Date(e.published) >= from)
  .sort((a, b) => new Date(a.published) - new Date(b.published))

await mkdir("data/thumbs", { recursive: true })
for (const f of await readdir("data/thumbs")) if (!episodes.some(e => f === `${e.id}.jpg`)) await unlink(`data/thumbs/${f}`)
for (const e of episodes) {
  for (const name of ["maxresdefault", "hqdefault"]) {
    const r = await fetch(`https://i.ytimg.com/vi/${e.id}/${name}.jpg`)
    if (r.ok) { await writeFile(`data/thumbs/${e.id}.jpg`, Buffer.from(await r.arrayBuffer())); break }
  }
}

const a = riyadh(new Date(now - (DAYS - 1) * 864e5)), b = riyadh(now)
const rangeLabel = a.m === b.m && a.y === b.y
  ? `${a.day} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`
  : `${a.day} ${MONTHS[a.m - 1]}${a.y !== b.y ? " " + a.y : ""} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`
const pad = n => String(n).padStart(2, "0")
const week = {
  weekOf: `${b.y}-${pad(b.m)}-${pad(b.day)}`, rangeLabel, fetchedAt: now.toISOString(),
  channel: "https://www.youtube.com/@thmanyahexit",
  episodes: episodes.map(e => ({ id: e.id, title: e.title, program: e.program, published: e.published,
    url: `https://www.youtube.com/watch?v=${e.id}`, thumb: `data/thumbs/${e.id}.jpg` })),
}
await writeFile("data/week.json", JSON.stringify(week, null, 2) + "\n")
console.log(`${episodes.length} episodes · ${rangeLabel}`)
