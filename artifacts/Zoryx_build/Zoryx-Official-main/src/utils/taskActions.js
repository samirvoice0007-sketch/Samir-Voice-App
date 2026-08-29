// Which action types are selectable in the Add Task form, per platform.
// telegram_channel/telegram_bot/website use their own dedicated verification
// flow (auto-check or wait-timer) - the rest require the user to submit their
// username on that platform for manual admin review ("Verify Now" flow).

const PLATFORM_ACTIONS = {
  telegram_channel: ['join'],
  telegram_bot: ['start'],
  discord: ['join'],
  tiktok: ['follow', 'like', 'comment', 'share'],
  youtube: ['subscribe', 'like', 'comment'],
  instagram: ['follow', 'like', 'comment', 'share'],
  facebook: ['follow', 'like', 'comment', 'share'],
  twitter: ['follow', 'like', 'comment', 'repost'],
  website: ['visit'],
};

// Platforms verified automatically via the Telegram Bot API (getChatMember)
// NOTE: telegram_channel moved to WAIT_VERIFY below - most channels used here
// are private invite links (t.me/+xxxx), which the Bot API cannot resolve to
// check membership, so real auto-verification isn't possible for those.
const AUTO_VERIFY_PLATFORMS = [];

// Platforms verified with a simple "wait a few seconds then Check" flow
const WAIT_VERIFY_PLATFORMS = ['telegram_channel', 'telegram_bot', 'website'];

// Platforms that require the user to submit their username on that platform,
// which an admin then manually reviews and approves/rejects ("Verify Now")
const MANUAL_VERIFY_PLATFORMS = ['discord', 'tiktok', 'youtube', 'instagram', 'facebook', 'twitter'];

function getVerificationMode(platform) {
  if (AUTO_VERIFY_PLATFORMS.includes(platform)) return 'auto';
  if (WAIT_VERIFY_PLATFORMS.includes(platform)) return 'wait';
  if (MANUAL_VERIFY_PLATFORMS.includes(platform)) return 'manual';
  return 'wait';
}

module.exports = {
  PLATFORM_ACTIONS,
  AUTO_VERIFY_PLATFORMS,
  WAIT_VERIFY_PLATFORMS,
  MANUAL_VERIFY_PLATFORMS,
  getVerificationMode,
};
