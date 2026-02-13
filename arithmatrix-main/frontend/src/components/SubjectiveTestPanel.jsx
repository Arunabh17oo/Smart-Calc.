import { useMemo, useState } from 'react';

const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'];
const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
};

const EDUCATION_OPTIONS = [
  { value: 'middle-school', label: 'Middle School (Class 6-8)' },
  { value: 'secondary-school', label: 'Secondary School (Class 9-10)' },
  { value: 'higher-secondary', label: 'Higher Secondary (Class 11-12)' },
  { value: 'entrance-preparation', label: 'Entrance Exam Preparation' },
  { value: 'undergraduate', label: 'Undergraduate College' },
  { value: 'postgraduate', label: 'Postgraduate / Masters' }
];

const KNOWLEDGE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

const QUESTION_BANK = {
  beginner: [
    {
      id: 'g-b-1',
      prompt: 'In your own words, explain why division by zero is undefined.',
      keywords: ['division', 'zero', 'undefined', 'cannot'],
      referenceAnswer:
        'Division asks how many equal groups fit. When the divisor is 0, no fixed number can satisfy the operation, so division by zero is undefined.',
      minWords: 22
    },
    {
      id: 'g-b-2',
      prompt: 'Explain step-by-step how to find 25% of 80.',
      keywords: ['25%', '80', '100', '20'],
      expectedNumbers: ['25', '80', '100', '20'],
      referenceAnswer:
        'Convert 25% to 25/100 (or 0.25), then multiply by 80: 0.25 * 80 = 20.',
      minWords: 20
    }
  ],
  intermediate: [
    {
      id: 'g-i-1',
      prompt: 'How would you solve 3x + 5 = 20? Explain each step and why it works.',
      keywords: ['subtract 5', 'divide by 3', 'isolate', 'x'],
      expectedNumbers: ['3', '5', '20', '15', '5'],
      referenceAnswer:
        'Subtract 5 from both sides to keep balance: 3x=15. Divide both sides by 3 to isolate x, giving x=5.',
      minWords: 24
    },
    {
      id: 'g-i-2',
      prompt: 'Explain how estimation helps before solving 49 * 21 exactly.',
      keywords: ['estimation', 'approximate', '50', '20', 'reasonableness'],
      expectedNumbers: ['49', '21', '50', '20', '1000', '1029'],
      referenceAnswer:
        'Estimate by rounding 49 to 50 and 21 to 20: 50*20=1000. Exact result is 1029, so estimation helps check reasonableness.',
      minWords: 20
    }
  ],
  advanced: [
    {
      id: 'g-a-1',
      prompt: 'Compare nCr and nPr with one example and explain when order matters.',
      keywords: ['nCr', 'nPr', 'combination', 'permutation', 'order'],
      referenceAnswer:
        'nCr counts combinations where order does not matter. nPr counts permutations where order matters. Example: choosing 2 students from 5 uses nCr; assigning captain and vice-captain uses nPr.',
      minWords: 28
    },
    {
      id: 'g-a-2',
      prompt: 'Explain the relation between logarithms and exponents using log10(1000).',
      keywords: ['logarithm', 'exponent', 'base', '10', '1000', '3'],
      expectedNumbers: ['10', '1000', '3'],
      referenceAnswer:
        'A logarithm asks for the exponent. log10(1000)=3 because 10^3=1000.',
      minWords: 18
    }
  ]
};

const PROFILE_QUESTION_BANK = {
  'middle-school': {
    beginner: [
      {
        id: 'ms-b-1',
        prompt: 'Explain in your own words how to convert 3/4 into decimal form.',
        keywords: ['fraction', 'divide', '3', '4', '0.75'],
        expectedNumbers: ['3', '4', '0.75'],
        referenceAnswer: 'To convert 3/4 into decimal, divide 3 by 4. The result is 0.75.',
        minWords: 16
      },
      {
        id: 'ms-b-2',
        prompt: 'Why is place value important when adding 248 + 35?',
        keywords: ['place value', 'ones', 'tens', 'hundreds', 'align'],
        expectedNumbers: ['248', '35', '283'],
        referenceAnswer:
          'Place value helps align ones, tens, and hundreds correctly. Then 248 + 35 = 283 without mixing columns.',
        minWords: 18
      }
    ]
  },
  'secondary-school': {
    beginner: [
      {
        id: 'ss-b-1',
        prompt: 'Explain the difference between simple interest and compound interest.',
        keywords: ['simple interest', 'compound interest', 'principal', 'time', 'rate'],
        referenceAnswer:
          'Simple interest is calculated only on principal, while compound interest is calculated on principal plus previously earned interest.',
        minWords: 22
      }
    ],
    intermediate: [
      {
        id: 'ss-i-1',
        prompt: 'Solve x/3 + 4 = 10 and explain each balancing step.',
        keywords: ['subtract 4', 'multiply by 3', 'balance', 'x'],
        expectedNumbers: ['3', '4', '10', '6', '18'],
        referenceAnswer:
          'Subtract 4 from both sides to get x/3 = 6. Multiply both sides by 3 to get x = 18.',
        minWords: 20
      }
    ]
  },
  'higher-secondary': {
    intermediate: [
      {
        id: 'hs-i-1',
        prompt: 'Explain why slope of a horizontal line is zero using coordinates.',
        keywords: ['slope', 'horizontal', 'change in y', 'zero', 'coordinates'],
        referenceAnswer:
          'For a horizontal line, y-value stays constant. So change in y is 0, and slope m = change in y/change in x = 0.',
        minWords: 20
      },
      {
        id: 'hs-i-2',
        prompt: 'How would you explain the concept of probability to a classmate?',
        keywords: ['probability', 'favorable outcomes', 'total outcomes', 'between 0 and 1'],
        referenceAnswer:
          'Probability measures chance. It is favorable outcomes divided by total outcomes, and its value lies between 0 and 1.',
        minWords: 20
      }
    ],
    advanced: [
      {
        id: 'hs-a-1',
        prompt: 'Explain what the discriminant tells us in a quadratic equation.',
        keywords: ['discriminant', 'b^2-4ac', 'roots', 'real', 'complex'],
        referenceAnswer:
          'The discriminant D = b^2 - 4ac indicates root type: D>0 gives two real roots, D=0 one repeated real root, D<0 complex roots.',
        minWords: 24
      }
    ]
  },
  'entrance-preparation': {
    intermediate: [
      {
        id: 'ep-i-1',
        prompt: 'In entrance exam prep, why is time management as important as accuracy?',
        keywords: ['time management', 'accuracy', 'attempt', 'marks', 'strategy'],
        referenceAnswer:
          'Entrance exams are time bound. Good time management improves the number of quality attempts while maintaining accuracy and maximizing score.',
        minWords: 24
      }
    ],
    advanced: [
      {
        id: 'ep-a-1',
        prompt: 'Explain a strategy to choose between solving algebra or calculus first in a mock test.',
        keywords: ['strategy', 'strength', 'difficulty', 'time', 'confidence'],
        referenceAnswer:
          'Start with your stronger section to build confidence and secure marks quickly, then move to harder questions with a fixed time budget.',
        minWords: 24
      }
    ]
  },
  undergraduate: {
    intermediate: [
      {
        id: 'ug-i-1',
        prompt: 'Explain why unit consistency matters in engineering calculations.',
        keywords: ['units', 'consistency', 'conversion', 'error', 'engineering'],
        referenceAnswer:
          'Mixed units create large errors. Keeping units consistent and converting properly ensures equations remain dimensionally correct.',
        minWords: 20
      }
    ],
    advanced: [
      {
        id: 'ug-a-1',
        prompt: 'Describe how derivatives model change in real-world systems.',
        keywords: ['derivative', 'rate of change', 'slope', 'real-world', 'model'],
        referenceAnswer:
          'A derivative gives instantaneous rate of change and slope, helping model velocity, growth, decay, and optimization in real systems.',
        minWords: 22
      }
    ]
  },
  postgraduate: {
    advanced: [
      {
        id: 'pg-a-1',
        prompt: 'Explain why assumptions must be stated clearly before solving analytical models.',
        keywords: ['assumptions', 'model', 'validity', 'limitations', 'interpretation'],
        referenceAnswer:
          'Assumptions define model boundaries, validity, and interpretation. Clear assumptions prevent misuse and make results scientifically defensible.',
        minWords: 24
      },
      {
        id: 'pg-a-2',
        prompt: 'How would you critically evaluate whether a result is statistically meaningful?',
        keywords: ['sample size', 'variance', 'significance', 'confidence', 'bias'],
        referenceAnswer:
          'Evaluate sample size, variance, confidence intervals, significance level, and potential bias before declaring results meaningful.',
        minWords: 26
      }
    ]
  }
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'what',
  'when',
  'where',
  'why',
  'with',
  'you',
  'your'
]);

function normalizeForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9.%+\-^ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokenSet(text) {
  return new Set(
    normalizeForMatch(text)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token && token.length > 2 && !STOP_WORDS.has(token))
  );
}

function extractNumbers(text) {
  const matches = String(text || '').match(/-?\d+(?:\.\d+)?/g) || [];
  return new Set(matches.map((value) => String(Number(value))));
}

function inferLevelFromProfile(age, education) {
  const ageNum = Number(age);
  let level = 'beginner';

  if (education === 'middle-school') level = 'beginner';
  if (education === 'secondary-school') level = ageNum >= 15 ? 'intermediate' : 'beginner';
  if (education === 'higher-secondary') level = 'intermediate';
  if (education === 'entrance-preparation') level = ageNum >= 18 ? 'advanced' : 'intermediate';
  if (education === 'undergraduate') level = ageNum >= 20 ? 'advanced' : 'intermediate';
  if (education === 'postgraduate') level = 'advanced';

  if (ageNum <= 12) return 'beginner';
  if (ageNum >= 18 && level === 'beginner') return 'intermediate';
  return level;
}

function questionPoolForProfile(education, level) {
  const specific = PROFILE_QUESTION_BANK[education]?.[level] || [];
  const generic = QUESTION_BANK[level] || [];
  return [...specific, ...generic];
}

function pickRandomQuestion(education, level, lastQuestionId) {
  const pool = questionPoolForProfile(education, level);
  if (!pool.length) return null;
  const candidates = pool.filter((item) => item.id !== lastQuestionId);
  const source = candidates.length ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function evaluateAnswer(answer, question) {
  const normalizedAnswer = normalizeForMatch(answer);
  const wordCount = normalizedAnswer ? normalizedAnswer.split(' ').length : 0;

  const expectedKeywords = question.keywords || [];
  const missingKeywords = expectedKeywords.filter(
    (keyword) => !normalizedAnswer.includes(normalizeForMatch(keyword))
  );
  const keywordScore = expectedKeywords.length
    ? (expectedKeywords.length - missingKeywords.length) / expectedKeywords.length
    : 1;

  const answerTokens = toTokenSet(answer);
  const referenceTokens = toTokenSet(question.referenceAnswer);
  const conceptHits = [...referenceTokens].filter((token) => answerTokens.has(token)).length;
  const conceptScore = referenceTokens.size ? conceptHits / referenceTokens.size : 1;

  const expectedNumbers = new Set((question.expectedNumbers || []).map((value) => String(Number(value))));
  const answerNumbers = extractNumbers(answer);
  const missingNumbers = [...expectedNumbers].filter((value) => !answerNumbers.has(value));
  const hasNumberTargets = expectedNumbers.size > 0;
  const numberScore = hasNumberTargets
    ? (expectedNumbers.size - missingNumbers.length) / expectedNumbers.size
    : 1;

  const minWords = question.minWords || 20;
  const depthScore = Math.min(1, wordCount / minWords);

  const weights = hasNumberTargets
    ? { keyword: 0.5, concept: 0.3, number: 0.1, depth: 0.1 }
    : { keyword: 0.55, concept: 0.35, number: 0, depth: 0.1 };

  const score = Math.round(
    (keywordScore * weights.keyword +
      conceptScore * weights.concept +
      numberScore * weights.number +
      depthScore * weights.depth) *
      100
  );

  let label = 'Needs More Practice';
  if (score >= 85) label = 'Strong Understanding';
  else if (score >= 70) label = 'Good Understanding';
  else if (score >= 50) label = 'Partial Understanding';

  return {
    score,
    label,
    wordCount,
    missingKeywords,
    missingNumbers,
    referenceAnswer: question.referenceAnswer
  };
}

function suggestLevelFromScore(currentLevel, score) {
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
  if (currentIndex < 0) return currentLevel;

  if (score >= 85 && currentIndex < LEVEL_ORDER.length - 1) {
    return LEVEL_ORDER[currentIndex + 1];
  }

  if (score <= 45 && currentIndex > 0) {
    return LEVEL_ORDER[currentIndex - 1];
  }

  return currentLevel;
}

export function SubjectiveTestPanel() {
  const [age, setAge] = useState('');
  const [education, setEducation] = useState('higher-secondary');
  const [knowledgeLevel, setKnowledgeLevel] = useState('intermediate');
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [question, setQuestion] = useState(null);
  const [lastQuestionId, setLastQuestionId] = useState('');
  const [answer, setAnswer] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [restrictionNote, setRestrictionNote] = useState('');
  const [validationError, setValidationError] = useState('');

  const canSubmit = useMemo(
    () => profileReady && question && answer.trim().length >= 8,
    [profileReady, question, answer]
  );
  const suggestedLevel = useMemo(
    () => (analysis ? suggestLevelFromScore(level, analysis.score) : level),
    [analysis, level]
  );
  const educationLabel = useMemo(
    () => EDUCATION_OPTIONS.find((item) => item.value === education)?.label || education,
    [education]
  );
  const knowledgeLabel = useMemo(
    () => KNOWLEDGE_OPTIONS.find((item) => item.value === knowledgeLevel)?.label || knowledgeLevel,
    [knowledgeLevel]
  );

  function resetAnswerState() {
    setAnswer('');
    setAnalysis(null);
    setRestrictionNote('');
    setValidationError('');
  }

  function generateQuestion(nextEducation = education, nextLevel = level) {
    const nextQuestion = pickRandomQuestion(nextEducation, nextLevel, lastQuestionId);
    if (!nextQuestion) {
      setProfileError('No questions available for this profile right now.');
      return;
    }

    setQuestion(nextQuestion);
    setLastQuestionId(nextQuestion.id);
    resetAnswerState();
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    const ageNumber = Number(age);
    if (!Number.isFinite(ageNumber) || ageNumber < 8 || ageNumber > 60) {
      setProfileError('Please enter a valid age between 8 and 60.');
      return;
    }

    if (!education) {
      setProfileError('Please select your education level.');
      return;
    }

    const recommendedLevel = inferLevelFromProfile(ageNumber, education);
    const chosenIndex = LEVEL_ORDER.indexOf(knowledgeLevel);
    const recommendedIndex = LEVEL_ORDER.indexOf(recommendedLevel);
    const startingLevel = chosenIndex >= recommendedIndex ? knowledgeLevel : recommendedLevel;

    setProfileError('');
    setProfileReady(true);
    setLevel(startingLevel);
    generateQuestion(education, startingLevel);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || !question) {
      setValidationError('Please write at least 8 characters before submitting.');
      return;
    }

    setValidationError('');
    setAnalysis(evaluateAnswer(answer, question));
  }

  function blockClipboard(event) {
    event.preventDefault();
    setRestrictionNote('Copy/Cut/Paste is disabled in this subjective test answer box.');
  }

  function handleResetProfile() {
    setProfileReady(false);
    setProfileError('');
    setQuestion(null);
    setLastQuestionId('');
    resetAnswerState();
  }

  return (
    <section className="subjective-test-block" aria-label="Subjective practice test">
      <div className="panel-row panel-row-space">
        <h2>Subjective Test</h2>
      </div>

      <p className="hint-text">
        Start by entering age and education. Questions are generated according to your profile and
        understanding level.
      </p>

      <form className="subjective-profile-form" onSubmit={handleProfileSubmit}>
        <div className="subjective-profile-grid">
          <label className="subjective-profile-field" htmlFor="subjective-age-input">
            <span>Age</span>
            <input
              id="subjective-age-input"
              type="number"
              className="text-input"
              min={8}
              max={60}
              placeholder="Enter age"
              value={age}
              onChange={(event) => {
                setAge(event.target.value);
                if (profileError) setProfileError('');
              }}
            />
          </label>

          <label className="subjective-profile-field" htmlFor="subjective-education-select">
            <span>Education</span>
            <select
              id="subjective-education-select"
              className="subjective-level-select"
              value={education}
              onChange={(event) => {
                setEducation(event.target.value);
                if (profileError) setProfileError('');
              }}
            >
              {EDUCATION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="subjective-profile-field" htmlFor="subjective-knowledge-select">
            <span>Knowledge Level</span>
            <select
              id="subjective-knowledge-select"
              className="subjective-level-select"
              value={knowledgeLevel}
              onChange={(event) => {
                setKnowledgeLevel(event.target.value);
                if (profileError) setProfileError('');
              }}
            >
              {KNOWLEDGE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="subjective-profile-actions">
          <button type="submit" className="action-btn">
            {profileReady ? 'Update Profile' : 'Start Test'}
          </button>
          {profileReady ? (
            <button type="button" className="ghost-btn" onClick={handleResetProfile}>
              Reset
            </button>
          ) : null}
        </div>
      </form>

      {profileError ? <p className="error-text">{profileError}</p> : null}

      {profileReady && question ? (
        <>
          <div className="subjective-profile-pill-row">
            <span className="status-tag">Age: {age}</span>
            <span className="status-tag">Education: {educationLabel}</span>
            <span className="status-tag">Knowledge: {knowledgeLabel}</span>
            <span className="status-tag">Level: {LEVEL_LABEL[level]}</span>
          </div>

          <article className="subjective-question-card">
            <p className="subjective-question-label">Question ({LEVEL_LABEL[level]})</p>
            <p className="subjective-question-text">{question.prompt}</p>
            <button type="button" className="ghost-btn subjective-generate-btn" onClick={() => generateQuestion()}>
              New Question
            </button>
          </article>

          <form onSubmit={handleSubmit}>
            <label htmlFor="subjective-answer" className="upload-label">
              Your Answer
            </label>
            <textarea
              id="subjective-answer"
              className="text-input subjective-answer-input"
              rows={5}
              placeholder="Type your subjective answer here..."
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                if (validationError) setValidationError('');
              }}
              onPaste={blockClipboard}
              onCopy={blockClipboard}
              onCut={blockClipboard}
              onKeyDown={(event) => {
                const key = event.key.toLowerCase();
                if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x'].includes(key)) {
                  blockClipboard(event);
                }
              }}
            />

            <div className="panel-row panel-row-space subjective-action-row">
              <p className="hint-text subjective-word-count">
                Words: {answer.trim() ? answer.trim().split(/\s+/).length : 0}
              </p>
              <button type="submit" className="action-btn" disabled={!canSubmit}>
                Analyze Answer
              </button>
            </div>
          </form>

          {restrictionNote ? <p className="error-text">{restrictionNote}</p> : null}
          {validationError ? <p className="error-text">{validationError}</p> : null}

          {analysis ? (
            <section className="subjective-analysis-card" aria-live="polite">
              <div className="subjective-score-row">
                <p className="subjective-score-title">Correctness</p>
                <p className="subjective-score-value">{analysis.score}%</p>
              </div>
              <p className="subjective-score-label">{analysis.label}</p>

              {analysis.missingKeywords.length ? (
                <p className="hint-text">Missing key points: {analysis.missingKeywords.join(', ')}</p>
              ) : (
                <p className="hint-text">You covered the key points well.</p>
              )}

              {analysis.missingNumbers.length ? (
                <p className="hint-text">
                  Missing numeric parts: {analysis.missingNumbers.join(', ')}
                </p>
              ) : null}

              {suggestedLevel !== level ? (
                <div className="subjective-level-suggestion">
                  <p className="hint-text">Suggested next level: {LEVEL_LABEL[suggestedLevel]}</p>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setLevel(suggestedLevel);
                      generateQuestion(education, suggestedLevel);
                    }}
                  >
                    Switch Level
                  </button>
                </div>
              ) : null}

              <p className="hint-text subjective-reference-title">Reference answer:</p>
              <p className="subjective-reference-text">{analysis.referenceAnswer}</p>
            </section>
          ) : null}

        </>
      ) : null}
    </section>
  );
}
