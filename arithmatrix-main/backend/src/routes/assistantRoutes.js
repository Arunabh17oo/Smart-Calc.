import { Router } from 'express';
import { getSupportedCurrencySet } from '../lib/currencySupport.js';

const USDT_RATE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,inr';
const FRANKFURTER_LATEST_URL = 'https://api.frankfurter.app/latest';
const DEFAULT_SUGGESTIONS = [
  'calculate 125 * 8',
  'convert 100 USD to INR',
  'weather in New York',
  'how to use voice calculator'
];
const EPSILON = 1e-9;

const WEATHER_CODE_TEXT = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm'
};

function weatherText(code) {
  return WEATHER_CODE_TEXT[Number(code)] || 'Unknown conditions';
}

function normalizeMathText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/what is|calculate|solve|please|answer|find|evaluate|equals|equal to|result|\?/g, ' ')
    .replace(/open bracket|open parenthesis/g, ' ( ')
    .replace(/close bracket|close parenthesis/g, ' ) ')
    .replace(/divided by|divide by|over/g, ' / ')
    .replace(/multiplied by|multiply by|times|into/g, ' * ')
    .replace(/plus/g, ' + ')
    .replace(/minus/g, ' - ')
    .replace(/negative/g, ' - ')
    .replace(/percent of/g, '% *')
    .replace(/percentage of/g, '% *')
    .replace(/percent|percentage|per cent/g, '%')
    .replace(/\bnineteen\b/g, '19')
    .replace(/\beighteen\b/g, '18')
    .replace(/\bseventeen\b/g, '17')
    .replace(/\bsixteen\b/g, '16')
    .replace(/\bfifteen\b/g, '15')
    .replace(/\bfourteen\b/g, '14')
    .replace(/\bthirteen\b/g, '13')
    .replace(/\btwelve\b/g, '12')
    .replace(/\beleven\b/g, '11')
    .replace(/\bten\b/g, '10')
    .replace(/\b(zero|oh)\b/g, '0')
    .replace(/\b(one|won)\b/g, '1')
    .replace(/\b(two|to|too|tu|do)\b/g, '2')
    .replace(/\b(three|tree)\b/g, '3')
    .replace(/\b(four|for|fore)\b/g, '4')
    .replace(/\bfive\b/g, '5')
    .replace(/\bsix\b/g, '6')
    .replace(/\bseven\b/g, '7')
    .replace(/\b(eight|ate)\b/g, '8')
    .replace(/\bnine\b/g, '9')
    .replace(/[x×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[^0-9+\-*/().% ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}

function tokenize(expression) {
  const src = String(expression || '').replace(/\s+/g, '');
  const tokens = [];

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (isDigit(c) || c === '.') {
      let number = c;
      i += 1;
      while (i < src.length && (isDigit(src[i]) || src[i] === '.')) {
        number += src[i];
        i += 1;
      }
      tokens.push(number);
      continue;
    }

    if (c === '-' && (tokens.length === 0 || ['+', '-', '*', '/', '('].includes(tokens[tokens.length - 1]))) {
      if (src[i + 1] === '(') {
        tokens.push('0');
        tokens.push('-');
        i += 1;
        continue;
      }

      let number = '-';
      i += 1;
      while (i < src.length && (isDigit(src[i]) || src[i] === '.')) {
        number += src[i];
        i += 1;
      }

      if (number === '-') {
        throw new Error('Invalid expression');
      }

      tokens.push(number);
      continue;
    }

    if (['+', '-', '*', '/', '(', ')', '%'].includes(c)) {
      tokens.push(c);
      i += 1;
      continue;
    }

    throw new Error('Invalid expression');
  }

  return tokens;
}

function precedence(op) {
  if (op === '+' || op === '-') return 1;
  if (op === '*' || op === '/') return 2;
  return 0;
}

function applyOperator(values, op) {
  if (values.length < 2) {
    throw new Error('Invalid expression');
  }

  const b = values.pop();
  const a = values.pop();

  switch (op) {
    case '+':
      values.push(a + b);
      break;
    case '-':
      values.push(a - b);
      break;
    case '*':
      values.push(a * b);
      break;
    case '/':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      values.push(a / b);
      break;
    default:
      throw new Error('Invalid expression');
  }
}

function evaluateExpression(expression) {
  const tokens = tokenize(expression);

  if (!tokens.length) {
    throw new Error('Empty expression');
  }

  const values = [];
  const ops = [];

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      values.push(Number(token));
      continue;
    }

    if (token === '(') {
      ops.push(token);
      continue;
    }

    if (token === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        applyOperator(values, ops.pop());
      }

      if (!ops.length || ops.pop() !== '(') {
        throw new Error('Mismatched parentheses');
      }
      continue;
    }

    if (token === '%') {
      if (!values.length) {
        throw new Error('Invalid percentage');
      }

      const num = values.pop();
      let percentBase = 1;
      if (ops.length && (ops[ops.length - 1] === '+' || ops[ops.length - 1] === '-')) {
        percentBase = values.length ? values[values.length - 1] : num;
      }

      values.push((num * percentBase) / 100);
      continue;
    }

    while (
      ops.length &&
      ops[ops.length - 1] !== '(' &&
      precedence(ops[ops.length - 1]) >= precedence(token)
    ) {
      applyOperator(values, ops.pop());
    }

    ops.push(token);
  }

  while (ops.length) {
    const op = ops.pop();
    if (op === '(' || op === ')') {
      throw new Error('Mismatched parentheses');
    }
    applyOperator(values, op);
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    throw new Error('Invalid expression');
  }

  return values[0];
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Error';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(10).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function tryMath(message) {
  const normalized = normalizeMathText(message);
  if (!/[+\-*/%]/.test(normalized) || !/\d/.test(normalized)) {
    return null;
  }

  try {
    const result = evaluateExpression(normalized);
    return {
      expression: normalized,
      result: formatNumber(result)
    };
  } catch (_error) {
    return null;
  }
}

function buildMathSolvedReply(mathResult, originalQuestion = '') {
  const question = String(originalQuestion || '').trim();
  const intro = question ? `Question: ${question}` : 'Question interpreted from image/text.';

  return [
    intro,
    `Interpreted expression: ${mathResult.expression}`,
    'Solution:',
    '1. Apply operator precedence (BODMAS/PEMDAS).',
    `2. Evaluate the expression.`,
    `Final Answer: ${mathResult.result}`
  ].join('\n');
}

function isNearZero(value) {
  return Math.abs(value) < EPSILON;
}

function normalizeEquationText(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/solve\s*(for)?\s*x|find\s*x|equation|question|answer|what\s+is|show\s+steps/g, ' ')
    .replace(/[−–—]/g, '-')
    .replace(/[×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\s+/g, '')
    .replace(/[^0-9x+\-*/^().=]/g, '');
}

function toPolynomialMap(sideRaw) {
  const side = String(sideRaw || '')
    .replace(/(\d)x/g, '$1*x')
    .replace(/x(\d)/g, 'x*$1')
    .replace(/\)(\d|x)/g, ')*$1')
    .replace(/(\d|x)\(/g, '$1*(')
    .replace(/\*/g, '');

  if (!side || /[()/]/.test(side)) {
    return null;
  }

  const terms = side.match(/[+-]?[^+-]+/g) || [];
  const coeffs = new Map();

  const add = (power, value) => {
    coeffs.set(power, (coeffs.get(power) || 0) + value);
  };

  for (const term of terms) {
    if (!term) continue;

    if (term.includes('x')) {
      const match = term.match(/^([+-]?(?:\d+(?:\.\d+)?)?)x(?:\^([+-]?\d+))?$/);
      if (!match) return null;

      const coeffRaw = match[1];
      let coeff = 0;

      if (coeffRaw === '' || coeffRaw === '+') coeff = 1;
      else if (coeffRaw === '-') coeff = -1;
      else coeff = Number(coeffRaw);

      if (!Number.isFinite(coeff)) return null;

      const power = match[2] ? Number(match[2]) : 1;
      if (!Number.isInteger(power) || power < 0 || power > 6) return null;

      add(power, coeff);
      continue;
    }

    const constant = Number(term);
    if (!Number.isFinite(constant)) return null;
    add(0, constant);
  }

  return coeffs;
}

function polynomialToString(coeffs) {
  const entries = [...coeffs.entries()]
    .filter(([, value]) => !isNearZero(value))
    .sort((a, b) => b[0] - a[0]);

  if (!entries.length) return '0';

  const parts = [];

  for (const [power, value] of entries) {
    const sign = value < 0 ? '-' : '+';
    const absValue = Math.abs(value);
    let body = '';

    if (power === 0) {
      body = formatNumber(absValue);
    } else if (power === 1) {
      const coeffText = isNearZero(absValue - 1) ? '' : formatNumber(absValue);
      body = `${coeffText}x`;
    } else {
      const coeffText = isNearZero(absValue - 1) ? '' : formatNumber(absValue);
      body = `${coeffText}x^${power}`;
    }

    if (!parts.length) {
      parts.push(value < 0 ? `-${body}` : body);
    } else {
      parts.push(`${sign} ${body}`);
    }
  }

  return parts.join(' ');
}

function trySolveAlgebraEquation(questionRaw) {
  const normalized = normalizeEquationText(questionRaw);
  if (!normalized.includes('=') || !normalized.includes('x')) return null;

  const equationParts = normalized.split('=');
  if (equationParts.length !== 2) return null;

  const leftMap = toPolynomialMap(equationParts[0]);
  const rightMap = toPolynomialMap(equationParts[1]);
  if (!leftMap || !rightMap) return null;

  const combined = new Map(leftMap);
  for (const [power, value] of rightMap.entries()) {
    combined.set(power, (combined.get(power) || 0) - value);
  }

  for (const [power, value] of [...combined.entries()]) {
    if (isNearZero(value)) combined.delete(power);
  }

  const degree = combined.size ? Math.max(...combined.keys()) : 0;

  if (degree === 1) {
    const a = combined.get(1) || 0;
    const b = combined.get(0) || 0;
    const standard = `${polynomialToString(combined)} = 0`;

    if (isNearZero(a) && isNearZero(b)) {
      return {
        mode: 'algebra_linear',
        suggestions: ['solve: 2x+5=19', 'solve: 7x-4=31'],
        reply: [
          `Question: ${String(questionRaw || '').trim()}`,
          `Standard form: ${standard}`,
          'This equation is true for all x.',
          'Final Answer: Infinite solutions'
        ].join('\n')
      };
    }

    if (isNearZero(a) && !isNearZero(b)) {
      return {
        mode: 'algebra_linear',
        suggestions: ['solve: 2x+5=19', 'solve: 7x-4=31'],
        reply: [
          `Question: ${String(questionRaw || '').trim()}`,
          `Standard form: ${standard}`,
          'No value of x satisfies this equation.',
          'Final Answer: No solution'
        ].join('\n')
      };
    }

    const x = -b / a;
    return {
      mode: 'algebra_linear',
      suggestions: ['solve: 3x-7=20', 'solve: 12x+9=3'],
      reply: [
        `Question: ${String(questionRaw || '').trim()}`,
        'Step 1: Rearrange into standard form ax + b = 0.',
        `Standard form: ${standard}`,
        'Step 2: Isolate x by moving b and dividing by a.',
        `x = ${formatNumber(x)}`,
        `Final Answer: x = ${formatNumber(x)}`
      ].join('\n')
    };
  }

  if (degree === 2) {
    const a = combined.get(2) || 0;
    const b = combined.get(1) || 0;
    const c = combined.get(0) || 0;
    if (isNearZero(a)) return null;

    const standard = `${polynomialToString(combined)} = 0`;
    const discriminant = b * b - 4 * a * c;

    if (isNearZero(discriminant)) {
      const x = -b / (2 * a);
      return {
        mode: 'algebra_quadratic',
        suggestions: ['solve: x^2-5x+6=0', 'solve: 2x^2+4x+2=0'],
        reply: [
          `Question: ${String(questionRaw || '').trim()}`,
          'Step 1: Write in standard quadratic form ax^2 + bx + c = 0.',
          `Standard form: ${standard}`,
          `Step 2: Compute discriminant D = b^2 - 4ac = ${formatNumber(discriminant)}.`,
          'Step 3: Since D = 0, there is one repeated root.',
          `x = ${formatNumber(x)}`,
          `Final Answer: x = ${formatNumber(x)}`
        ].join('\n')
      };
    }

    if (discriminant > 0) {
      const sqrtD = Math.sqrt(discriminant);
      const x1 = (-b + sqrtD) / (2 * a);
      const x2 = (-b - sqrtD) / (2 * a);
      return {
        mode: 'algebra_quadratic',
        suggestions: ['solve: x^2-3x-10=0', 'solve: 3x^2+2x-1=0'],
        reply: [
          `Question: ${String(questionRaw || '').trim()}`,
          'Step 1: Write in standard quadratic form ax^2 + bx + c = 0.',
          `Standard form: ${standard}`,
          `Step 2: Compute discriminant D = b^2 - 4ac = ${formatNumber(discriminant)}.`,
          'Step 3: Use x = (-b ± sqrt(D)) / (2a).',
          `x1 = ${formatNumber(x1)}`,
          `x2 = ${formatNumber(x2)}`,
          `Final Answer: x = ${formatNumber(x1)} or x = ${formatNumber(x2)}`
        ].join('\n')
      };
    }

    const realPart = -b / (2 * a);
    const imagPart = Math.sqrt(-discriminant) / (2 * a);
    return {
      mode: 'algebra_quadratic',
      suggestions: ['solve: x^2+4x+8=0', 'solve: 2x^2+2x+5=0'],
      reply: [
        `Question: ${String(questionRaw || '').trim()}`,
        'Step 1: Write in standard quadratic form ax^2 + bx + c = 0.',
        `Standard form: ${standard}`,
        `Step 2: Compute discriminant D = b^2 - 4ac = ${formatNumber(discriminant)}.`,
        'Step 3: Since D < 0, roots are complex.',
        `x = ${formatNumber(realPart)} ± ${formatNumber(imagPart)}i`,
        `Final Answer: x = ${formatNumber(realPart)} ± ${formatNumber(imagPart)}i`
      ].join('\n')
    };
  }

  return null;
}

function parseCurrencyIntent(message) {
  const text = String(message || '')
    .toUpperCase()
    .replace(/\bINDIAN RUPEES?\b/g, 'INR')
    .replace(/\bRUPEES?\b/g, 'INR')
    .replace(/\bRS\.?\b/g, 'INR');

  const patterns = [
    /(?:CONVERT|EXCHANGE)\s+([\d.]+)\s*([A-Z]{3,4})\s+(?:TO|INTO|IN)\s+([A-Z]{3,4})/,
    /([\d.]+)\s*([A-Z]{3,4})\s+(?:TO|INTO|IN)\s+([A-Z]{3,4})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const amount = Number(match[1]);
    const from = match[2];
    const to = match[3];

    if (!Number.isFinite(amount) || amount <= 0) return null;

    return { amount, from, to };
  }

  return null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function convertFiatCurrency({ amount, from, to }) {
  if (from === to) {
    return {
      converted: amount,
      date: new Date().toISOString().slice(0, 10)
    };
  }

  const params = new URLSearchParams({
    amount: String(amount),
    from,
    to
  });

  const response = await fetch(`${FRANKFURTER_LATEST_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch live rates.');
  }

  const data = await response.json();
  const converted = data?.rates?.[to];

  if (!Number.isFinite(converted)) {
    throw new Error('Currency conversion failed.');
  }

  return {
    converted,
    date: data.date
  };
}

async function fetchUsdtRates() {
  const response = await fetch(USDT_RATE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch live rates.');
  }

  const data = await response.json();
  const usdRate = toFiniteNumber(data?.tether?.usd);
  const inrRate = toFiniteNumber(data?.tether?.inr);

  if (!Number.isFinite(usdRate) || !Number.isFinite(inrRate) || usdRate <= 0 || inrRate <= 0) {
    throw new Error('Currency conversion failed.');
  }

  return {
    usdRate,
    inrRate,
    date: new Date().toISOString().slice(0, 10)
  };
}

async function convertCurrency({ amount, from, to }) {
  if (from !== 'USDT' && to !== 'USDT') {
    return convertFiatCurrency({ amount, from, to });
  }

  const usdt = await fetchUsdtRates();

  if (from === 'USDT') {
    if (to === 'USD') return { converted: amount * usdt.usdRate, date: usdt.date };
    if (to === 'INR') return { converted: amount * usdt.inrRate, date: usdt.date };

    const usdAmount = amount * usdt.usdRate;
    const fiatConversion = await convertFiatCurrency({ amount: usdAmount, from: 'USD', to });
    return {
      converted: fiatConversion.converted,
      date: fiatConversion.date || usdt.date
    };
  }

  if (to === 'USDT') {
    if (from === 'USD') return { converted: amount / usdt.usdRate, date: usdt.date };
    if (from === 'INR') return { converted: amount / usdt.inrRate, date: usdt.date };

    const usdConversion = await convertFiatCurrency({ amount, from, to: 'USD' });
    return {
      converted: usdConversion.converted / usdt.usdRate,
      date: usdConversion.date || usdt.date
    };
  }

  return convertFiatCurrency({ amount, from, to });
}

function parseWeatherIntent(message) {
  const text = String(message || '').trim();

  if (!/(weather|temperature|forecast|rain|humidity|wind)/i.test(text)) {
    return null;
  }

  const patterns = [
    /(?:weather|temperature|forecast|rain|humidity|wind)\s+(?:in|for|at)\s+([a-zA-Z .'-]{2,})$/i,
    /(?:in|for|at)\s+([a-zA-Z .'-]{2,})$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

async function fetchWeather(city) {
  const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodeUrl.searchParams.set('name', city);
  geocodeUrl.searchParams.set('count', '1');
  geocodeUrl.searchParams.set('language', 'en');
  geocodeUrl.searchParams.set('format', 'json');

  const geocodeResponse = await fetch(geocodeUrl);
  if (!geocodeResponse.ok) {
    throw new Error('Could not fetch location data.');
  }

  const geocodeData = await geocodeResponse.json();
  const place = geocodeData?.results?.[0];

  if (!place) {
    throw new Error('City not found.');
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(place.latitude));
  forecastUrl.searchParams.set('longitude', String(place.longitude));
  forecastUrl.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
  );
  forecastUrl.searchParams.set('timezone', 'auto');

  const forecastResponse = await fetch(forecastUrl);
  if (!forecastResponse.ok) {
    throw new Error('Could not fetch weather data.');
  }

  const data = await forecastResponse.json();

  return {
    location: `${place.name}${place.country ? `, ${place.country}` : ''}`,
    temperature: data.current?.temperature_2m,
    feelsLike: data.current?.apparent_temperature,
    humidity: data.current?.relative_humidity_2m,
    wind: data.current?.wind_speed_10m,
    weather: weatherText(data.current?.weather_code),
    units: {
      temperature: data.current_units?.temperature_2m || '°C',
      humidity: data.current_units?.relative_humidity_2m || '%',
      wind: data.current_units?.wind_speed_10m || 'km/h'
    }
  };
}

function buildHelpReply() {
  return [
    'I can help you quickly with:',
    '1. Math: "calculate 125 * 8"',
    '2. Currency: "convert 100 USD to INR" or "convert 25 USDT to INR"',
    '3. Weather: "weather in New York"',
    '4. App guidance: ask how to use Basic, Voice, Camera, Currency, Weather, Assistant, or History.'
  ].join('\n');
}

function cleanAssistantReply(text) {
  if (typeof text !== 'string') return '';

  const cleaned = text
    // Remove common reasoning blocks from some models.
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, ' ')
    .replace(/<\/?(think|analysis)>/gi, ' ')
    // Normalize line endings.
    .replace(/\r\n?/g, '\n')
    // Remove common role prefixes at line starts.
    .replace(/^\s*(assistant|ai)\s*:\s*/gim, '')
    // Clean spacing within each line but preserve paragraph breaks.
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    // Collapse excessive blank lines.
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

function getSuggestions(mode) {
  switch (mode) {
    case 'help':
      return [
        'calculate (25+5)*3',
        'convert 250 EUR to USD',
        'weather in London',
        'how to use camera calculator'
      ];
    case 'math':
      return ['calculate 250 + 18%', 'calculate 45*23', 'calculate (80-20)/3'];
    case 'currency':
      return ['convert 500 INR to USD', 'convert 25 USDT to INR', 'convert 100 AUD to JPY'];
    case 'weather':
      return ['weather in Mumbai', 'weather in Tokyo', 'weather in San Francisco'];
    case 'openai':
    case 'huggingface':
      return ['help', 'calculate 19*27', 'convert 99 USD to EUR', 'weather in Dubai'];
    default:
      return DEFAULT_SUGGESTIONS;
  }
}

function buildResponse(reply, mode, suggestions = getSuggestions(mode)) {
  const cleaned = cleanAssistantReply(reply);
  return {
    reply: cleaned || 'I could not generate a clear answer. Please try a shorter query.',
    mode,
    suggestions
  };
}

function isGreeting(message) {
  return /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(String(message || ''));
}

function normalizeOpenAiReply(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return cleanAssistantReply(data.output_text);
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;

    for (const chunk of item.content) {
      const text = chunk?.text || chunk?.output_text || '';
      if (typeof text === 'string' && text.trim()) {
        return cleanAssistantReply(text);
      }
    }
  }

  return '';
}

function normalizeHuggingFaceReply(data) {
  if (typeof data === 'string' && data.trim()) {
    return cleanAssistantReply(data);
  }

  if (Array.isArray(data) && data[0]?.generated_text) {
    return cleanAssistantReply(String(data[0].generated_text));
  }

  if (typeof data?.generated_text === 'string' && data.generated_text.trim()) {
    return cleanAssistantReply(data.generated_text);
  }

  const choices = Array.isArray(data?.choices) ? data.choices : [];
  const content = choices[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return cleanAssistantReply(content);
  }

  return '';
}

async function askOpenAi({ message, history }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];

  const input = [
    {
      role: 'system',
      content:
        'You are ArithMatrix Assistant inside a calculator web app. Be concise and practical. Help with math, currency, weather, and app usage. Use plain text. Never reveal internal reasoning. Never output tags like <think> or <analysis>.'
    },
    ...safeHistory
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      input
    })
  });

  if (!response.ok) {
    throw new Error('AI provider request failed.');
  }

  const data = await response.json();
  const reply = normalizeOpenAiReply(data);

  if (!reply) {
    throw new Error('AI provider returned an empty response.');
  }

  return reply;
}

async function askHuggingFace({ message, history }) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_MODEL;
  if (!apiKey || !model) return null;

  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
  const messages = [
    {
      role: 'system',
      content:
        'You are ArithMatrix Assistant inside a calculator web app. Be concise and practical. Help with math, currency, weather, and app usage. Never reveal internal reasoning. Never output tags like <think> or <analysis>.'
    },
    ...safeHistory
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: message }
  ];

  // OpenAI-compatible Hugging Face Inference Providers API.
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 280,
      temperature: 0.4
    })
  });

  if (!response.ok) {
    throw new Error('Hugging Face provider request failed.');
  }

  const data = await response.json();
  const reply = normalizeHuggingFaceReply(data);

  if (!reply) {
    throw new Error('Hugging Face returned an empty response.');
  }

  return reply;
}

async function askOpenAiMathSolution(question) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const input = [
    {
      role: 'system',
      content:
        'You are a math tutor in ArithMatrix. Solve the given math question step-by-step in concise numbered points and end with a line starting exactly with "Final Answer:". Never output internal reasoning tags.'
    },
    { role: 'user', content: question }
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      input
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI math-solver request failed.');
  }

  const data = await response.json();
  const reply = normalizeOpenAiReply(data);
  if (!reply) throw new Error('OpenAI math-solver returned empty response.');
  return reply;
}

async function askHuggingFaceMathSolution(question) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_MODEL;
  if (!apiKey || !model) return null;

  const messages = [
    {
      role: 'system',
      content:
        'You are a math tutor in ArithMatrix. Solve the given math question step-by-step in concise numbered points and end with a line starting exactly with "Final Answer:". Never output internal reasoning tags.'
    },
    { role: 'user', content: question }
  ];

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 420,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error('Hugging Face math-solver request failed.');
  }

  const data = await response.json();
  const reply = normalizeHuggingFaceReply(data);
  if (!reply) throw new Error('Hugging Face math-solver returned empty response.');
  return reply;
}

export const assistantRouter = Router();

assistantRouter.post('/solve-math', async (req, res, next) => {
  try {
    const question = String(req.body?.question || '').trim();

    if (!question) {
      return res.status(400).json({ message: 'question is required.' });
    }

    const localMath = tryMath(question);
    if (localMath) {
      return res.json(
        buildResponse(buildMathSolvedReply(localMath, question), 'math_solution', [
          'solve: (25+5)*3',
          'solve: 125 - 18%',
          'solve: (100/4)+7'
        ])
      );
    }

    const algebraResult = trySolveAlgebraEquation(question);
    if (algebraResult) {
      return res.json(buildResponse(algebraResult.reply, algebraResult.mode, algebraResult.suggestions));
    }

    try {
      const aiReply = await askOpenAiMathSolution(question);
      if (aiReply) {
        return res.json(
          buildResponse(aiReply, 'math_solution_ai', [
            'solve: 2x + 5 = 19',
            'solve: area of circle radius 7',
            'solve: simplify (a+b)^2'
          ])
        );
      }
    } catch (_openAiMathErr) {
      // Fall through to Hugging Face.
    }

    try {
      const hfReply = await askHuggingFaceMathSolution(question);
      if (hfReply) {
        return res.json(
          buildResponse(hfReply, 'math_solution_ai', [
            'solve: 3x - 7 = 20',
            'solve: 45% of 360',
            'solve: derivative of x^2 + 3x'
          ])
        );
      }
    } catch (_hfMathErr) {
      // Fall through to fallback.
    }

    return res.json(
      buildResponse(
        'I could not fully solve this image question automatically. Please try a clearer image or type the full problem text manually.',
        'math_solution_fallback',
        ['calculate (25+5)*3', 'solve: 2x+3=9', 'help']
      )
    );
  } catch (error) {
    next(error);
  }
});

assistantRouter.post('/chat', async (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim();
    const history = req.body?.history;

    if (!message) {
      return res.status(400).json({ message: 'message is required.' });
    }

    if (isGreeting(message)) {
      return res.json(
        buildResponse(
          'Hi. I can help with calculations, currency conversion, weather, and app navigation. Type "help" to see examples.',
          'greeting',
          ['help', 'calculate 45*9', 'convert 100 USD to INR', 'weather in Paris']
        )
      );
    }

    if (/\b(help|what can you do|capabilities|commands)\b/i.test(message)) {
      return res.json(buildResponse(buildHelpReply(), 'help'));
    }

    const currencyIntent = parseCurrencyIntent(message);
    if (currencyIntent) {
      const supportedCurrencies = await getSupportedCurrencySet();
      if (!supportedCurrencies.has(currencyIntent.from) || !supportedCurrencies.has(currencyIntent.to)) {
        return res.json(
          buildResponse(
            'Unsupported currency code. Use standard currency codes like USD, EUR, INR, JPY, AED, SGD, or USDT.',
            'currency_invalid',
            ['convert 100 USD to INR', 'convert 50 EUR to GBP', 'convert 100 AED to SGD']
          )
        );
      }

      try {
        const conversion = await convertCurrency(currencyIntent);
        const reply = `${currencyIntent.amount.toFixed(2)} ${currencyIntent.from} = ${conversion.converted.toFixed(2)} ${currencyIntent.to} (rate date: ${conversion.date})`;
        return res.json(buildResponse(reply, 'currency'));
      } catch (_error) {
        return res.json(
          buildResponse(
            'Currency service is temporarily unavailable. Try again in a moment.',
            'currency_unavailable',
            ['convert 100 USD to INR', 'convert 50 EUR to GBP']
          )
        );
      }
    }

    const weatherCity = parseWeatherIntent(message);
    if (weatherCity) {
      try {
        const weather = await fetchWeather(weatherCity);
        const reply = `${weather.location}: ${weather.temperature}${weather.units.temperature}, ${weather.weather}. Feels like ${weather.feelsLike}${weather.units.temperature}, humidity ${weather.humidity}${weather.units.humidity}, wind ${weather.wind}${weather.units.wind}.`;
        return res.json(buildResponse(reply, 'weather'));
      } catch (_error) {
        return res.json(
          buildResponse(
            'Weather service is temporarily unavailable. Try again in a moment.',
            'weather_unavailable',
            ['weather in New York', 'weather in London', 'weather in Mumbai']
          )
        );
      }
    }

    const mathResult = tryMath(message);
    if (mathResult) {
      const reply = buildMathSolvedReply(mathResult, message);
      return res.json(buildResponse(reply, 'math'));
    }

    const algebraResult = trySolveAlgebraEquation(message);
    if (algebraResult) {
      return res.json(buildResponse(algebraResult.reply, algebraResult.mode, algebraResult.suggestions));
    }

    try {
      const aiReply = await askOpenAi({ message, history });
      if (aiReply) {
        return res.json(buildResponse(aiReply, 'openai'));
      }
    } catch (_openAiError) {
      // Fall through to local response.
    }

    try {
      const hfReply = await askHuggingFace({ message, history });
      if (hfReply) {
        return res.json(buildResponse(hfReply, 'huggingface'));
      }
    } catch (_hfError) {
      // Fall through to local response.
    }

    return res.json(
      buildResponse(
        "I couldn't map that directly yet. Try a simpler command and I will help.",
        'fallback',
        ['calculate (25+5)*3', 'convert 100 USD to INR', 'weather in London', 'help']
      )
    );
  } catch (error) {
    next(error);
  }
});
