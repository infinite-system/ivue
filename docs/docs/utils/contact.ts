export function contactLabel(opt: any): string {
  return opt?.first_name || opt?.last_name
    ? (opt?.first_name ? opt?.first_name + ' ' : '') + (opt?.last_name ?? '')
    : opt?.name || opt;
}

export function contactEmail(opt: any): string {
  const str = opt?.email ?? opt;
  return String(str).split('@')[0];
}

export function contactColorTrigger(opt: any): string {
  const color =
    contactLabel(opt) +
    ' ' + // Space here is on purpose, it gives better colors
    contactEmail(opt);
  return color;
}
