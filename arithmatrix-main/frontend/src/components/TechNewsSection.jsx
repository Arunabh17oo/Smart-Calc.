import { useMemo, useState } from 'react';

const TECH_STORIES = [
  {
    id: 'edge-ai-assistants',
    title: 'Edge AI assistants are shifting to fully offline reasoning',
    category: 'AI',
    summary:
      'New assistant chips are processing language and vision tasks on-device, reducing latency and privacy risk for mobile and laptop users.',
    stage: 'Pilot Rollout',
    eta: 'Q2 2026',
    momentum: 96,
    freshness: '2h ago',
    readTime: '5 min read'
  },
  {
    id: 'solid-state-battery-lines',
    title: 'Solid-state battery production lines enter pre-commercial scale',
    category: 'Energy',
    summary:
      'Manufacturers are reporting better safety and fast-charge cycles, signaling a major step toward next-gen EV range and durability.',
    stage: 'Pre-Commercial',
    eta: 'Q4 2026',
    momentum: 92,
    freshness: '5h ago',
    readTime: '4 min read'
  },
  {
    id: 'humanoid-factory-robots',
    title: 'Humanoid robots begin repetitive industrial deployments',
    category: 'Robotics',
    summary:
      'Factories are testing humanoid units for inspection, packing, and material transfer in low-light, high-precision workflows.',
    stage: 'Field Trials',
    eta: 'Q3 2026',
    momentum: 90,
    freshness: '8h ago',
    readTime: '6 min read'
  },
  {
    id: 'quantum-error-correction',
    title: 'Quantum error-correction milestones improve hardware stability',
    category: 'Quantum',
    summary:
      'Research teams reported better logical qubit lifetimes, moving practical quantum workloads closer to enterprise experimentation.',
    stage: 'Research Breakthrough',
    eta: 'Q1 2027',
    momentum: 88,
    freshness: '11h ago',
    readTime: '7 min read'
  },
  {
    id: 'xr-workspaces',
    title: 'Spatial XR workspaces gain traction in engineering teams',
    category: 'AR/VR',
    summary:
      'Mixed-reality collaboration tools are improving 3D prototyping and remote design reviews for product and architecture teams.',
    stage: 'Growth Phase',
    eta: 'Q2 2026',
    momentum: 85,
    freshness: '15h ago',
    readTime: '4 min read'
  },
  {
    id: 'cybersecurity-ai-analysts',
    title: 'Autonomous AI SOC analysts reduce security triage times',
    category: 'Cybersecurity',
    summary:
      'Security operations centers are adopting agentic pipelines that prioritize incidents and automate repetitive threat analysis tasks.',
    stage: 'Enterprise Adoption',
    eta: 'Now - 2026',
    momentum: 89,
    freshness: '20h ago',
    readTime: '5 min read'
  },
  {
    id: 'chiplet-datacenter-architectures',
    title: 'Chiplet-based server designs expand AI compute efficiency',
    category: 'Semiconductors',
    summary:
      'Modular chiplet architectures are lowering thermal overhead and increasing performance-per-watt for large AI workloads.',
    stage: 'Scaled Manufacturing',
    eta: 'Q3 2026',
    momentum: 91,
    freshness: '1d ago',
    readTime: '6 min read'
  },
  {
    id: 'satellite-direct-cell',
    title: 'Satellite-to-phone connectivity reaches broader consumer trials',
    category: 'Space Tech',
    summary:
      'Direct-to-cell satellite layers are being tested as fallback coverage for emergency and rural communication use cases.',
    stage: 'Carrier Partnerships',
    eta: 'Q1 2027',
    momentum: 84,
    freshness: '1d ago',
    readTime: '4 min read'
  }
];

const NEWS_CATEGORIES = ['All', ...new Set(TECH_STORIES.map((story) => story.category))];

function toSearchableText(story) {
  return `${story.title} ${story.summary} ${story.category} ${story.stage}`.toLowerCase();
}

function getMomentumLabel(value) {
  if (value >= 93) return 'Very High';
  if (value >= 87) return 'High';
  if (value >= 80) return 'Moderate';
  return 'Emerging';
}

export function TechNewsSection() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState(TECH_STORIES[0].id);

  const filteredStories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return TECH_STORIES.filter((story) => {
      const inCategory = activeCategory === 'All' || story.category === activeCategory;
      const matchesQuery = !normalizedQuery || toSearchableText(story).includes(normalizedQuery);
      return inCategory && matchesQuery;
    }).sort((a, b) => b.momentum - a.momentum);
  }, [activeCategory, query]);

  const featuredStory = useMemo(() => {
    return filteredStories.find((story) => story.id === selectedStoryId) || filteredStories[0] || null;
  }, [filteredStories, selectedStoryId]);

  const averageMomentum = useMemo(() => {
    if (!filteredStories.length) return 0;
    const total = filteredStories.reduce((sum, story) => sum + story.momentum, 0);
    return Math.round(total / filteredStories.length);
  }, [filteredStories]);

  const gridStories = useMemo(() => {
    if (!featuredStory) return filteredStories;
    return filteredStories.filter((story) => story.id !== featuredStory.id);
  }, [filteredStories, featuredStory]);

  const storyCountLabel = filteredStories.length === 1 ? 'story' : 'stories';

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
    <section className="tech-news-panel" aria-labelledby="tech-news-title">
      <div className="tech-news-head">
        <div>
          <p className="tech-news-kicker">Innovation Radar</p>
          <h2 id="tech-news-title">Upcoming Technologies News</h2>
          <p className="tech-news-subtitle">
            Track high-impact technology updates across AI, robotics, chips, cyber, XR, energy,
            and space systems.
          </p>
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
          {NEWS_CATEGORIES.map((category) => (
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

        <label className="tech-search-wrap" htmlFor="tech-news-search">
          <span className="tech-search-label">Search news</span>
          <input
            id="tech-news-search"
            type="search"
            className="text-input tech-search-input"
            placeholder="Search AI, robotics, quantum, chips..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="tech-feed-strip" aria-live="polite">
        <span className="tech-feed-pulse" aria-hidden="true" />
        <span>
          {filteredStories.length} {storyCountLabel} in focus
        </span>
        <span className="tech-feed-divider" aria-hidden="true">
          |
        </span>
        <span>Avg momentum: {averageMomentum || 0}%</span>
      </div>

      <div className="tech-news-layout">
        {featuredStory ? (
          <article className="tech-feature-card">
            <p className="tech-feature-label">Featured Signal</p>
            <h3>{featuredStory.title}</h3>
            <p className="tech-feature-summary">{featuredStory.summary}</p>

            <div className="tech-feature-meta">
              <span>{featuredStory.category}</span>
              <span>{featuredStory.stage}</span>
              <span>{featuredStory.eta}</span>
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
          </article>
        ) : (
          <div className="tech-empty-state">
            No technology updates match your current category and search query.
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
                    <strong>Stage:</strong> {story.stage}
                  </span>
                  <span>
                    <strong>ETA:</strong> {story.eta}
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
