/**
 * Evaluates a deliberately small arithmetic grammar without executing code.
 * Supported syntax: decimal numbers, parentheses, +, -, *, /, and x as *.
 */
export type ArithmeticErrorCode =
  | 'numberRequired'
  | 'missingClosingParenthesis'
  | 'divisionByZero'
  | 'emptyExpression'
  | 'unsupportedCharacter'
  | 'nonFiniteResult';

export class ArithmeticEvaluationError extends Error {
  readonly code: ArithmeticErrorCode;

  constructor(code: ArithmeticErrorCode) {
    super(code);
    this.name = 'ArithmeticEvaluationError';
    this.code = code;
  }
}

export function evaluateArithmetic(source: string): number {
  const input = source.replace(/[xX×]/g, '*');
  let position = 0;

  const skipWhitespace = (): void => {
    while (/\s/.test(input[position] ?? '')) position += 1;
  };

  const parseNumber = (): number => {
    skipWhitespace();
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(input.slice(position));
    if (!match) throw new ArithmeticEvaluationError('numberRequired');
    position += match[0].length;
    return Number(match[0]);
  };

  const parsePrimary = (): number => {
    skipWhitespace();
    const token = input[position];
    if (token === '+' || token === '-') {
      position += 1;
      const value = parsePrimary();
      return token === '-' ? -value : value;
    }
    if (token === '(') {
      position += 1;
      const value = parseExpression();
      skipWhitespace();
      if (input[position] !== ')') throw new ArithmeticEvaluationError('missingClosingParenthesis');
      position += 1;
      return value;
    }
    return parseNumber();
  };

  const parseTerm = (): number => {
    let value = parsePrimary();
    while (true) {
      skipWhitespace();
      const operator = input[position];
      if (operator !== '*' && operator !== '/') return value;
      position += 1;
      const right = parsePrimary();
      if (operator === '/' && right === 0) throw new ArithmeticEvaluationError('divisionByZero');
      value = operator === '*' ? value * right : value / right;
    }
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (true) {
      skipWhitespace();
      const operator = input[position];
      if (operator !== '+' && operator !== '-') return value;
      position += 1;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
  };

  if (input.trim() === '') throw new ArithmeticEvaluationError('emptyExpression');
  const result = parseExpression();
  skipWhitespace();
  if (position !== input.length) throw new ArithmeticEvaluationError('unsupportedCharacter');
  if (!Number.isFinite(result)) throw new ArithmeticEvaluationError('nonFiniteResult');
  return result;
}
