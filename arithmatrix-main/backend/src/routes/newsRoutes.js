import { Router } from 'express';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search';
const NEWS_REGIONS = [
  { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' }
];

const TOPIC_CONFIG = {
  'upcoming-tech': {
    key: 'upcoming-tech',
    kicker: 'Innovation Radar',
    title: 'Upcoming Technologies News',
    subtitle: 'Live updates on AI, robotics, semiconductors, and next-generation innovation.',
    query: '(upcoming technology OR emerging technology OR robotics OR AI chip OR quantum computing)'
  },
  voice: {
    key: 'voice',
    kicker: 'Voice + Devices',
    title: 'Mobile Phones & Electronics News',
    subtitle: 'Recent updates about smartphones, wearables, and consumer electronics.',
    query: '(smartphone launch OR mobile phone news OR consumer electronics OR wearable devices)'
  },
  camera: {
    key: 'camera',
    kicker: 'Vision Tech',
    title: 'Latest Camera News',
    subtitle: 'Fresh news about cameras, imaging sensors, and photography hardware.',
    query: '(camera launch OR mirrorless camera OR photography gear OR imaging sensor)'
  },
  currency: {
    key: 'currency',
    kicker: 'Money Watch',
    title: 'Latest Currency Market News',
    subtitle: 'Recent updates on forex, dollar, rupee, and global currency movements.',
    query: '(currency market OR forex market OR USD INR OR rupee dollar OR central bank rates)'
  },
  weather: {
    key: 'weather',
    kicker: 'Climate Alerts',
    title: 'Latest Weather Event News',
    subtitle: 'Recent events caused by weather: storms, floods, heatwaves, and disasters.',
    query: '(extreme weather event OR storms OR flood OR wildfire OR heatwave OR cyclone)'
  },
  history: {
    key: 'history',
    kicker: 'Global Roundup',
    title: 'Overall World News',
    subtitle: 'A broad news view across world affairs, economy, science, and technology.',
    query: '(world news OR global latest news OR international news)'
  },
  assistant: {
    key: 'assistant',
    kicker: 'AI Assistant Watch',
    title: 'Latest AI Assistant News',
    subtitle: 'Recent AI assistant, automation, and productivity tool updates.',
    query: '(AI assistant OR agentic AI OR productivity AI tools)'
  },
  education: {
    key: 'education',
    kicker: 'Campus Bulletin',
    title: 'Education & Entrance News',
    subtitle:
      'Latest updates on college admissions, entrance exams, scholarships, and education policy.',
    query:
      '(college admission OR university admission OR entrance exam OR JEE OR NEET OR SAT OR ACT OR scholarship OR education policy)'
  }
};

const FEED_CACHE = new Map();

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(text) {
  return decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTagContent(block, tag) {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return block.match(regex)?.[1] || '';
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 44);
}

function simpleHash(input) {
  let value = 0;
  for (const char of String(input || '')) {
    value = (value * 31 + char.charCodeAt(0)) >>> 0;
  }
  return value.toString(36);
}

function formatFreshness(timestamp) {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return 'recent';

  const deltaMs = Date.now() - time;
  if (deltaMs < 0) return 'just now';

  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function estimateReadTime(summary) {
  const words = String(summary || '')
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(2, Math.min(8, Math.round(words / 170) || 2));
  return `${minutes} min read`;
}

function formatPublishedLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function computeMomentumScore(index, publishedAt) {
  let score = 97 - index * 2;

  const time = new Date(publishedAt).getTime();
  if (Number.isFinite(time)) {
    const ageHours = Math.max(0, (Date.now() - time) / (60 * 60 * 1000));
    if (ageHours > 6) score -= 2;
    if (ageHours > 24) score -= 4;
    if (ageHours > 48) score -= 6;
  }

  return Math.max(72, Math.min(98, Math.round(score)));
}

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function inferCategory(topicKey, title) {
  const text = String(title || '').toLowerCase();

  if (topicKey === 'voice') {
    if (/(iphone|android|smartphone|mobile)/.test(text)) return 'Mobile';
    if (/(wearable|earbuds|watch)/.test(text)) return 'Wearables';
    return 'Electronics';
  }

  if (topicKey === 'camera') {
    if (/(sensor|imaging|optics)/.test(text)) return 'Imaging';
    if (/(lens|photo|photography)/.test(text)) return 'Photography';
    return 'Camera';
  }

  if (topicKey === 'currency') {
    if (/(rupee|inr|usd|dollar|euro|yen|pound)/.test(text)) return 'Forex';
    if (/(bitcoin|crypto|usdt|stablecoin)/.test(text)) return 'Crypto';
    return 'Currency';
  }

  if (topicKey === 'weather') {
    if (/(flood|rain|storm|cyclone|hurricane)/.test(text)) return 'Storms';
    if (/(heat|wildfire|drought)/.test(text)) return 'Heat & Fire';
    if (/(snow|blizzard|cold)/.test(text)) return 'Cold Wave';
    return 'Weather';
  }

  if (topicKey === 'history') {
    if (/(election|president|government|policy|war)/.test(text)) return 'World Affairs';
    if (/(market|economy|inflation|trade)/.test(text)) return 'Economy';
    if (/(science|space|technology|ai)/.test(text)) return 'Science & Tech';
    return 'World';
  }

  if (topicKey === 'assistant') {
    if (/(agent|copilot|assistant|chatbot)/.test(text)) return 'Assistants';
    if (/(model|llm|ai)/.test(text)) return 'AI Models';
    return 'Automation';
  }

  if (topicKey === 'education') {
    if (/(jee|neet|sat|act|cat|gate|exam)/.test(text)) return 'Entrance Exams';
    if (/(admission|counselling|counseling|application|deadline)/.test(text)) return 'Admissions';
    if (/(scholarship|fellowship|financial aid)/.test(text)) return 'Scholarships';
    if (/(college|university|campus)/.test(text)) return 'College Updates';
    return 'Education';
  }

  if (/(robot|automation|humanoid)/.test(text)) return 'Robotics';
  if (/(chip|semiconductor|processor)/.test(text)) return 'Semiconductors';
  if (/(quantum)/.test(text)) return 'Quantum';
  if (/(battery|energy|ev)/.test(text)) return 'Energy';
  if (/(satellite|space|rocket)/.test(text)) return 'Space Tech';
  if (/(cyber|security)/.test(text)) return 'Cybersecurity';
  if (/(xr|ar|vr)/.test(text)) return 'AR/VR';
  return 'Tech';
}

function parseRssItems(xml) {
  const blocks = [];
  const pattern = /<item>([\s\S]*?)<\/item>/gi;
  let match = pattern.exec(xml);

  while (match) {
    blocks.push(match[1]);
    match = pattern.exec(xml);
  }

  return blocks;
}

function extractStories(topicKey, xml, maxStories = 9, regionLabel = 'Global') {
  const blocks = parseRssItems(xml);

  return blocks
    .slice(0, maxStories)
    .map((block, index) => {
      const title = stripTags(getTagContent(block, 'title'));
      const link = stripTags(getTagContent(block, 'link'));
      const description = stripTags(getTagContent(block, 'description'));
      const source = stripTags(getTagContent(block, 'source'));
      const publishedAtRaw = stripTags(getTagContent(block, 'pubDate'));
      const publishedAtIso = toIsoDate(publishedAtRaw);
      const summary = description || title || 'Read full coverage.';
      const category = inferCategory(topicKey, title);
      const momentum = computeMomentumScore(index, publishedAtIso);

      return {
        id: `${slugify(topicKey)}-${simpleHash(`${title}-${link}-${index}`)}`,
        title: title || 'Untitled update',
        summary,
        category,
        source: source ? `${source} (${regionLabel})` : `Google News (${regionLabel})`,
        url: link || null,
        publishedAt: publishedAtIso,
        stage: 'Live Update',
        eta: formatPublishedLabel(publishedAtIso),
        momentum,
        freshness: formatFreshness(publishedAtIso),
        readTime: estimateReadTime(summary)
      };
    })
    .filter((item) => Boolean(item.title));
}

function getRegionLabel(region) {
  return region.gl === 'IN' ? 'India' : 'International';
}

function normalizeStoryKey(story) {
  return `${String(story?.title || '').toLowerCase().trim()}|${String(story?.url || '')
    .toLowerCase()
    .trim()}`;
}

function applyStoryDerivedFields(story, index) {
  const publishedAt = toIsoDate(story?.publishedAt);
  const summary = String(story?.summary || story?.title || 'Read full coverage.');

  return {
    ...story,
    publishedAt,
    summary,
    eta: formatPublishedLabel(publishedAt),
    freshness: formatFreshness(publishedAt),
    readTime: estimateReadTime(summary),
    momentum: computeMomentumScore(index, publishedAt)
  };
}

async function fetchRssStoriesByRegion(topicKey, config, region, maxStoriesPerRegion) {
  const query = `${config.query} when:3d`;
  const params = new URLSearchParams({
    q: query,
    hl: region.hl,
    gl: region.gl,
    ceid: region.ceid
  });

  const response = await fetch(`${GOOGLE_NEWS_RSS_URL}?${params.toString()}`, {
    headers: {
      'User-Agent': 'ArithMatrix News Bot/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${getRegionLabel(region)} news feed right now.`);
  }

  const xml = await response.text();
  return extractStories(topicKey, xml, maxStoriesPerRegion, getRegionLabel(region));
}

async function fetchTopicStories(topicKey) {
  const config = TOPIC_CONFIG[topicKey];
  if (!config) {
    throw new Error('Unsupported news topic.');
  }

  const regionResults = await Promise.allSettled(
    NEWS_REGIONS.map((region) => fetchRssStoriesByRegion(topicKey, config, region, 7))
  );

  const merged = [];
  const seen = new Set();

  for (const result of regionResults) {
    if (result.status !== 'fulfilled') continue;
    for (const story of result.value) {
      const key = normalizeStoryKey(story);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(story);
    }
  }

  const stories = merged
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10)
    .map((story, index) => applyStoryDerivedFields(story, index));

  if (!stories.length) {
    throw new Error('News feed is temporarily empty.');
  }

  return stories;
}

async function resolveTopicFeed(topicKey, { forceRefresh = false } = {}) {
  const config = TOPIC_CONFIG[topicKey];
  const now = Date.now();
  const cached = FEED_CACHE.get(topicKey);
  const isFresh = cached && now - cached.fetchedAt < TWO_HOURS_MS;

  if (!forceRefresh && isFresh) {
    return {
      ...cached.payload,
      cacheAgeSec: Math.max(0, Math.floor((now - cached.fetchedAt) / 1000)),
      nextRefreshAt: new Date(cached.fetchedAt + TWO_HOURS_MS).toISOString(),
      warnings: []
    };
  }

  try {
    const stories = await fetchTopicStories(topicKey);
    const fetchedAt = Date.now();
    const payload = {
      topic: config.key,
      kicker: config.kicker,
      title: config.title,
      subtitle: config.subtitle,
      stories,
      updatedAt: new Date(fetchedAt).toISOString(),
      refreshIntervalSec: TWO_HOURS_MS / 1000
    };

    FEED_CACHE.set(topicKey, { fetchedAt, payload });

    return {
      ...payload,
      cacheAgeSec: 0,
      nextRefreshAt: new Date(fetchedAt + TWO_HOURS_MS).toISOString(),
      warnings: []
    };
  } catch (error) {
    if (!cached) {
      throw error;
    }

    return {
      ...cached.payload,
      cacheAgeSec: Math.max(0, Math.floor((now - cached.fetchedAt) / 1000)),
      nextRefreshAt: new Date(cached.fetchedAt + TWO_HOURS_MS).toISOString(),
      warnings: [error?.message || 'Showing cached feed while live source is unavailable.']
    };
  }
}

export const newsRouter = Router();

newsRouter.get('/feed', async (req, res, next) => {
  try {
    const topic = String(req.query?.topic || 'upcoming-tech')
      .trim()
      .toLowerCase();
    const forceRefresh = ['1', 'true', 'yes'].includes(String(req.query?.refresh || '').toLowerCase());

    if (!TOPIC_CONFIG[topic]) {
      return res.status(400).json({
        message: `Unsupported topic. Use one of: ${Object.keys(TOPIC_CONFIG).join(', ')}`
      });
    }

    const payload = await resolveTopicFeed(topic, { forceRefresh });
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});
