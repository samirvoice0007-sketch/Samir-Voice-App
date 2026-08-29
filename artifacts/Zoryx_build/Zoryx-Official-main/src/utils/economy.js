// ISO week key like "2026-W32", used to lazily bucket/reset weekly leaderboard USDT
function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

// Milliseconds until next Monday 00:00 UTC (when the weekly board resets)
function msUntilNextWeekReset() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const daysUntilMonday = (8 - day) % 7 || 7;
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday)
  );
  return next.getTime() - now.getTime();
}

// Adds `amountUSDT` to a user's balance + weekly bucket (lazily resetting the
// weekly bucket if the ISO week has rolled over). Does NOT save() - caller
// is expected to save the user document. Rounds to 3 decimal places to avoid
// floating point drift.
function addBalance(user, amountUSDT) {
  const currentWeekKey = getWeekKey();
  if (user.weeklyWeekKey !== currentWeekKey) {
    user.weeklyWeekKey = currentWeekKey;
    user.weeklyUSDT = 0;
  }
  user.balanceUSDT = Math.round((user.balanceUSDT + amountUSDT) * 1000) / 1000;
  user.weeklyUSDT = Math.round((user.weeklyUSDT + amountUSDT) * 1000) / 1000;
}

function isSameUTCDate(a, b) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// Normalizes a URL for duplicate/spam checks (lowercase, trimmed, trailing slash removed)
function normalizeUrl(url) {
  return String(url || '').trim().toLowerCase().replace(/\/+$/, '');
}

module.exports = { getWeekKey, msUntilNextWeekReset, addBalance, isSameUTCDate, normalizeUrl };
