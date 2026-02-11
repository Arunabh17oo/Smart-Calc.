const STOP_WORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'me',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'now',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves'
]);

const GENERIC_JOB_TERMS = new Set([
  'ability',
  'applicant',
  'candidate',
  'collaborate',
  'company',
  'culture',
  'day',
  'deliver',
  'demonstrated',
  'description',
  'environment',
  'excellent',
  'experience',
  'familiar',
  'good',
  'great',
  'highly',
  'ideal',
  'individual',
  'job',
  'knowledge',
  'must',
  'needed',
  'person',
  'plus',
  'position',
  'preferred',
  'proven',
  'required',
  'requirement',
  'requirements',
  'responsibilities',
  'responsibility',
  'role',
  'skill',
  'skills',
  'strong',
  'team',
  'work',
  'working'
]);

const REQUIREMENT_MARKER = /\b(required|must|need to|minimum|preferred|qualification|responsibilit|proficient|hands-on)\b/i;

const ACTION_VERBS = [
  'achieved',
  'built',
  'created',
  'decreased',
  'delivered',
  'designed',
  'developed',
  'drove',
  'enhanced',
  'improved',
  'implemented',
  'increased',
  'launched',
  'led',
  'managed',
  'optimized',
  'reduced',
  'scaled',
  'streamlined'
];

const SECTION_PATTERNS = {
  summary: /(^|\n)\s*(professional summary|summary|profile|objective)\s*[:\-]?\s*(\n|$)/i,
  experience: /(^|\n)\s*(work experience|experience|employment history|professional experience)\s*[:\-]?\s*(\n|$)/i,
  skills: /(^|\n)\s*(skills|technical skills|core competencies|tech stack)\s*[:\-]?\s*(\n|$)/i,
  education: /(^|\n)\s*(education|academic background|academics)\s*[:\-]?\s*(\n|$)/i,
  projects: /(^|\n)\s*(projects|project experience|selected projects)\s*[:\-]?\s*(\n|$)/i,
  certifications: /(^|\n)\s*(certifications|licenses|certificates)\s*[:\-]?\s*(\n|$)/i
};

const SKILL_GROUPS = [
  {
    canonical: 'javascript',
    aliases: ['javascript', 'js']
  },
  {
    canonical: 'typescript',
    aliases: ['typescript', 'ts']
  },
  {
    canonical: 'react',
    aliases: ['react', 'reactjs', 'react.js']
  },
  {
    canonical: 'next.js',
    aliases: ['next.js', 'nextjs']
  },
  {
    canonical: 'vue',
    aliases: ['vue', 'vue.js', 'vuejs']
  },
  {
    canonical: 'angular',
    aliases: ['angular']
  },
  {
    canonical: 'html',
    aliases: ['html', 'html5']
  },
  {
    canonical: 'css',
    aliases: ['css', 'css3']
  },
  {
    canonical: 'node.js',
    aliases: ['node.js', 'nodejs', 'node']
  },
  {
    canonical: 'express',
    aliases: ['express', 'express.js']
  },
  {
    canonical: 'nestjs',
    aliases: ['nestjs', 'nest.js']
  },
  {
    canonical: 'python',
    aliases: ['python']
  },
  {
    canonical: 'java',
    aliases: ['java']
  },
  {
    canonical: 'c++',
    aliases: ['c++']
  },
  {
    canonical: 'c#',
    aliases: ['c#', 'csharp']
  },
  {
    canonical: 'go',
    aliases: ['golang', 'go']
  },
  {
    canonical: 'rust',
    aliases: ['rust']
  },
  {
    canonical: 'sql',
    aliases: ['sql']
  },
  {
    canonical: 'postgresql',
    aliases: ['postgresql', 'postgres']
  },
  {
    canonical: 'mysql',
    aliases: ['mysql']
  },
  {
    canonical: 'mongodb',
    aliases: ['mongodb', 'mongo']
  },
  {
    canonical: 'redis',
    aliases: ['redis']
  },
  {
    canonical: 'graphql',
    aliases: ['graphql']
  },
  {
    canonical: 'rest api',
    aliases: ['rest api', 'restful api', 'rest']
  },
  {
    canonical: 'microservices',
    aliases: ['microservices', 'microservice']
  },
  {
    canonical: 'docker',
    aliases: ['docker']
  },
  {
    canonical: 'kubernetes',
    aliases: ['kubernetes', 'k8s']
  },
  {
    canonical: 'aws',
    aliases: ['aws', 'amazon web services']
  },
  {
    canonical: 'azure',
    aliases: ['azure', 'microsoft azure']
  },
  {
    canonical: 'gcp',
    aliases: ['gcp', 'google cloud', 'google cloud platform']
  },
  {
    canonical: 'terraform',
    aliases: ['terraform']
  },
  {
    canonical: 'ci/cd',
    aliases: ['ci/cd', 'ci cd', 'continuous integration', 'continuous delivery']
  },
  {
    canonical: 'jenkins',
    aliases: ['jenkins']
  },
  {
    canonical: 'github actions',
    aliases: ['github actions']
  },
  {
    canonical: 'agile',
    aliases: ['agile']
  },
  {
    canonical: 'scrum',
    aliases: ['scrum']
  },
  {
    canonical: 'jira',
    aliases: ['jira']
  },
  {
    canonical: 'unit testing',
    aliases: ['unit testing', 'unit tests']
  },
  {
    canonical: 'integration testing',
    aliases: ['integration testing', 'integration tests']
  },
  {
    canonical: 'playwright',
    aliases: ['playwright']
  },
  {
    canonical: 'selenium',
    aliases: ['selenium']
  },
  {
    canonical: 'machine learning',
    aliases: ['machine learning', 'ml']
  },
  {
    canonical: 'deep learning',
    aliases: ['deep learning']
  },
  {
    canonical: 'tensorflow',
    aliases: ['tensorflow']
  },
  {
    canonical: 'pytorch',
    aliases: ['pytorch']
  },
  {
    canonical: 'data analysis',
    aliases: ['data analysis', 'data analytics']
  },
  {
    canonical: 'power bi',
    aliases: ['power bi', 'powerbi']
  },
  {
    canonical: 'tableau',
    aliases: ['tableau']
  },
  {
    canonical: 'excel',
    aliases: ['excel', 'microsoft excel']
  },
  {
    canonical: 'figma',
    aliases: ['figma']
  },
  {
    canonical: 'ui/ux',
    aliases: ['ui/ux', 'ui ux', 'user experience', 'user interface']
  },
  {
    canonical: 'linux',
    aliases: ['linux']
  },
  {
    canonical: 'git',
    aliases: ['git']
  },
  {
    canonical: 'communication',
    aliases: ['communication', 'communicate']
  },
  {
    canonical: 'leadership',
    aliases: ['leadership', 'leading']
  }
];

const SAMPLE_RESUME = `ALEX MORGAN
alex.morgan@example.com | +1 415-555-0188 | linkedin.com/in/alexmorgan | github.com/alexmorgan

PROFESSIONAL SUMMARY
Full-stack software engineer with 5+ years of experience building SaaS platforms using React, Node.js, TypeScript, and AWS. Strong in microservices, REST APIs, and CI/CD automation.

SKILLS
JavaScript, TypeScript, React, Next.js, Node.js, Express, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Terraform, GitHub Actions, CI/CD, Unit Testing, Agile, Jira

WORK EXPERIENCE
Senior Software Engineer | AtlasFlow | 2022 - Present
- Designed and launched a React + Node.js workflow product used by 120,000+ users.
- Improved API response times by 43% by optimizing PostgreSQL queries and Redis caching.
- Built CI/CD pipelines with GitHub Actions and Docker, reducing deployment time by 55%.
- Migrated monolith modules to microservices, improving release stability and scalability.
- Led a team of 5 engineers and partnered with product and design teams.

Software Engineer | CloudCore Labs | 2020 - 2022
- Developed REST APIs in Express and Node.js for billing and user lifecycle workflows.
- Implemented role-based access control and security hardening across cloud services.
- Reduced cloud infrastructure cost by 28% using AWS rightsizing and autoscaling policies.

PROJECTS
Hiring Insights Platform
- Built an analytics dashboard with React, TypeScript, and PostgreSQL.
- Added data visualization with reusable components and improved report generation speed by 37%.

EDUCATION
B.S. in Computer Science | University of California

CERTIFICATIONS
AWS Certified Developer - Associate`;

const SAMPLE_JOB_DESCRIPTION = `Senior Full Stack Engineer

We are looking for a Senior Full Stack Engineer to build and scale our hiring intelligence platform.

Required Qualifications:
- 4+ years experience in JavaScript/TypeScript development.
- Strong hands-on experience with React, Node.js, and REST API design.
- Production experience with PostgreSQL and Redis.
- Deep understanding of cloud deployment on AWS and containerized workloads using Docker.
- Experience with CI/CD pipelines, automated testing, and Git workflows.
- Ability to work in Agile teams and collaborate with product, design, and QA.

Preferred:
- Experience with microservices architecture and Kubernetes.
- Familiarity with Terraform and infrastructure automation.
- Strong communication and leadership skills.

Responsibilities:
- Build performant frontend and backend services.
- Improve system reliability, scale, and developer productivity.
- Deliver measurable impact across product velocity and platform stability.`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^\w\s+#./-]/g, ' ')
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function termRegex(term) {
  const escaped = escapeRegExp(term).replace(/\s+/g, '\\s+');
  if (/^[a-z0-9]+$/i.test(term)) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i');
}

function lineSplit(text) {
  return String(text || '').split(/\r?\n/);
}

function isProbablyTextContent(text) {
  if (!text) return false;
  const sample = text.slice(0, 3000);
  let printable = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || code > 159) {
      printable += 1;
    }
  }
  return printable / Math.max(sample.length, 1) > 0.78;
}

function countWords(value) {
  return tokenize(value).length;
}

function isLikelyPdfSource(text, fileName = '') {
  const lowerFileName = String(fileName || '').toLowerCase();
  const sample = String(text || '').slice(0, 12000);

  if (lowerFileName.endsWith('.pdf')) return true;
  if (/^\s*%PDF-/i.test(sample)) return true;
  if (/\/Type\s*\/Catalog/i.test(sample) && /\bxref\b/i.test(sample)) return true;
  if (/\bendobj\b/i.test(sample) && /\bstream\b/i.test(sample) && /\bxref\b/i.test(sample)) return true;

  return false;
}

function decodePdfEscapedString(value) {
  const input = String(value || '');
  let output = '';

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char !== '\\') {
      output += char;
      continue;
    }

    const next = input[i + 1];
    if (!next) continue;

    if (next === 'n') {
      output += '\n';
      i += 1;
      continue;
    }
    if (next === 'r') {
      output += '\r';
      i += 1;
      continue;
    }
    if (next === 't') {
      output += '\t';
      i += 1;
      continue;
    }
    if (next === 'b') {
      output += '\b';
      i += 1;
      continue;
    }
    if (next === 'f') {
      output += '\f';
      i += 1;
      continue;
    }
    if (next === '(' || next === ')' || next === '\\') {
      output += next;
      i += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      let octal = next;
      if (/[0-7]/.test(input[i + 2] || '')) octal += input[i + 2];
      if (/[0-7]/.test(input[i + 3] || '')) octal += input[i + 3];
      output += String.fromCharCode(parseInt(octal, 8));
      i += octal.length;
      continue;
    }

    output += next;
    i += 1;
  }

  return output;
}

function decodePdfHexString(hexValue) {
  const cleanHex = String(hexValue || '').replace(/[^0-9a-f]/gi, '');
  if (cleanHex.length < 8) return '';

  const evenHex = cleanHex.length % 2 === 0 ? cleanHex : `${cleanHex}0`;
  const bytes = new Uint8Array(evenHex.length / 2);

  for (let i = 0; i < evenHex.length; i += 2) {
    bytes[i / 2] = parseInt(evenHex.slice(i, i + 2), 16);
  }

  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch (_error) {
    return new TextDecoder('latin1').decode(bytes);
  }
}

function looksLikePdfSyntaxNoise(line) {
  const value = String(line || '').trim();
  if (!value) return true;

  if (/^(obj|endobj|xref|trailer|startxref|stream|endstream)$/i.test(value)) return true;
  if (/^\/(Type|Length|Filter|Subtype|Parent|Root|Info|Font|StructElem|XObject)\b/.test(value)) return true;
  if (/^(<<|>>|\[|\]|\d+\s+\d+\s+obj|\d+\s+\d+\s+R)$/.test(value)) return true;
  if (/^%PDF-\d/i.test(value)) return true;
  if (/^[\d\s]+$/.test(value)) return true;

  return false;
}

function isLikelyReadableResumeLine(line) {
  const value = String(line || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return false;
  if (value.length < 3 || value.length > 650) return false;
  if (looksLikePdfSyntaxNoise(value)) return false;
  if (value.includes('<<') || value.includes('>>')) return false;
  if (/\/[A-Za-z]+\s*[\[(<]/.test(value)) return false;
  if (/\b\d+\s+\d+\s+obj\b/i.test(value)) return false;

  const letters = (value.match(/[a-z]/gi) || []).length;
  const digits = (value.match(/\d/g) || []).length;
  if (letters < 2) return false;
  if (digits > letters * 1.9) return false;

  const noisyKeywords = /\b(Catalog|FlateDecode|ProcSet|MediaBox|CIDFont|FontDescriptor|StructElem)\b/i;
  if (noisyKeywords.test(value)) return false;

  return isProbablyTextContent(value);
}

function extractReadableTextFromPdfSource(rawPdfText) {
  const source = String(rawPdfText || '');
  if (!source) return '';

  const withoutStreams = source.replace(/stream[\s\S]*?endstream/g, ' ');
  const candidates = [];

  const literalMatches =
    withoutStreams.match(/\((?:\\.|[^\\()]){3,}\)/g) || [];
  for (const match of literalMatches) {
    const decoded = decodePdfEscapedString(match.slice(1, -1))
      .replace(/\s+/g, ' ')
      .trim();
    if (isLikelyReadableResumeLine(decoded)) candidates.push(decoded);
  }

  const hexMatches = withoutStreams.match(/<([0-9a-f]{8,})>/gi) || [];
  for (const fullMatch of hexMatches) {
    const decoded = decodePdfHexString(fullMatch.slice(1, -1))
      .replace(/\s+/g, ' ')
      .trim();
    if (isLikelyReadableResumeLine(decoded)) candidates.push(decoded);
  }

  const lineMatches = withoutStreams.split(/\r?\n/);
  for (const line of lineMatches) {
    const normalized = line.replace(/\s+/g, ' ').trim();
    if (isLikelyReadableResumeLine(normalized)) candidates.push(normalized);
  }

  const unique = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const key = normalizeText(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }

  return unique.join('\n').trim();
}

function extractSkills(text) {
  const normalized = normalizeText(text);
  const found = new Set();

  for (const group of SKILL_GROUPS) {
    const hasAlias = group.aliases.some((alias) => termRegex(alias).test(normalized));
    if (hasAlias) {
      found.add(group.canonical);
    }
  }

  return Array.from(found).sort();
}

function buildKeywordTargets(jobText) {
  const lines = lineSplit(jobText);
  const tokenWeights = new Map();
  const phraseWeights = new Map();
  const skillTargets = extractSkills(jobText);

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const lineWeight = REQUIREMENT_MARKER.test(cleanLine) ? 2.1 : 1;
    const words = tokenize(cleanLine).filter((token) => {
      if (token.length < 3) return false;
      if (STOP_WORDS.has(token)) return false;
      if (GENERIC_JOB_TERMS.has(token)) return false;
      if (/^\d+$/.test(token)) return false;
      return true;
    });

    for (const word of words) {
      tokenWeights.set(word, (tokenWeights.get(word) || 0) + lineWeight);
    }

    for (let i = 0; i < words.length - 1; i += 1) {
      const a = words[i];
      const b = words[i + 1];
      if (a.length < 3 || b.length < 3) continue;
      const phrase = `${a} ${b}`;
      phraseWeights.set(phrase, (phraseWeights.get(phrase) || 0) + lineWeight * 0.7);
    }
  }

  const targets = [];
  const seen = new Set();

  for (const skill of skillTargets) {
    targets.push({ term: skill, weight: 4.2, type: 'skill' });
    seen.add(skill);
  }

  const topPhrases = Array.from(phraseWeights.entries())
    .filter(([, weight]) => weight >= 1.8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14);

  for (const [phrase, weight] of topPhrases) {
    if (seen.has(phrase)) continue;
    targets.push({ term: phrase, weight: Number(weight.toFixed(2)), type: 'phrase' });
    seen.add(phrase);
  }

  const topTokens = Array.from(tokenWeights.entries())
    .filter(([, weight]) => weight >= 1.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 26);

  for (const [token, weight] of topTokens) {
    if (seen.has(token)) continue;
    targets.push({ term: token, weight: Number(weight.toFixed(2)), type: 'token' });
    seen.add(token);
  }

  return {
    targets,
    skills: skillTargets
  };
}

function hasSection(text, pattern) {
  if (pattern.test(text)) return true;
  const normalized = normalizeText(text);
  const fallback = String(pattern).replace(/[\\^$.*+?()[\]{}|]/g, '');
  if (!fallback) return false;
  return normalized.includes(fallback.split('|')[0] || '');
}

function clampScore(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeFormatScore(resumeText, wordCount, bulletCount) {
  let score = 10;
  const lines = lineSplit(resumeText);
  const veryLongLines = lines.filter((line) => line.length > 170).length;
  const heavyTables = lines.filter((line) => line.split('|').length >= 4).length;

  if (wordCount < 180) score -= 4;
  if (wordCount > 1200) score -= 3;
  if (!bulletCount && wordCount > 300) score -= 2;
  if (veryLongLines > 4) score -= 2;
  if (heavyTables > 3) score -= 2;

  return clampScore(Math.round(score), 0, 10);
}

function computeImpactScore(resumeText) {
  const metricMatches = resumeText.match(/\b\d+(?:\.\d+)?(?:%|x|k|m|b)?\b/gi) || [];
  const actionVerbRegex = new RegExp(`\\b(${ACTION_VERBS.join('|')})\\b`, 'gi');
  const actionMatches = resumeText.match(actionVerbRegex) || [];

  const metricPoints = Math.min(6, Math.round((metricMatches.length / 10) * 6));
  const actionPoints = Math.min(4, Math.round((actionMatches.length / 8) * 4));

  return {
    score: clampScore(metricPoints + actionPoints, 0, 10),
    metricCount: metricMatches.length,
    actionCount: actionMatches.length
  };
}

function computeSectionScore(resumeText) {
  const sections = {
    summary: hasSection(resumeText, SECTION_PATTERNS.summary),
    experience: hasSection(resumeText, SECTION_PATTERNS.experience),
    skills: hasSection(resumeText, SECTION_PATTERNS.skills),
    education: hasSection(resumeText, SECTION_PATTERNS.education),
    projects: hasSection(resumeText, SECTION_PATTERNS.projects),
    certifications: hasSection(resumeText, SECTION_PATTERNS.certifications)
  };

  let score = 0;
  if (sections.summary) score += 2;
  if (sections.experience) score += 4;
  if (sections.skills) score += 3;
  if (sections.education) score += 3;
  if (sections.projects) score += 2;
  if (sections.certifications) score += 1;

  return {
    score: clampScore(score, 0, 15),
    sections
  };
}

function computeContactScore(resumeText) {
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText);
  const phone = /(?:\+?\d{1,3}[\s\-()]*)?(?:\d[\s\-()]*){10,}/.test(resumeText);
  const linkedin = /linkedin\.com\/in\//i.test(resumeText);

  let score = 0;
  if (email) score += 2;
  if (phone) score += 2;
  if (linkedin) score += 1;

  return {
    score: clampScore(score, 0, 5),
    email,
    phone,
    linkedin
  };
}

function labelForScore(totalScore) {
  if (totalScore >= 90) return 'Excellent Match';
  if (totalScore >= 80) return 'Strong Match';
  if (totalScore >= 70) return 'Good Match';
  if (totalScore >= 60) return 'Moderate Match';
  return 'Needs Improvement';
}

function normalizeKeyword(term) {
  return normalizeText(term);
}

function buildRecommendations({
  coverage,
  missingSkills,
  missingKeywords,
  sectionSignals,
  contactSignals,
  formatScore,
  impactSignals,
  wordCount
}) {
  const items = [];

  if (coverage < 0.65 && missingKeywords.length) {
    items.push(
      `Add missing JD keywords naturally in experience/project bullets: ${missingKeywords
        .slice(0, 6)
        .join(', ')}.`
    );
  }

  if (missingSkills.length) {
    items.push(`Close skill gap for role-critical tools: ${missingSkills.slice(0, 6).join(', ')}.`);
  }

  if (!sectionSignals.summary || !sectionSignals.skills || !sectionSignals.experience) {
    items.push('Add clear section headers for Summary, Skills, and Experience to improve ATS parsing.');
  }

  if (!contactSignals.email || !contactSignals.phone || !contactSignals.linkedin) {
    items.push('Include complete contact details: email, phone, and LinkedIn profile URL.');
  }

  if (impactSignals.metricCount < 4) {
    items.push('Quantify impact with metrics (%, $, time saved, scale) in key achievement bullets.');
  }

  if (formatScore < 7) {
    items.push('Use clean single-column formatting, concise bullets, and avoid table-heavy layouts.');
  }

  if (wordCount < 180) {
    items.push('Resume appears short for ATS matching. Add role-relevant projects and accomplishments.');
  } else if (wordCount > 1200) {
    items.push('Resume is long. Trim less relevant content to improve ATS and recruiter scan speed.');
  }

  return Array.from(new Set(items)).slice(0, 6);
}

export function calculateAtsScore(resumeInput, jobDescriptionInput) {
  const resumeText = String(resumeInput || '').trim();
  const jobText = String(jobDescriptionInput || '').trim();

  if (!resumeText || !jobText) {
    throw new Error('Resume and job description are required for ATS scoring.');
  }

  const normalizedResume = normalizeText(resumeText);
  const resumeTokens = new Set(tokenize(resumeText));
  const resumeSkills = extractSkills(resumeText);
  const resumeSkillsSet = new Set(resumeSkills);
  const { targets, skills: jobSkills } = buildKeywordTargets(jobText);
  const jobSkillsSet = new Set(jobSkills);

  let totalTargetWeight = 0;
  let matchedTargetWeight = 0;
  const matchedKeywords = [];
  const missingKeywords = [];

  for (const target of targets) {
    totalTargetWeight += target.weight;

    const targetKey = normalizeKeyword(target.term);
    const matched =
      target.type === 'skill'
        ? resumeSkillsSet.has(target.term)
        : target.type === 'phrase'
          ? termRegex(targetKey).test(normalizedResume)
          : resumeTokens.has(targetKey) || termRegex(targetKey).test(normalizedResume);

    if (matched) {
      matchedTargetWeight += target.weight;
      matchedKeywords.push(target.term);
    } else {
      missingKeywords.push(target.term);
    }
  }

  const keywordCoverage = totalTargetWeight ? matchedTargetWeight / totalTargetWeight : 0;
  const keywordScore = clampScore(Math.round(keywordCoverage * 40), 0, 40);

  const matchedSkills = Array.from(jobSkillsSet).filter((skill) => resumeSkillsSet.has(skill));
  const missingSkills = Array.from(jobSkillsSet).filter((skill) => !resumeSkillsSet.has(skill));
  const skillCoverage = jobSkills.length
    ? matchedSkills.length / jobSkills.length
    : Math.min(1, resumeSkills.length / 14) * 0.7;
  const skillScore = clampScore(Math.round(skillCoverage * 20), 0, 20);

  const sectionSignals = computeSectionScore(resumeText);
  const contactSignals = computeContactScore(resumeText);
  const impactSignals = computeImpactScore(resumeText);

  const wordCount = tokenize(resumeText).length;
  const bulletCount = lineSplit(resumeText).filter((line) => /^\s*[-*•]/.test(line)).length;
  const formatScore = computeFormatScore(resumeText, wordCount, bulletCount);

  const totalScore = clampScore(
    keywordScore +
      skillScore +
      sectionSignals.score +
      contactSignals.score +
      impactSignals.score +
      formatScore,
    0,
    100
  );

  const recommendations = buildRecommendations({
    coverage: keywordCoverage,
    missingSkills,
    missingKeywords,
    sectionSignals: sectionSignals.sections,
    contactSignals,
    formatScore,
    impactSignals,
    wordCount
  });

  return {
    totalScore,
    label: labelForScore(totalScore),
    coverage: Number((keywordCoverage * 100).toFixed(1)),
    components: [
      { id: 'keywords', label: 'Keyword Alignment', score: keywordScore, max: 40 },
      { id: 'skills', label: 'Skill Match', score: skillScore, max: 20 },
      { id: 'sections', label: 'Section Completeness', score: sectionSignals.score, max: 15 },
      { id: 'format', label: 'ATS Formatting', score: formatScore, max: 10 },
      { id: 'impact', label: 'Impact Evidence', score: impactSignals.score, max: 10 },
      { id: 'contact', label: 'Contact Readiness', score: contactSignals.score, max: 5 }
    ],
    matchedKeywords: matchedKeywords.slice(0, 20),
    missingKeywords: missingKeywords.slice(0, 20),
    matchedSkills,
    missingSkills,
    insights: {
      wordCount,
      bulletCount,
      metricCount: impactSignals.metricCount,
      actionVerbCount: impactSignals.actionCount,
      sections: sectionSignals.sections,
      contact: {
        email: contactSignals.email,
        phone: contactSignals.phone,
        linkedin: contactSignals.linkedin
      }
    },
    recommendations
  };
}

export function parseResumeFileText(rawText, fileName = '') {
  const original = String(rawText || '');
  const cleaned = original
    .replace(/\u0000/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (isLikelyPdfSource(cleaned, fileName)) {
    const extracted = extractReadableTextFromPdfSource(cleaned);

    if (extracted && isProbablyTextContent(extracted) && countWords(extracted) >= 10) {
      return {
        ok: true,
        text: extracted,
        message: ''
      };
    }

    return {
      ok: false,
      text: '',
      message: 'Could not auto-extract readable text from this PDF. Please paste resume text directly.'
    };
  }

  if (!isProbablyTextContent(cleaned)) {
    const lowerFileName = String(fileName || '').toLowerCase();
    const isOfficeLike =
      lowerFileName.endsWith('.pdf') ||
      lowerFileName.endsWith('.doc') ||
      lowerFileName.endsWith('.docx');

    return {
      ok: false,
      text: '',
      message: isOfficeLike
        ? 'Could not auto-extract readable text from this file here. Please paste resume text directly.'
        : 'This file did not provide clean text. Please paste resume text directly.'
    };
  }

  return {
    ok: true,
    text: cleaned,
    message: ''
  };
}

export const ATS_SAMPLE_RESUME = SAMPLE_RESUME;
export const ATS_SAMPLE_JOB_DESCRIPTION = SAMPLE_JOB_DESCRIPTION;
