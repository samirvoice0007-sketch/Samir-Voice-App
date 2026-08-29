/**
 * Extracts a @username from a t.me/username or https://t.me/username link.
 * Returns null if the URL is not a recognizable public channel link
 * (private invite links like t.me/+xxxx can't be verified via getChatMember).
 */
function extractChannelUsername(url) {
  if (!url) return null;

  let cleaned = url.trim();
  // Strip query string / hash / fragment (e.g. ?start=xxx)
  cleaned = cleaned.split('?')[0].split('#')[0];
  // Strip the "/s/" public-preview prefix (t.me/s/channelname)
  cleaned = cleaned.replace(/t\.me\/s\//i, 't.me/');

  const match = cleaned.match(/t\.me\/([A-Za-z0-9_]{5,32})\/?$/i);
  if (!match) return null;
  return `@${match[1]}`;
}

module.exports = { extractChannelUsername };
