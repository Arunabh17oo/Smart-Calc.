function sanitizeExpression(expression) {
  return String(expression || '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[xX×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−]/g, '-');
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}

function tokenize(expression) {
  const src = sanitizeExpression(expression);
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

    throw new Error(`Invalid token: ${c}`);
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
      throw new Error('Unknown operator');
  }
}

export function evaluateExpression(expression) {
  const tokens = tokenize(expression);

  if (tokens.length === 0) {
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

export function formatResult(value) {
  if (!Number.isFinite(value)) {
    return 'Error';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(10).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
