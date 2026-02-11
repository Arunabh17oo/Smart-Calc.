import { Router } from 'express';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }
];

const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES.map((item) => item.code));

const LIBRE_TRANSLATE_URL = 'https://translate.argosopentech.com/translate';
const MYMEMORY_TRANSLATE_URL = 'https://api.mymemory.translated.net/get';

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId)
  };
}

async function translateWithLibre({ text, from, to }) {
  const timeout = withTimeout(8000);
  try {
    const response = await fetch(LIBRE_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: 'text'
      }),
      signal: timeout.signal
    });

    if (!response.ok) {
      throw new Error('LibreTranslate failed.');
    }

    const payload = await response.json();
    const translatedText = String(payload?.translatedText || '').trim();
    if (!translatedText) {
      throw new Error('LibreTranslate returned empty response.');
    }

    return {
      translatedText,
      provider: 'libretranslate'
    };
  } finally {
    timeout.cancel();
  }
}

async function translateWithMyMemory({ text, from, to }) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from}|${to}`
  });

  const timeout = withTimeout(8000);
  try {
    const response = await fetch(`${MYMEMORY_TRANSLATE_URL}?${params.toString()}`, {
      signal: timeout.signal
    });

    if (!response.ok) {
      throw new Error('MyMemory failed.');
    }

    const payload = await response.json();
    const translatedText = decodeHtmlEntities(payload?.responseData?.translatedText || '').trim();
    if (!translatedText) {
      throw new Error('MyMemory returned empty response.');
    }

    return {
      translatedText,
      provider: 'mymemory'
    };
  } finally {
    timeout.cancel();
  }
}

async function translateText({ text, from, to }) {
  try {
    return await translateWithLibre({ text, from, to });
  } catch (_libreError) {
    return translateWithMyMemory({ text, from, to });
  }
}

export const translateRouter = Router();

translateRouter.get('/supported', (_req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

translateRouter.post('/', async (req, res, next) => {
  try {
    const text = String(req.body?.text || '').trim();
    const from = String(req.body?.from || '').toLowerCase();
    const to = String(req.body?.to || '').toLowerCase();

    if (!text) {
      return res.status(400).json({ message: 'text is required.' });
    }

    if (text.length > 2500) {
      return res.status(400).json({ message: 'text is too long. Keep it under 2500 characters.' });
    }

    if (!from || !to) {
      return res.status(400).json({ message: 'from and to are required.' });
    }

    if (!SUPPORTED_LANGUAGE_SET.has(from) || !SUPPORTED_LANGUAGE_SET.has(to)) {
      return res.status(400).json({ message: 'Unsupported language pair.' });
    }

    if (from === to) {
      return res.json({
        from,
        to,
        translatedText: text,
        provider: 'identity'
      });
    }

    const translated = await translateText({ text, from, to });

    return res.json({
      from,
      to,
      translatedText: translated.translatedText,
      provider: translated.provider
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Translation request timed out.' });
    }
    next(error);
  }
});
