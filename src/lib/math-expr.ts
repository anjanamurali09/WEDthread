// Minimal safe evaluator for simple arithmetic typed into amount fields
// (e.g. "500+200", "1200/3"). Recursive-descent over +,-,*,/ and parens,
// no eval/Function — avoids exposing arbitrary JS execution from user input.
export function evalMathExpr(input: string): number | null {
  const src = input.trim();
  if (!src) return null;
  if (!/^[0-9+\-*/().\s]+$/.test(src)) return null;

  let i = 0;
  const peek = () => src[i];
  const skipSpace = () => { while (src[i] === " ") i++; };

  function parseExpr(): number {
    let value = parseTerm();
    skipSpace();
    while (peek() === "+" || peek() === "-") {
      const op = src[i++];
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
      skipSpace();
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    skipSpace();
    while (peek() === "*" || peek() === "/") {
      const op = src[i++];
      const rhs = parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
      skipSpace();
    }
    return value;
  }

  function parseFactor(): number {
    skipSpace();
    if (peek() === "(") {
      i++;
      const value = parseExpr();
      skipSpace();
      if (peek() === ")") i++;
      return value;
    }
    if (peek() === "-") { i++; return -parseFactor(); }
    const start = i;
    while (i < src.length && /[0-9.]/.test(src[i])) i++;
    if (start === i) throw new Error("bad expression");
    return parseFloat(src.slice(start, i));
  }

  try {
    skipSpace();
    const result = parseExpr();
    skipSpace();
    if (i !== src.length || Number.isNaN(result)) return null;
    return result;
  } catch {
    return null;
  }
}
