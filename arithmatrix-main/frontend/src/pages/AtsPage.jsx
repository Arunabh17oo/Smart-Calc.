import { useEffect, useState } from 'react';
import Tesseract from 'tesseract.js';
import {
  ATS_SAMPLE_JOB_DESCRIPTION,
  ATS_SAMPLE_RESUME,
  calculateAtsScore,
  parseResumeFileText
} from '../utils/atsScorer.js';

const RESUME_AUTO_CLEAR_MS = 3 * 60 * 1000;

function ScoreBadge({ score }) {
  return (
    <div className="ats-score-ring" style={{ '--ats-score': `${score}%` }} aria-label={`ATS score ${score} out of 100`}>
      <div className="ats-score-ring-inner">
        <p>{score}</p>
        <span>/100</span>
      </div>
    </div>
  );
}

export function AtsPage() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isResumeScanning, setIsResumeScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!analysis) return undefined;

    const timerId = setTimeout(() => {
      setResumeText('');
      setNotice('Resume text was auto-cleared 3 minutes after ATS score analysis.');
    }, RESUME_AUTO_CLEAR_MS);

    return () => clearTimeout(timerId);
  }, [analysis]);

  function isImageResume(fileName, mimeType) {
    const lowerName = String(fileName || '').toLowerCase();
    return (
      String(mimeType || '').startsWith('image/') ||
      /\.(png|jpg|jpeg|webp|bmp|tif|tiff)$/i.test(lowerName)
    );
  }

  function extractPrintableTextFromBinary(binaryText) {
    const chunks = String(binaryText || '').match(/[A-Za-z0-9@#&()[\]{}<>\-_.+,:%/\\|*'"!?$;\s]{5,}/g) || [];
    const lines = chunks
      .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
      .filter((line) => line.length >= 3);

    return lines.slice(0, 2200).join('\n');
  }

  async function scanImageResume(file) {
    setIsResumeScanning(true);
    setScanProgress(0);
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          setScanProgress(Math.round((message.progress || 0) * 100));
        }
      }
    });
    setIsResumeScanning(false);
    return String(data?.text || '').trim();
  }

  async function onResumeFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setNotice('');
    setAnalysis(null);

    try {
      const isImage = isImageResume(file.name, file.type);
      let rawText = '';

      if (isImage) {
        setNotice('Scanning uploaded resume image...');
        rawText = await scanImageResume(file);
      } else {
        rawText = await file.text();
      }

      let parsed = parseResumeFileText(rawText, file.name);

      if (!parsed.ok && !isImage) {
        const buffer = await file.arrayBuffer();
        const binaryText = new TextDecoder('latin1').decode(buffer);
        const heuristicText = extractPrintableTextFromBinary(binaryText);
        parsed = parseResumeFileText(heuristicText, file.name);
      }

      if (!parsed.ok) {
        setError(parsed.message || 'Could not scan this resume file. Paste text manually.');
        return;
      }

      setResumeText(parsed.text);
      setNotice(`Scanned ${file.name} and pasted extracted text into Resume Text.`);
    } catch (_error) {
      setError('Unable to read this file. Paste resume text manually.');
    } finally {
      setIsResumeScanning(false);
      setScanProgress(0);
      event.target.value = '';
    }
  }

  async function onAnalyze() {
    const trimmedResume = resumeText.trim();
    const trimmedJob = jobDescription.trim();

    if (trimmedResume.length < 120) {
      setError('Please provide a fuller resume text (at least 120 characters).');
      return;
    }

    if (trimmedJob.length < 120) {
      setError('Please paste the target job description (at least 120 characters).');
      return;
    }

    setError('');
    setNotice('');
    setIsAnalyzing(true);

    try {
      const result = calculateAtsScore(trimmedResume, trimmedJob);
      setAnalysis(result);
      setNotice('ATS score analyzed. Resume text will auto-clear in 3 minutes.');
    } catch (analysisError) {
      setError(analysisError.message || 'Could not analyze resume right now.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function onLoadSample() {
    setResumeText(ATS_SAMPLE_RESUME);
    setJobDescription(ATS_SAMPLE_JOB_DESCRIPTION);
    setAnalysis(null);
    setError('');
    setNotice('Sample resume and JD loaded. Click "Analyze ATS Score".');
  }

  function onReset() {
    setResumeText('');
    setJobDescription('');
    setAnalysis(null);
    setError('');
    setNotice('');
  }

  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>ATS Score Checker</h2>
        <a className="ghost-btn" href="#ats-score-results">
          Jump to Results
        </a>
      </div>

      <p className="hint-text">
        Paste your resume and job description to generate an ATS-style score with keyword, skill,
        section, and formatting analysis.
      </p>

      <label htmlFor="ats-resume-file" className="upload-label">
        Upload Resume File
      </label>
      <input
        id="ats-resume-file"
        className="file-input"
        type="file"
        accept=".txt,.md,.rtf,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff"
        onChange={onResumeFileChange}
      />
      {isResumeScanning ? <p className="hint-text">Scanning resume image... {scanProgress}%</p> : null}

      <label htmlFor="ats-resume-input" className="upload-label">
        Resume Text
      </label>
      <textarea
        id="ats-resume-input"
        className="text-input ats-textarea"
        placeholder="Paste full resume text here"
        value={resumeText}
        onChange={(event) => setResumeText(event.target.value)}
      />

      <label htmlFor="ats-jd-input" className="upload-label">
        Job Description
      </label>
      <textarea
        id="ats-jd-input"
        className="text-input ats-textarea"
        placeholder="Paste the target job description here"
        value={jobDescription}
        onChange={(event) => setJobDescription(event.target.value)}
      />

      <div className="button-row">
        <button type="button" className="action-btn" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze ATS Score'}
        </button>
        <button type="button" className="ghost-btn" onClick={onLoadSample}>
          Load Sample Data
        </button>
        <button type="button" className="ghost-btn" onClick={onReset}>
          Reset
        </button>
      </div>

      {notice ? <p className="hint-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {analysis ? (
        <div id="ats-score-results" className="ats-results-wrap">
          <article className="ats-summary-card">
            <ScoreBadge score={analysis.totalScore} />
            <div className="ats-summary-content">
              <p className="ats-summary-kicker">ATS Match Verdict</p>
              <h3>{analysis.label}</h3>
              <p className="ats-summary-meta">
                Keyword coverage: <strong>{analysis.coverage}%</strong>
              </p>
              <p className="ats-summary-note">
                This is an ATS-style heuristic score based on text matching and resume structure.
              </p>
            </div>
          </article>

          <div className="ats-breakdown-grid">
            {analysis.components.map((component) => {
              const percent = Math.round((component.score / component.max) * 100);
              return (
                <article className="ats-breakdown-card" key={component.id}>
                  <div className="ats-breakdown-top">
                    <p>{component.label}</p>
                    <span>
                      {component.score}/{component.max}
                    </span>
                  </div>
                  <div className="ats-mini-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="ats-keyword-grid">
            <article className="ats-keyword-card">
              <h3>Matched Keywords</h3>
              <div className="ats-chip-wrap">
                {analysis.matchedKeywords.length ? (
                  analysis.matchedKeywords.map((keyword) => (
                    <span key={keyword} className="ats-chip ats-chip-good">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="hint-text">No strong keyword matches yet.</p>
                )}
              </div>
            </article>

            <article className="ats-keyword-card">
              <h3>Missing Keywords</h3>
              <div className="ats-chip-wrap">
                {analysis.missingKeywords.length ? (
                  analysis.missingKeywords.slice(0, 14).map((keyword) => (
                    <span key={keyword} className="ats-chip ats-chip-missing">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="hint-text">Great, no major keyword misses detected.</p>
                )}
              </div>
            </article>
          </div>

          <div className="ats-insights-grid">
            <article className="ats-insight-card">
              <h3>Resume Signals</h3>
              <p>Words: {analysis.insights.wordCount}</p>
              <p>Bullets: {analysis.insights.bulletCount}</p>
              <p>Metrics Found: {analysis.insights.metricCount}</p>
              <p>Action Verbs: {analysis.insights.actionVerbCount}</p>
            </article>

            <article className="ats-insight-card">
              <h3>Top Skill Gaps</h3>
              {analysis.missingSkills.length ? (
                <div className="ats-chip-wrap">
                  {analysis.missingSkills.slice(0, 8).map((skill) => (
                    <span key={skill} className="ats-chip ats-chip-missing">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="hint-text">Your resume reflects the key role skills.</p>
              )}
            </article>

            <article className="ats-insight-card">
              <h3>ATS Improvement Plan</h3>
              <ul className="ats-reco-list">
                {analysis.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
