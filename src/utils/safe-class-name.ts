/**
 * Convert class name, symbol to string.
 * 
 * @param className 
 * @returns 
 */
export function safeClassName(className: any) {
  let name = ''
  try {
    name = className?.name || String(className)
  } catch (e) {
    name = 'Unknown[failed to convert to string]'
  }
  return name
}