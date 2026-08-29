const User = require('../models/User');
const WithdrawRequest = require('../models/WithdrawRequest');
const AdWatch = require('../models/AdWatch');
const Settings = require('../models/Settings');
const Event = require('../models/Event');
const bot = require('../bot/bot');
const { verifyInitData } = require('../utils/verifyTelegram');
const { isAdmin } = require('../bot/middlewares/adminCheck');
const { isSameUTCDate, addBalance, getWeekKey } = require('../utils/economy');
const { ACHIEVEMENTS, getProgress } = require('../utils/achievements');
const {
  BOT_USERNAME,
  AD_REWARD_USDT_DEFAULT,
  DAILY_CHECKIN_REWARD_USDT,
  SUPPORTED_LANGS,
  WITHDRAW_MIN_USDT,
  WITHDRAW_MAX_USDT,
  TASK_PAYMENT_ADDRESS,
  TASK_PAYMENT_NETWORK,
  TASK_POST_PAYMENT_USDT,
  OFFICIAL_CHANNEL,
  COMMUNITY_CHANNEL,
  BASE_FAKE_USERS,
  BASE_FAKE_TASKS,
  BASE_FAKE_REWARDS_USD,
  LAUNCH_DATE,
  LEADERBOARD_LIMIT,
  OWNER_IDS,
} = require('../config');

async function requireTelegramAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;
  const tgUser = verifyInitData(initData);
  if (!tgUser) {
    return res.status(401).json({ error: 'Invalid or missing Telegram auth data' });
  }
  req.tgUser = tgUser;
  next();
}

async function getSettings() {
  let settings = await Settings.findOne({ singleton: 'main' });
  if (!settings) {
    settings = await Settings.create({ singleton: 'main', adRewardUSDT: AD_REWARD_USDT_DEFAULT });
  }
  return settings;
}

// Lightweight endpoint for frequent polling (live balance sync) - avoids the
// heavier /me call which also hits the Telegram API for the profile photo.
async function getBalance(req, res) {
  const telegramId = String(req.tgUser.id);
  const user = await User.findOne({ telegramId }, { balanceUSDT: 1 }).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ balanceUSDT: user.balanceUSDT });
}

async function getMe(req, res) {
  const telegramId = String(req.tgUser.id);
  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await User.create({
      telegramId,
      firstName: req.tgUser.first_name || '',
      lastName: req.tgUser.last_name || '',
      username: req.tgUser.username || '',
      language: null,
    });
  }

  let photoUrl = user.photoUrl;
  try {
    const photos = await bot.telegram.getUserProfilePhotos(telegramId, 0, 1);
    if (photos && photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const link = await bot.telegram.getFileLink(fileId);
      photoUrl = link.href;
      if (photoUrl !== user.photoUrl) {
        user.photoUrl = photoUrl;
        await user.save();
      }
    }
  } catch (e) {
    /* profile photo optional */
  }

  const admin = await isAdmin(telegramId);
  const canCheckInToday = !isSameUTCDate(user.lastCheckInAt, new Date());
  const settings = await getSettings();

  return res.json({
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    language: user.language,
    balanceUSDT: user.balanceUSDT,
    referralCount: user.referralCount,
    completedTasksCount: user.completedTasksCount,
    checkInStreak: user.checkInStreak,
    canCheckInToday,
    dailyCheckInRewardUSDT: DAILY_CHECKIN_REWARD_USDT,
    adRewardUSDT: settings.adRewardUSDT,
    isAdmin: admin,
    referralLink: `https://t.me/${BOT_USERNAME}?start=ref_${user.telegramId}`,
    officialChannel: OFFICIAL_CHANNEL,
    communityChannel: COMMUNITY_CHANNEL,
    taskPostPaymentUSDT: TASK_POST_PAYMENT_USDT,
  });
}

async function setLanguage(req, res) {
  const { lang } = req.body;
  if (!SUPPORTED_LANGS.includes(lang)) {
    return res.status(400).json({ error: 'Unsupported language' });
  }
  const telegramId = String(req.tgUser.id);
  await User.updateOne({ telegramId }, { language: lang }, { upsert: true });
  return res.json({ ok: true, language: lang });
}

// ================= Daily Check-in =================
async function dailyCheckIn(req, res) {
  const telegramId = String(req.tgUser.id);
  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (isSameUTCDate(user.lastCheckInAt, new Date())) {
    return res.status(400).json({ error: 'Already checked in today' });
  }

  const wasYesterday =
    user.lastCheckInAt &&
    Date.now() - new Date(user.lastCheckInAt).getTime() < 48 * 60 * 60 * 1000;

  user.checkInStreak = wasYesterday ? user.checkInStreak + 1 : 1;
  user.lastCheckInAt = new Date();
  addBalance(user, DAILY_CHECKIN_REWARD_USDT);
  await user.save();

  return res.json({
    ok: true,
    balanceUSDT: user.balanceUSDT,
    checkInStreak: user.checkInStreak,
    rewardedUSDT: DAILY_CHECKIN_REWARD_USDT,
  });
}

// ================= Leaderboard =================
async function getLeaderboard(req, res) {
  const type = req.query.type || 'tasks'; // tasks | invites | weekly
  const telegramId = String(req.tgUser.id);

  if (type === 'invites') {
    const top = await User.find({}, { firstName: 1, username: 1, photoUrl: 1, referralCount: 1, telegramId: 1 })
      .sort({ referralCount: -1 })
      .limit(LEADERBOARD_LIMIT)
      .lean();
    return res.json(
      top.map((u, i) => ({
        rank: i + 1,
        name: u.firstName || u.username || 'Player',
        photoUrl: u.photoUrl || '',
        value: u.referralCount,
        isYou: u.telegramId === telegramId,
      }))
    );
  }

  if (type === 'weekly') {
    const currentWeekKey = getWeekKey();
    const top = await User.find(
      { weeklyWeekKey: currentWeekKey },
      { firstName: 1, username: 1, photoUrl: 1, weeklyUSDT: 1, telegramId: 1 }
    )
      .sort({ weeklyUSDT: -1 })
      .limit(LEADERBOARD_LIMIT)
      .lean();
    return res.json(
      top.map((u, i) => ({
        rank: i + 1,
        name: u.firstName || u.username || 'Player',
        photoUrl: u.photoUrl || '',
        value: u.weeklyUSDT,
        isYou: u.telegramId === telegramId,
      }))
    );
  }

  // default: "tasks" -> total balance ranking
  const top = await User.find({}, { firstName: 1, username: 1, photoUrl: 1, balanceUSDT: 1, telegramId: 1 })
    .sort({ balanceUSDT: -1 })
    .limit(LEADERBOARD_LIMIT)
    .lean();
  return res.json(
    top.map((u, i) => ({
      rank: i + 1,
      name: u.firstName || u.username || 'Player',
      photoUrl: u.photoUrl || '',
      value: u.balanceUSDT,
      isYou: u.telegramId === telegramId,
    }))
  );
}

// ================= Live platform stats =================
async function getStats(req, res) {
  const [realUsers, realTasksCompleted, realBalanceAgg] = await Promise.all([
    User.countDocuments({ isFake: false }),
    User.aggregate([{ $group: { _id: null, total: { $sum: '$completedTasksCount' } } }]),
    User.aggregate([{ $group: { _id: null, total: { $sum: '$balanceUSDT' } } }]),
  ]);
  const realTasksTotal = (realTasksCompleted[0] && realTasksCompleted[0].total) || 0;
  const realRewardsUSD = (realBalanceAgg[0] && realBalanceAgg[0].total) || 0;

  const runningDays = Math.max(1, Math.floor((Date.now() - new Date(LAUNCH_DATE).getTime()) / 86400000));

  return res.json({
    totalTasks: BASE_FAKE_TASKS + realTasksTotal,
    totalRewardsUSD: Math.round((BASE_FAKE_REWARDS_USD + realRewardsUSD) * 100) / 100,
    totalUsers: BASE_FAKE_USERS + realUsers,
    runningDays,
  });
}

// ================= Achievements =================
async function getAchievements(req, res) {
  const telegramId = String(req.tgUser.id);
  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const list = ACHIEVEMENTS.map((a) => {
    const progress = getProgress(user, a);
    return {
      id: a.id,
      category: a.category,
      icon: a.icon,
      titleKey: a.titleKey,
      descKey: a.descKey,
      target: a.target,
      progress: Math.min(progress, a.target),
      rewardUSDT: a.rewardUSDT,
      claimed: user.claimedAchievements.includes(a.id),
      claimable: progress >= a.target && !user.claimedAchievements.includes(a.id),
    };
  });

  return res.json({
    achievements: list,
    completedCount: list.filter((a) => a.claimed).length,
    totalCount: list.length,
  });
}

async function claimAchievement(req, res) {
  const telegramId = String(req.tgUser.id);
  const { achievementId } = req.body;
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return res.status(404).json({ error: 'Achievement not found' });

  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.claimedAchievements.includes(achievementId)) {
    return res.status(400).json({ error: 'Already claimed' });
  }
  const progress = getProgress(user, def);
  if (progress < def.target) {
    return res.status(400).json({ error: 'Not completed yet' });
  }

  user.claimedAchievements.push(achievementId);
  addBalance(user, def.rewardUSDT);
  await user.save();

  return res.json({ ok: true, balanceUSDT: user.balanceUSDT, rewardedUSDT: def.rewardUSDT });
}

// ================= Ads =================
async function watchAd(req, res) {
  const telegramId = String(req.tgUser.id);
  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const COOLDOWN_MS = 30 * 1000;
  if (user.lastAdWatchAt && Date.now() - new Date(user.lastAdWatchAt).getTime() < COOLDOWN_MS) {
    return res.status(429).json({ error: 'Please wait before watching another ad' });
  }

  const settings = await getSettings();
  const reward = settings.adRewardUSDT;

  addBalance(user, reward);
  user.lastAdWatchAt = new Date();
  await user.save();

  await AdWatch.create({ userId: telegramId, amountUSDT: reward, watchedAt: new Date() });

  return res.json({ ok: true, balanceUSDT: user.balanceUSDT, rewardedUSDT: reward });
}

async function getAdHistory(req, res) {
  const telegramId = String(req.tgUser.id);
  const list = await AdWatch.find({ userId: telegramId }).sort({ watchedAt: -1 }).limit(50).lean();
  return res.json(list.map((a) => ({ amountUSDT: a.amountUSDT, watchedAt: a.watchedAt })));
}

// ================= Settings (admin: editable ad reward) =================
async function getAdRewardSetting(req, res) {
  const settings = await getSettings();
  return res.json({ adRewardUSDT: settings.adRewardUSDT });
}

async function updateAdRewardSetting(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const amount = Number(req.body.amountUSDT);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const settings = await getSettings();
  settings.adRewardUSDT = Math.round(amount * 1000) / 1000;
  await settings.save();

  return res.json({ ok: true, adRewardUSDT: settings.adRewardUSDT });
}

// ================= Withdraw =================
async function getWithdrawInfo(req, res) {
  const telegramId = String(req.tgUser.id);
  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    withdrawableUSDT: user.balanceUSDT,
    minUSDT: WITHDRAW_MIN_USDT,
    feeUSDT: 0,
  });
}

async function createWithdrawRequest(req, res) {
  const telegramId = String(req.tgUser.id);
  const { amountUSDT, recipientAddress } = req.body;

  const addr = (recipientAddress || '').trim();
  if (!addr || addr.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid wallet address' });
  }
  const amount = Number(amountUSDT);
  if (!amount || amount < WITHDRAW_MIN_USDT) {
    return res.status(400).json({ error: `Minimum withdrawal is ${WITHDRAW_MIN_USDT} USDT` });
  }
  if (amount > WITHDRAW_MAX_USDT) {
    return res.status(400).json({ error: `Maximum withdrawal is ${WITHDRAW_MAX_USDT} USDT` });
  }

  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (amount > user.balanceUSDT) {
    return res.status(400).json({ error: 'Amount exceeds your withdrawable balance' });
  }

  user.balanceUSDT = Math.round((user.balanceUSDT - amount) * 1000) / 1000;
  await user.save();

  const request = await WithdrawRequest.create({
    userId: telegramId,
    amountCoins: amount, // kept for schema compat; equals amountUSDT now (1:1, no coin unit)
    amountUSDT: amount,
    recipientAddress: addr,
    status: 'pending',
  });

  for (const ownerId of OWNER_IDS) {
    try {
      await bot.telegram.sendMessage(
        ownerId,
        `💸 New withdraw request\nUser: ${telegramId}\nAmount: ${amount} USDT\nAddress: ${addr}\nRequest ID: ${request._id}\n\nUse /withdrawals to review pending requests.`
      );
    } catch (e) {
      /* ignore unreachable owner */
    }
  }

  return res.json({ ok: true, requestId: request._id, balanceUSDT: user.balanceUSDT });
}

async function listMyWithdrawals(req, res) {
  const telegramId = String(req.tgUser.id);
  const list = await WithdrawRequest.find({ userId: telegramId }).sort({ createdAt: -1 }).limit(30).lean();
  return res.json(
    list.map((w) => ({
      id: w._id,
      amountUSDT: w.amountUSDT,
      recipientAddress: w.recipientAddress,
      status: w.status,
      createdAt: w.createdAt,
    }))
  );
}

// ================= Paid task submission info (for regular users) =================
async function getTaskPaymentInfo(req, res) {
  return res.json({
    address: TASK_PAYMENT_ADDRESS,
    network: TASK_PAYMENT_NETWORK,
    amountUSDT: TASK_POST_PAYMENT_USDT,
  });
}

// ================= Events (Activity -> Events tab) =================
async function listEvents(req, res) {
  const events = await Event.find({ active: true }).sort({ createdAt: -1 }).limit(30).lean();
  return res.json(events.map((e) => ({ id: e._id, title: e.title, description: e.description, link: e.link, createdAt: e.createdAt })));
}

async function createEvent(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const { title, description, link } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const event = await Event.create({ title, description: description || '', link: link || '', createdBy: telegramId });
  return res.json({ ok: true, event });
}

async function deleteEvent(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  await Event.findByIdAndUpdate(req.params.id, { active: false });
  return res.json({ ok: true });
}

module.exports = {
  requireTelegramAuth,
  getMe,
  getBalance,
  setLanguage,
  dailyCheckIn,
  getLeaderboard,
  getStats,
  getAchievements,
  claimAchievement,
  watchAd,
  getAdHistory,
  getAdRewardSetting,
  updateAdRewardSetting,
  getWithdrawInfo,
  createWithdrawRequest,
  listMyWithdrawals,
  getTaskPaymentInfo,
  listEvents,
  createEvent,
  deleteEvent,
};
