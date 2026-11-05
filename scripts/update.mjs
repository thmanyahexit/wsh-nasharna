// يجلب حلقات آخر 7 أيام من قناة مخرج ثمانية ويكتبها في episodes.json
import { writeFileSync, existsSync } from 'node:fs';

const HANDLE = 'thmanyahexit';
const DAYS = 7;
const UA = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ar' };

async function channelId() {
  if (process.env.CHANNEL_ID) return process.env.CHANNEL_ID;
  const html = await (await fetch(`https://www.youtube.com/@${HANDLE}`, { headers: UA })).text();
  const m = html.match(/"channelId":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/);
  if (!m) throw new Error('ما قدرت أحدد channelId');
  return m[1];
}

// الشورتس ما نبيها: رابط /shorts/ID يرجع 200 للشورت ويحوّل للفيديو العادي
async function isShort(id) {
  const r = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual', headers: UA });
  return r.status === 200;
}

const id = await channelId();
const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { headers: UA })).text();
const to = new Date(), from = new Date(to - DAYS * 864e5);
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
  id: e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)[1],
  title: e.match(/<title>([\s\S]*?)<\/title>/)[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
  published: e.match(/<published>(.*?)<\/published>/)[1],
}));

const episodes = [];
for (const e of entries) {
  if (new Date(e.published) < from) continue;
  if (await isShort(e.id)) continue;
  const clip = `clips/${e.id}.mp4`;
  episodes.push({
    ...e,
    url: `https://www.youtube.com/watch?v=${e.id}`,
    thumb: `https://i.ytimg.com/vi/${e.id}/maxresdefault.jpg`,
    clip: existsSync(clip) ? clip : null,
  });
}
episodes.sort((a, b) => new Date(a.published) - new Date(b.published));

writeFileSync('episodes.json', JSON.stringify({ from, to, channelId: id, episodes }, null, 2));
console.log(`${episodes.length} حلقة`);
