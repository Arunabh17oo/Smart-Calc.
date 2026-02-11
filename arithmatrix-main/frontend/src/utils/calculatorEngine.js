const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2
};

const FUNCTION_ARITY = {
  sin: [1],
  cos: [1],
  tan: [1],
  sinh: [1],
  cosh: [1],
  tanh: [1],
  asin: [1],
  acos: [1],
  atan: [1],
  asinh: [1],
  acosh: [1],
  atanh: [1],
  sqrt: [1],
  cbrt: [1],
  root: [2],
  ln: [1],
  log: [1, 2],
  mod: [2],
  gcd: [2],
  lcm: [2],
  ncr: [2],
  npr: [2],
  abs: [1],
  exp: [1],
  floor: [1],
  ceil: [1],
  round: [1],
  pow: [2]
};

const MATH_UNDEFINED_CODE = 'MATH_UNDEFINED';

function createUndefinedError() {
  const error = new Error('Undefined');
  error.code = MATH_UNDEFINED_CODE;
  return error;
}

export function isUndefinedMathError(error) {
  return Boolean(error && error.code === MATH_UNDEFINED_CODE);
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}

function isLetter(char) {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function sanitizeExpression(expression) {
  return String(expression || '')
    .replace(/\s+/g, '')
    .replace(/[xX×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/φ/g, 'phi')
    .replace(/√/g, 'sqrt')
    .toLowerCase();
}

function tokenize(expression) {
  const src = sanitizeExpression(expression);
  const tokens = [];

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (isDigit(c) || c === '.') {
      let number = c;
      let dotCount = c === '.' ? 1 : 0;
      i += 1;
      while (i < src.length && (isDigit(src[i]) || src[i] === '.')) {
        if (src[i] === '.') {
          dotCount += 1;
          if (dotCount > 1) {
            throw new Error('Invalid number');
          }
        }
        number += src[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: Number(number) });
      continue;
    }

    if (isLetter(c)) {
      let ident = c;
      i += 1;
      while (i < src.length && isLetter(src[i])) {
        ident += src[i];
        i += 1;
      }
      tokens.push({ type: 'identifier', value: ident });
      continue;
    }

    if (c === '(') {
      tokens.push({ type: 'leftParen', value: c });
      i += 1;
      continue;
    }

    if (c === ')') {
      tokens.push({ type: 'rightParen', value: c });
      i += 1;
      continue;
    }

    if (c === ',') {
      tokens.push({ type: 'comma', value: c });
      i += 1;
      continue;
    }

    if (['+', '-', '*', '/', '^', '!', '%'].includes(c)) {
      tokens.push({ type: 'operator', value: c });
      i += 1;
      continue;
    }

    throw new Error(`Invalid token: ${c}`);
  }

  return insertImplicitMultiplication(tokens);
}

function isFunctionName(name) {
  return Object.hasOwn(FUNCTION_ARITY, name);
}

function isConstant(name) {
  return Object.hasOwn(CONSTANTS, name);
}

function canEndValue(token) {
  if (!token) return false;
  if (token.type === 'number' || token.type === 'rightParen') return true;
  if (token.type === 'identifier' && isConstant(token.value)) return true;
  return token.type === 'operator' && (token.value === '!' || token.value === '%');
}

function canStartValue(token) {
  if (!token) return false;
  return token.type === 'number' || token.type === 'leftParen' || token.type === 'identifier';
}

function shouldSkipImplicitMultiply(left, right) {
  return left.type === 'identifier' && isFunctionName(left.value) && right.type === 'leftParen';
}

function insertImplicitMultiplication(tokens) {
  if (!tokens.length) return tokens;

  const out = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 1) {
    const prev = out[out.length - 1];
    const next = tokens[i];
    if (canEndValue(prev) && canStartValue(next) && !shouldSkipImplicitMultiply(prev, next)) {
      out.push({ type: 'operator', value: '*' });
    }
    out.push(next);
  }
  return out;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  current() {
    return this.tokens[this.index] || null;
  }

  match(type, value) {
    const token = this.current();
    if (!token) return false;
    if (token.type !== type) return false;
    if (typeof value !== 'undefined' && token.value !== value) return false;
    this.index += 1;
    return true;
  }

  expect(type, value, message) {
    if (!this.match(type, value)) {
      throw new Error(message || 'Invalid expression');
    }
  }

  parse() {
    const value = this.parseAddSubtract();
    if (this.current()) {
      throw new Error('Invalid expression');
    }
    return value;
  }

  parseAddSubtract() {
    let value = this.parseMultiplyDivide();
    while (true) {
      if (this.match('operator', '+')) {
        value += this.parseMultiplyDivide();
      } else if (this.match('operator', '-')) {
        value -= this.parseMultiplyDivide();
      } else {
        break;
      }
    }
    return value;
  }

  parseMultiplyDivide() {
    let value = this.parsePower();
    while (true) {
      if (this.match('operator', '*')) {
        value *= this.parsePower();
      } else if (this.match('operator', '/')) {
        const divisor = this.parsePower();
        if (divisor === 0) {
          throw createUndefinedError();
        }
        value /= divisor;
      } else {
        break;
      }
    }
    return value;
  }

  parsePower() {
    let value = this.parseUnary();
    if (this.match('operator', '^')) {
      const exponent = this.parsePower();
      value = Math.pow(value, exponent);
    }
    return value;
  }

  parseUnary() {
    if (this.match('operator', '+')) {
      return this.parseUnary();
    }
    if (this.match('operator', '-')) {
      return -this.parseUnary();
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let value = this.parsePrimary();
    while (true) {
      if (this.match('operator', '!')) {
        value = factorial(value);
      } else if (this.match('operator', '%')) {
        value /= 100;
      } else {
        break;
      }
    }
    return value;
  }

  parsePrimary() {
    const token = this.current();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (this.match('number')) {
      return token.value;
    }

    if (this.match('leftParen')) {
      const value = this.parseAddSubtract();
      this.expect('rightParen', ')', 'Mismatched parentheses');
      return value;
    }

    if (this.match('identifier')) {
      const name = token.value;

      if (isConstant(name)) {
        return CONSTANTS[name];
      }

      if (!isFunctionName(name)) {
        throw new Error(`Unknown identifier: ${name}`);
      }

      this.expect('leftParen', '(', `Function "${name}" must use parentheses`);

      const args = [];
      if (!this.match('rightParen', ')')) {
        while (true) {
          args.push(this.parseAddSubtract());
          if (this.match('rightParen', ')')) break;
          this.expect('comma', ',', `Function "${name}" arguments must be comma separated`);
        }
      }

      return applyFunction(name, args);
    }

    throw new Error('Invalid expression');
  }
}

function factorial(value) {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw createUndefinedError();
  }
  if (value > 170) {
    throw new Error('Factorial input is too large');
  }
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

function assertIntegerValue(value) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw createUndefinedError();
  }
}

function normalizeCombinatoricInputs(n, r) {
  assertIntegerValue(n);
  assertIntegerValue(r);
  if (n < 0 || r < 0 || r > n) {
    throw createUndefinedError();
  }
}

function combination(n, r) {
  normalizeCombinatoricInputs(n, r);
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i;
    if (!Number.isFinite(result)) {
      throw new Error('Value too large');
    }
  }
  return Math.round(result);
}

function permutation(n, r) {
  normalizeCombinatoricInputs(n, r);
  let result = 1;
  for (let i = 0; i < r; i += 1) {
    result *= n - i;
    if (!Number.isFinite(result)) {
      throw new Error('Value too large');
    }
  }
  return Math.round(result);
}

function gcd(a, b) {
  assertIntegerValue(a);
  assertIntegerValue(b);
  let x = Math.abs(a);
  let y = Math.abs(b);
  if (x === 0 && y === 0) {
    throw createUndefinedError();
  }
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcm(a, b) {
  assertIntegerValue(a);
  assertIntegerValue(b);
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

function assertFunctionArity(name, args) {
  const allowed = FUNCTION_ARITY[name];
  if (!allowed || !allowed.includes(args.length)) {
    throw new Error(`Function "${name}" expects ${allowed.join(' or ')} argument(s)`);
  }
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function radToDeg(value) {
  return (value * 180) / Math.PI;
}

function normalizeInverseInput(value) {
  if (value >= -1 && value <= 1) {
    return value;
  }

  // User-friendly mode: allow clear percentage-style input like asin(60) -> asin(0.60)
  if (Math.abs(value) >= 10 && Math.abs(value) <= 100) {
    return value / 100;
  }

  throw createUndefinedError();
}

function applyFunction(name, args) {
  assertFunctionArity(name, args);
  const [a, b] = args;

  switch (name) {
    case 'sin':
      return Math.sin(degToRad(a));
    case 'cos':
      return Math.cos(degToRad(a));
    case 'tan': {
      const rad = degToRad(a);
      if (Math.abs(Math.cos(rad)) < 1e-12) {
        throw createUndefinedError();
      }
      return Math.tan(rad);
    }
    case 'sinh':
      return Math.sinh(degToRad(a));
    case 'cosh':
      return Math.cosh(degToRad(a));
    case 'tanh':
      return Math.tanh(degToRad(a));
    case 'asin': {
      const input = normalizeInverseInput(a);
      return radToDeg(Math.asin(input));
    }
    case 'acos': {
      const input = normalizeInverseInput(a);
      return radToDeg(Math.acos(input));
    }
    case 'atan':
      return radToDeg(Math.atan(a));
    case 'asinh':
      return radToDeg(Math.asinh(a));
    case 'acosh':
      if (a < 1) throw createUndefinedError();
      return radToDeg(Math.acosh(a));
    case 'atanh':
      if (a <= -1 || a >= 1) throw createUndefinedError();
      return radToDeg(Math.atanh(a));
    case 'sqrt':
      if (a < 0) throw createUndefinedError();
      return Math.sqrt(a);
    case 'cbrt':
      return Math.cbrt(a);
    case 'root': {
      if (b === 0) throw createUndefinedError();
      if (a < 0) {
        if (!Number.isInteger(b) || Math.abs(b % 2) !== 1) {
          throw createUndefinedError();
        }
        return -Math.pow(Math.abs(a), 1 / b);
      }
      return Math.pow(a, 1 / b);
    }
    case 'ln':
      if (a <= 0) throw createUndefinedError();
      return Math.log(a);
    case 'log':
      if (a <= 0) throw createUndefinedError();
      if (args.length === 1) return Math.log10(a);
      if (b <= 0 || b === 1) throw createUndefinedError();
      return Math.log(a) / Math.log(b);
    case 'mod':
      if (b === 0) throw createUndefinedError();
      return ((a % b) + b) % b;
    case 'gcd':
      return gcd(a, b);
    case 'lcm':
      return lcm(a, b);
    case 'ncr':
      return combination(a, b);
    case 'npr':
      return permutation(a, b);
    case 'abs':
      return Math.abs(a);
    case 'exp':
      return Math.exp(a);
    case 'floor':
      return Math.floor(a);
    case 'ceil':
      return Math.ceil(a);
    case 'round':
      return Math.round(a);
    case 'pow':
      return Math.pow(a, b);
    default:
      throw new Error(`Unsupported function: ${name}`);
  }
}

export function evaluateExpression(expression) {
  const tokens = tokenize(expression);
  if (tokens.length === 0) {
    throw new Error('Empty expression');
  }

  const parser = new Parser(tokens);
  const value = parser.parse();
  if (!Number.isFinite(value)) {
    throw createUndefinedError();
  }
  return value;
}

export function formatResult(value) {
  if (!Number.isFinite(value)) {
    return 'Undefined';
  }

  if (Object.is(value, -0)) {
    return '0';
  }

  const abs = Math.abs(value);
  if ((abs >= 1e12 || (abs > 0 && abs < 1e-9)) && abs !== 0) {
    return value.toExponential(10).replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(12).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
