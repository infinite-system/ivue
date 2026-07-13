// filter-expression.ts — evaluator for the SQL-ish filter strings the
// choose field sends to list endpoints, e.g.
//   (kind = 'company') AND (name ILIKE '%aco%' OR id::TEXT ILIKE '%aco%')
//
// A real backend hands this expression to PostgreSQL; the in-browser mock
// AND the reference Node server (server-node/server.ts — Node runs
// TypeScript natively) both import THIS file, so search behaves identically
// everywhere. Grammar (case-insensitive keywords):
//   expr   := or
//   or     := and (OR and)*
//   and    := unary (AND unary)*
//   unary  := NOT unary | primary
//   primary:= '(' expr ')' | comparison
//   comp   := operand (ILIKE|LIKE|=|!=|<>|<=|>=|<|>) operand
//           | operand IN '(' literal (',' literal)* ')'
//   operand:= identifier('::TEXT')? | 'string' | number | TRUE | FALSE | NULL

type Row = Record<string, any>;

interface Token {
  kind: 'ident' | 'string' | 'number' | 'op' | 'lparen' | 'rparen' | 'comma';
  value: string;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const source = expression;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index++;
    } else if (char === '(') {
      tokens.push({ kind: 'lparen', value: '(' });
      index++;
    } else if (char === ')') {
      tokens.push({ kind: 'rparen', value: ')' });
      index++;
    } else if (char === ',') {
      tokens.push({ kind: 'comma', value: ',' });
      index++;
    } else if (char === "'") {
      let value = '';
      index++;
      while (index < source.length) {
        if (source[index] === "'" && source[index + 1] === "'") {
          value += "'";
          index += 2;
        } else if (source[index] === "'") {
          break;
        } else {
          value += source[index++];
        }
      }
      index++; // closing quote
      tokens.push({ kind: 'string', value });
    } else if (
      /[0-9]/.test(char) ||
      (char === '-' && /[0-9]/.test(source[index + 1]))
    ) {
      let value = char;
      index++;
      while (index < source.length && /[0-9.]/.test(source[index])) {
        value += source[index++];
      }
      tokens.push({ kind: 'number', value });
    } else if (/[A-Za-z_]/.test(char)) {
      let value = char;
      index++;
      while (index < source.length && /[A-Za-z0-9_.:]/.test(source[index])) {
        value += source[index++];
      }
      tokens.push({ kind: 'ident', value });
    } else {
      let value = char;
      index++;
      if (
        '<>!='.includes(char) &&
        index < source.length &&
        '<>='.includes(source[index])
      ) {
        value += source[index++];
      }
      tokens.push({ kind: 'op', value });
    }
  }
  return tokens;
}

class Parser {
  // Node runs this file natively via type stripping, which forbids
  // constructor parameter properties — assign explicitly.
  private position = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }
  private next(): Token {
    return this.tokens[this.position++];
  }
  private isKeyword(word: string): boolean {
    const token = this.peek();
    return !!token && token.kind === 'ident' && token.value.toUpperCase() === word;
  }

  parse(): (row: Row) => boolean {
    return this.parseOr();
  }

  private parseOr(): (row: Row) => boolean {
    let left = this.parseAnd();
    while (this.isKeyword('OR')) {
      this.next();
      const right = this.parseAnd();
      const previous = left;
      left = (row) => previous(row) || right(row);
    }
    return left;
  }

  private parseAnd(): (row: Row) => boolean {
    let left = this.parseUnary();
    while (this.isKeyword('AND')) {
      this.next();
      const right = this.parseUnary();
      const previous = left;
      left = (row) => previous(row) && right(row);
    }
    return left;
  }

  private parseUnary(): (row: Row) => boolean {
    if (this.isKeyword('NOT')) {
      this.next();
      const inner = this.parseUnary();
      return (row) => !inner(row);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): (row: Row) => boolean {
    if (this.peek()?.kind === 'lparen') {
      this.next();
      const inner = this.parseOr();
      this.next(); // rparen
      return inner;
    }
    return this.parseComparison();
  }

  private parseOperand(): (row: Row) => any {
    const token = this.next();
    if (token.kind === 'string') return () => token.value;
    if (token.kind === 'number') return () => Number(token.value);
    if (token.kind === 'ident') {
      const upper = token.value.toUpperCase();
      if (upper === 'TRUE') return () => true;
      if (upper === 'FALSE') return () => false;
      if (upper === 'NULL') return () => null;
      // identifier with optional ::TEXT cast and dot paths
      const [path, cast] = token.value.split('::');
      const segments = path.split('.');
      return (row) => {
        let value: any = row;
        for (const segment of segments) value = value?.[segment];
        return cast?.toUpperCase() === 'TEXT' ? String(value ?? '') : value;
      };
    }
    throw new Error(`Unexpected token '${token.value}' in filter expression`);
  }

  private parseComparison(): (row: Row) => boolean {
    const left = this.parseOperand();
    const operatorToken = this.next();
    const operator =
      operatorToken.kind === 'ident'
        ? operatorToken.value.toUpperCase()
        : operatorToken.value;

    if (operator === 'IN') {
      this.next(); // lparen
      const literals: any[] = [];
      while (this.peek() && this.peek()?.kind !== 'rparen') {
        if (this.peek()?.kind === 'comma') {
          this.next();
          continue;
        }
        const literal = this.parseOperand();
        literals.push(literal({}));
      }
      this.next(); // rparen
      return (row) => literals.some((value) => looseEquals(left(row), value));
    }

    const right = this.parseOperand();
    switch (operator) {
      case 'ILIKE':
        return (row) => sqlLike(left(row), right(row), true);
      case 'LIKE':
        return (row) => sqlLike(left(row), right(row), false);
      case '=':
        return (row) => looseEquals(left(row), right(row));
      case '!=':
      case '<>':
        return (row) => !looseEquals(left(row), right(row));
      case '<':
        return (row) => left(row) < right(row);
      case '>':
        return (row) => left(row) > right(row);
      case '<=':
        return (row) => left(row) <= right(row);
      case '>=':
        return (row) => left(row) >= right(row);
      default:
        throw new Error(`Unsupported operator '${operator}'`);
    }
  }
}

function looseEquals(a: any, b: any): boolean {
  if (a === null || a === undefined) return b === null || b === undefined;
  return String(a) === String(b);
}

function sqlLike(value: any, pattern: any, caseInsensitive: boolean): boolean {
  const escaped = String(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  const regex = new RegExp(`^${escaped}$`, caseInsensitive ? 'i' : '');
  return regex.test(String(value ?? ''));
}

/** Compile a filter expression into a row predicate. Empty → match all. */
export function compileFilter(expression: string): (row: Row) => boolean {
  const trimmed = expression?.trim();
  if (!trimmed) return () => true;
  return new Parser(tokenize(trimmed)).parse();
}

/** Sort rows by 'column:asc,column2:desc' — the shared sort grammar. */
export function applySort<T extends Row>(rows: T[], sortExpression: string): T[] {
  const terms = (sortExpression ?? '')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => {
      const [column, direction] = term.split(':');
      return { column, descending: direction?.toLowerCase() === 'desc' };
    });
  if (!terms.length) return rows;
  return [...rows].sort((rowA, rowB) => {
    for (const { column, descending } of terms) {
      const a = rowA[column];
      const b = rowB[column];
      if (a === b) continue;
      const comparison =
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : String(a ?? '').localeCompare(String(b ?? ''));
      if (comparison !== 0) return descending ? -comparison : comparison;
    }
    return 0;
  });
}
