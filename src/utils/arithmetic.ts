/**
 * Evaluates a deliberately small arithmetic grammar without executing code.
 * Supported syntax: decimal numbers, parentheses, +, -, *, /, and x as *.
 */
export function evaluateArithmetic(source: string): number {
  const input = source.replace(/[xX×]/g, '*');
  let position = 0;

  const skipWhitespace = (): void => {
    while (/\s/.test(input[position] ?? '')) position += 1;
  };

  const parseNumber = (): number => {
    skipWhitespace();
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(input.slice(position));
    if (!match) throw new Error('需要数字');
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
      if (input[position] !== ')') throw new Error('缺少右括号');
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
      if (operator === '/' && right === 0) throw new Error('不能除以零');
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

  if (input.trim() === '') throw new Error('表达式为空');
  const result = parseExpression();
  skipWhitespace();
  if (position !== input.length) throw new Error('包含不支持的字符');
  if (!Number.isFinite(result)) throw new Error('结果不是有限数值');
  return result;
}
