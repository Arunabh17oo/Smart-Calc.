import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchNewsFeed } from '../api/newsApi.js';

const TOPIC_FALLBACK = {
  'upcoming-tech': {
    kicker: 'Innovation Radar',
    title: 'Upcoming Technologies News',
    subtitle: 'Live updates on AI, robotics, semiconductors, and next-generation innovation.'
  },
  voice: {
    kicker: 'Voice + Devices',
    title: 'Mobile Phones & Electronics News',
    subtitle: 'Recent updates about smartphones, wearables, and consumer electronics.'
  },
  camera: {
    kicker: 'Vision Tech',
    title: 'Latest Camera News',
    subtitle: 'Fresh news about cameras, imaging sensors, and photography hardware.'
  },
  currency: {
    kicker: 'Money Watch',
    title: 'Latest Currency Market News',
    subtitle: 'Recent updates on forex, rupee-dollar movement, and global currency trends.'
  },
  weather: {
    kicker: 'Climate Alerts',
    title: 'Latest Weather Event News',
    subtitle: 'Recent events caused by weather, including storms, floods, heatwaves, and wildfires.'
  },
  history: {
    kicker: 'Global Roundup',
    title: 'Overall World News',
    subtitle: 'A broad world news stream across current affairs, economy, science, and technology.'
  },
  assistant: {
    kicker: 'AI Assistant Watch',
    title: 'Latest AI Assistant News',
    subtitle: 'Recent updates in AI assistants, automation, and productivity tools.'
  },
  education: {
    kicker: 'Campus Bulletin',
    title: 'Education & Entrance News',
    subtitle:
      'Latest updates on college admissions, entrance exams, scholarships, and education policy.'
  }
};

function normalizeTopicKey(topic) {
  const key = String(topic || '').trim().toLowerCase();
  return TOPIC_FALLBACK[key] ? key : 'upcoming-tech';
}

function toSearchableText(story) {
  return `${story.title} ${story.summary} ${story.category} ${story.stage} ${story.source}`.toLowerCase();
}

function getMomentumLabel(value) {
  if (value >= 93) return 'Very High';
  if (value >= 87) return 'High';
  if (value >= 80) return 'Moderate';
  return 'Emerging';
}

function formatTimestamp(value) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatNextRefresh(nowTick, timestamp) {
  if (!timestamp) return 'in ~2h';
  const target = new Date(timestamp).getTime();
  if (!Number.isFinite(target)) return 'in ~2h';

  const deltaSec = Math.max(0, Math.floor((target - nowTick) / 1000));
  const hours = Math.floor(deltaSec / 3600);
  const mins = Math.floor((deltaSec % 3600) / 60);

  if (hours <= 0) return `in ${Math.max(1, mins)}m`;
  return `in ${hours}h ${mins}m`;
}

function openStory(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TechNewsSection({ topic = 'upcoming-tech' }) {
  const topicKey = normalizeTopicKey(topic);
  const titleId = `tech-news-title-${topicKey}`;
  const fallbackCopy = TOPIC_FALLBACK[topicKey];

  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadNews = useCallback(
    async ({ forceRefresh = false, silent = false } = {}) => {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);
      setError('');

      try {
        const data = await fetchNewsFeed(topicKey, { forceRefresh });
        setFeed(data);
        setSelectedStoryId((prev) =>
          prev && data?.stories?.some((story) => story.id === prev) ? prev : data?.stories?.[0]?.id || ''
        );
      } catch (err) {
        setError(err.message || 'Could not load live news feed');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [topicKey]
  );

  useEffect(() => {
    setActiveCategory('All');
    setQuery('');
    setSelectedStoryId('');
    loadNews();
  }, [topicKey, loadNews]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const refreshSec = Number(feed?.refreshIntervalSec);
    if (!Number.isFinite(refreshSec) || refreshSec <= 0) return undefined;

    const interval = window.setInterval(() => {
      loadNews({ silent: true });
    }, refreshSec * 1000);

    return () => window.clearInterval(interval);
  }, [feed?.refreshIntervalSec, loadNews]);

  const stories = useMemo(() => feed?.stories || [], [feed?.stories]);
  const categories = useMemo(() => {
    return ['All', ...new Set(stories.map((story) => story.category).filter(Boolean))];
  }, [stories]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [activeCategory, categories]);

  const filteredStories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return stories
      .filter((story) => {
        const inCategory = activeCategory === 'All' || story.category === activeCategory;
        const matchesQuery = !normalizedQuery || toSearchableText(story).includes(normalizedQuery);
        return inCategory && matchesQuery;
      })
      .sort((a, b) => b.momentum - a.momentum);
  }, [stories, activeCategory, query]);

  const featuredStory = useMemo(() => {
    return filteredStories.find((story) => story.id === selectedStoryId) || filteredStories[0] || null;
  }, [filteredStories, selectedStoryId]);

  const averageMomentum = useMemo(() => {
    if (!filteredStories.length) return 0;
    const total = filteredStories.reduce((sum, story) => sum + Number(story.momentum || 0), 0);
    return Math.round(total / filteredStories.length);
  }, [filteredStories]);

  const gridStories = useMemo(() => {
    if (!featuredStory) return filteredStories;
    return filteredStories.filter((story) => story.id !== featuredStory.id);
  }, [filteredStories, featuredStory]);

  const storyCountLabel = filteredStories.length === 1 ? 'story' : 'stories';
  const sectionKicker = feed?.kicker || fallbackCopy.kicker;
  const sectionTitle = feed?.title || fallbackCopy.title;
  const sectionSubtitle = feed?.subtitle || fallbackCopy.subtitle;

  function handleCardPointerMove(event) {
    if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) return;

    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
    const ratioY = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty('--card-rotate-x', `${(-ratioY * 8).toFixed(2)}deg`);
    card.style.setProperty('--card-rotate-y', `${(ratioX * 11).toFixed(2)}deg`);
    card.style.setProperty('--card-shift-x', `${(ratioX * 18).toFixed(2)}px`);
    card.style.setProperty('--card-shift-y', `${(ratioY * 14).toFixed(2)}px`);
  }

  function handleCardPointerLeave(event) {
    const card = event.currentTarget;
    card.style.setProperty('--card-rotate-x', '0deg');
    card.style.setProperty('--card-rotate-y', '0deg');
    card.style.setProperty('--card-shift-x', '0px');
    card.style.setProperty('--card-shift-y', '0px');
  }

  return (
    <section className="tech-news-panel" aria-labelledby={titleId}>
      <div className="tech-news-head">
        <div>
          <p className="tech-news-kicker">{sectionKicker}</p>
          <h2 id={titleId}>{sectionTitle}</h2>
          <p className="tech-news-subtitle">{sectionSubtitle}</p>
        </div>

        <div className="tech-orbit" aria-hidden="true">
          <span className="tech-orbit-core" />
          <span className="tech-orbit-ring tech-orbit-ring-a" />
          <span className="tech-orbit-ring tech-orbit-ring-b" />
          <span className="tech-orbit-ring tech-orbit-ring-c" />
        </div>
      </div>

      <div className="tech-toolbar">
        <div className="tech-category-row">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`tech-chip-btn ${activeCategory === category ? 'tech-chip-btn-active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <label className="tech-search-wrap" htmlFor={`tech-news-search-${topicKey}`}>
          <span className="tech-search-label">Search news</span>
          <input
            id={`tech-news-search-${topicKey}`}
            type="search"
            className="text-input tech-search-input"
            placeholder="Search current updates..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="tech-feed-strip" aria-live="polite">
        <div className="tech-feed-items">
          <span className="tech-feed-item">
            <span className="tech-feed-pulse" aria-hidden="true" />
            <span>
              {filteredStories.length} {storyCountLabel} in focus
            </span>
          </span>
          <span className="tech-feed-item">Avg momentum: {averageMomentum || 0}%</span>
          <span className="tech-feed-item">Updated: {formatTimestamp(feed?.updatedAt)}</span>
          <span className="tech-feed-item">Next refresh: {formatNextRefresh(nowTick, feed?.nextRefreshAt)}</span>
        </div>
        <button
          type="button"
          className="ghost-btn tech-refresh-btn"
          onClick={() => loadNews({ forceRefresh: true, silent: true })}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {feed?.warnings?.[0] ? <p className="hint-text tech-feed-warning">{feed.warnings[0]}</p> : null}
      {loading && !stories.length ? <p className="hint-text">Loading latest news...</p> : null}

      <div className="tech-news-layout">
        {featuredStory ? (
          <article className="tech-feature-card">
            <p className="tech-feature-label">Featured Signal</p>
            <h3>{featuredStory.title}</h3>
            <p className="tech-feature-summary">{featuredStory.summary}</p>

            <div className="tech-feature-meta">
              <span>{featuredStory.category}</span>
              <span>{featuredStory.source}</span>
              <span>{featuredStory.freshness}</span>
            </div>

            <div className="tech-momentum">
              <div className="tech-momentum-top">
                <span>Momentum Score</span>
                <strong>{featuredStory.momentum}%</strong>
              </div>
              <div className="tech-momentum-bar">
                <span style={{ width: `${featuredStory.momentum}%` }} />
              </div>
              <p className="tech-momentum-note">{getMomentumLabel(featuredStory.momentum)} market traction</p>
            </div>

            {featuredStory.url ? (
              <div className="button-row tech-feature-actions">
                <button type="button" className="ghost-btn" onClick={() => openStory(featuredStory.url)}>
                  Open Source
                </button>
              </div>
            ) : null}
          </article>
        ) : (
          <div className="tech-empty-state">
            No live updates match this category/query. Try clearing filters or refreshing.
          </div>
        )}

        {gridStories.length ? (
          <div className="tech-news-grid" role="list">
            {gridStories.map((story, index) => (
              <button
                key={story.id}
                type="button"
                className={`tech-news-card ${featuredStory?.id === story.id ? 'tech-news-card-active' : ''}`}
                onClick={() => setSelectedStoryId(story.id)}
                onDoubleClick={() => openStory(story.url)}
                onMouseMove={handleCardPointerMove}
                onMouseLeave={handleCardPointerLeave}
                onBlur={handleCardPointerLeave}
                aria-pressed={featuredStory?.id === story.id}
              >
                <div className="tech-news-card-shine" aria-hidden="true" />
                <div className="tech-news-card-top">
                  <span className="tech-news-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="tech-news-badge">{story.category}</span>
                  <span className="tech-news-age">{story.freshness}</span>
                </div>
                <h3 className="tech-news-card-title">{story.title}</h3>
                <p className="tech-news-card-summary">{story.summary}</p>
                <div className="tech-news-card-info">
                  <span>
                    <strong>Source:</strong> {story.source}
                  </span>
                  <span>
                    <strong>Published:</strong> {story.eta}
                  </span>
                </div>
                <div className="tech-news-card-meta">
                  <span>{story.readTime}</span>
                  <span>Momentum {story.momentum}%</span>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
