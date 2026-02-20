/**
 * Escapes HTML characters to prevent XSS.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Converts newlines to BR tags.
 */
export function formatMultiline(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

/**
 * Converts URLs into clickable anchor tags.
 */
export function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    '<a href="$1" target="_blank" class="text-indigo-600 hover:underline font-medium break-all">$1</a>',
  );
}
