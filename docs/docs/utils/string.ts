import _ from 'lodash';

export function snakeToPascal(string: string): string {
  const stringParts = string.split('/');
  const lastPart = stringParts
    .pop()
    ?.split('_')
    .map((substr) => substr.charAt(0).toUpperCase() + substr.slice(1))
    .join('');
  if (lastPart) {
    stringParts.push(lastPart);
  }
  return stringParts.join('/');
}

export function snakeToClean(string: string): string {
  return string
    .split('_')
    .map((word: any) => _.capitalize(word.trim()))
    .join(' ');
}

export function fieldPropToClean(string: string): string {
  return _.capitalize(string.replaceAll('_', ' ').replaceAll('.', ' '));
}

export function formatPgValue(str: string): string {
  return "'" + str.replaceAll("'", "''") + "'";
}

export function formatPgArrayOfValues(arr: string[]): string[] {
  return arr.map((str) => formatPgValue(str));
}

export function appendPlural(count: number): string {
  if (count === 0 || count > 1) return 's';
  return '';
}
