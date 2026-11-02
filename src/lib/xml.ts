/** Encode dynamic values safely in XML text nodes and attributes. */
export const xmlEscape = (text: string): string => text.replace(/[<>&"']/g, char => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]!));
