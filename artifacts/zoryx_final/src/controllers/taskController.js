const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const TaskRequest = require('../models/TaskRequest');
const User = require('../models/User');
const bot = require('../bot/bot');
const { isAdmin, getPermissions } = require('../bot/middlewares/adminCheck');
const { extractChannelUsername } = require('../utils/extractChannel');
const { addBalance, normalizeUrl } = require('../utils/economy');
const { PLATFORM_ACTIONS, getVerificationMode } = require('../utils/taskActions');
const { MIN_TASK_REWARD_USDT, MAX_TASK_REWARD_USDT, OWNER_IDS } = require('../config');

const MIN_WAIT_MS = 10000; // wait-verify platforms: min time between "Go" and "Check"

function validateReward(rewardUSDT) {
  const r = Number(rewardUSDT);
  if (Number.isNaN(r)) return null;
  if (r < MIN_TASK_REWARD_USDT || r > MAX_TASK_REWARD_USDT) return null;
  return Math.round(r * 1000) / 1000;
}

function validateAction(platform, actionType) {
  const allowed = PLATFORM_ACTIONS[platform];
  return allowed && allowed.includes(actionType);
}

// ================= Task listing =================
async function listTasks(req, res) {
  const telegramId = String(req.tgUser.id);
  const admin = await isAdmin(telegramId);

  const tasks = await Task.find({
    active: true,
    $or: [{ maxCompletions: null }, { $expr: { $lt: ['$completionsCount', '$maxCompletions'] } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const completions = await TaskCompletion.find({ userId: telegramId }).lean();
  const completionMap = new Map(completions.map((c) => [String(c.taskId), c]));

  const result = tasks.map((task) => {
    const c = completionMap.get(String(task._id));
    return {
      id: task._id,
      title: task.title,
      url: task.url,
      platform: task.platform,
      actionType: task.actionType,
      rewardUSDT: task.rewardUSDT,
      verificationMode: getVerificationMode(task.platform),
      status: c ? c.status : 'new', // new | started | pending_verification | claimable | completed
    };
  });

  return res.json({ tasks: result, isAdmin: admin });
}

// ================= Admin: create free task =================
async function createTask(req, res) {
  const telegramId = String(req.tgUser.id);
  const admin = await isAdmin(telegramId);
  const perms = await getPermissions(telegramId);
  if (!admin || !perms.canAddTask) {
    return res.status(403).json({ error: 'Not authorized to add tasks' });
  }

  const { title, url, platform, actionType, rewardUSDT } = req.body;
  if (!title || !url || !platform || !actionType) {
    return res.status(400).json({ error: 'title, url, platform and actionType are required' });
  }
  if (!Task.PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  if (!validateAction(platform, actionType)) {
    return res.status(400).json({ error: 'Invalid action type for this platform' });
  }
  const reward = validateReward(rewardUSDT);
  if (reward === null) {
    return res.status(400).json({ error: `Reward must be between ${MIN_TASK_REWARD_USDT} and ${MAX_TASK_REWARD_USDT} USDT` });
  }

  const urlNormalized = normalizeUrl(url);
  const duplicate = await Task.findOne({ urlNormalized, active: true });
  if (duplicate) {
    return res.status(400).json({ error: 'A task with this exact link is already active. Please use a different link.' });
  }

  const channelUsername = platform === 'telegram_channel' ? extractChannelUsername(url) : null;

  const task = await Task.create({
    title,
    url,
    urlNormalized,
    platform,
    actionType,
    rewardUSDT: reward,
    channelUsername,
    createdBy: telegramId,
    active: true,
  });

  return res.json({ ok: true, task });
}

async function deleteTask(req, res) {
  const telegramId = String(req.tgUser.id);
  const admin = await isAdmin(telegramId);
  const perms = await getPermissions(telegramId);
  if (!admin || !perms.canAddTask) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  await Task.findByIdAndUpdate(req.params.id, { active: false });
  return res.json({ ok: true });
}

// ================= Regular user: request a paid task be posted =================
async function submitTaskRequest(req, res) {
  const telegramId = String(req.tgUser.id);
  const { title, url, platform } = req.body;

  if (!title || !url || !platform) {
    return res.status(400).json({ error: 'title, url and platform are required' });
  }
  if (!Task.PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  const urlNormalized = normalizeUrl(url);

  const [dupRequest, dupTask] = await Promise.all([
    TaskRequest.findOne({ urlNormalized, status: 'pending' }),
    Task.findOne({ urlNormalized, active: true }),
  ]);
  if (dupRequest || dupTask) {
    return res.status(400).json({ error: 'This link has already been submitted or is already an active task.' });
  }

  const request = await TaskRequest.create({
    sponsorTelegramId: telegramId,
    platform,
    url,
    urlNormalized,
    title,
    status: 'pending',
  });

  for (const ownerId of OWNER_IDS) {
    try {
      await bot.telegram.sendMessage(
        ownerId,
        `🆕 New task request (payment to verify manually)\nBy: ${telegramId}\nTitle: ${title}\nPlatform: ${platform}\nLink: ${url}\nRequest ID: ${request._id}\n\nCheck your wallet for the payment, then open the Mini App → Tasks → Requests to mark it handled, and add the real task from "+ Add Task".`
      );
    } catch (e) {
      /* ignore */
    }
  }

  return res.json({ ok: true, request });
}

async function listPendingTaskRequests(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const requests = await TaskRequest.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
  return res.json({
    requests: requests.map((r) => ({
      id: r._id,
      title: r.title,
      platform: r.platform,
      url: r.url,
      sponsorTelegramId: r.sponsorTelegramId,
      createdAt: r.createdAt,
    })),
  });
}

async function handleTaskRequest(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const request = await TaskRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') return res.status(404).json({ error: 'Request not found' });

  request.status = 'handled';
  await request.save();

  try {
    await bot.telegram.sendMessage(request.sponsorTelegramId, `✅ Payment confirmed! Your task "${request.title}" is being added now.`);
  } catch (e) {}

  return res.json({ ok: true });
}

async function rejectTaskRequest(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const request = await TaskRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') return res.status(404).json({ error: 'Request not found' });

  request.status = 'rejected';
  await request.save();

  try {
    await bot.telegram.sendMessage(request.sponsorTelegramId, `❌ Your task request "${request.title}" was rejected (payment not found). Please contact support.`);
  } catch (e) {}

  return res.json({ ok: true });
}

// ================= Go =================
// IMPORTANT: only creates/marks the completion as "started" if the user
// hasn't already progressed on this task. If the task is already claimable,
// pending_verification, or completed, "Go" just re-opens the link WITHOUT
// resetting progress - this is what previously allowed unlimited re-claiming
// (tap Go -> status reset to "started" -> Check -> Claim -> repeat).
async function startTask(req, res) {
  const telegramId = String(req.tgUser.id);
  const { taskId } = req.body;

  const task = await Task.findById(taskId);
  if (!task || !task.active) return res.status(404).json({ error: 'Task not found' });

  const existing = await TaskCompletion.findOne({ userId: telegramId, taskId });

  if (existing && ['claimable', 'pending_verification', 'completed'].includes(existing.status)) {
    // Already progressed past "started" - don't touch it, just let the
    // frontend re-open the link. Status stays exactly as it was.
    return res.json({ ok: true, status: existing.status });
  }

  await TaskCompletion.findOneAndUpdate(
    { userId: telegramId, taskId },
    { $setOnInsert: { startedAt: new Date() }, status: 'started', submittedUsername: null },
    { upsert: true, new: true }
  );

  return res.json({ ok: true, status: 'started' });
}

// ================= Check (auto/wait platforms) =================
// Verifies eligibility only. On success the task becomes CLAIMABLE - the user
// still has to tap "Claim" to actually receive the reward.
async function checkTask(req, res) {
  const telegramId = String(req.tgUser.id);
  const { taskId } = req.body;

  const task = await Task.findById(taskId);
  if (!task || !task.active) return res.status(404).json({ error: 'Task not found' });

  const completion = await TaskCompletion.findOne({ userId: telegramId, taskId });
  if (!completion) {
    return res.status(400).json({ error: 'Tap "Go" first before checking' });
  }
  if (completion.status === 'completed') {
    return res.json({ ok: true, status: 'completed', alreadyCompleted: true });
  }
  if (completion.status === 'claimable') {
    return res.json({ ok: true, status: 'claimable' });
  }

  const mode = getVerificationMode(task.platform);

  if (mode === 'auto') {
    // Self-heal: if channelUsername wasn't saved when the task was created
    // (e.g. the link had a trailing space or query string), try extracting
    // it again from the stored URL before giving up.
    if (!task.channelUsername) {
      const reExtracted = extractChannelUsername(task.url);
      if (reExtracted) {
        task.channelUsername = reExtracted;
        await task.save();
      }
     }

    if (!task.channelUsername) {
      return res.status(400).json({
        error: 'This channel link could not be verified automatically. Please contact support.',
      });
    }

    try {
      const member = await bot.telegram.getChatMember(task.channelUsername, telegramId);
      const joined = ['member', 'administrator', 'creator'].includes(member.status);
      if (!joined) {
        return res.status(400).json({ error: 'Please join the channel first, then check again.' });
      }
    } catch (e) {
      return res.status(400).json({
        error: 'Could not verify channel membership. Make sure ZORY X BOT is an admin of that channel.',
      });
    }
  } else if (mode === 'wait') {
    const elapsed = Date.now() - new Date(completion.startedAt).getTime();
    if (elapsed < MIN_WAIT_MS) {
      return res.status(400).json({ error: 'Please complete the task first, then tap Check again.' });
    }
  } else {
    return res.status(400).json({ error: 'This task requires manual verification. Tap "Verify Now" instead.' });
  }

  completion.status = 'claimable';
  completion.claimableAt = new Date();
  await completion.save();

  return res.json({ ok: true, status: 'claimable' });
}

// ================= Verify Now (manual platforms) =================
async function submitVerification(req, res) {
  const telegramId = String(req.tgUser.id);
  const { taskId, username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Please enter your username on that platform' });
  }

  const task = await Task.findById(taskId);
  if (!task || !task.active) return res.status(404).json({ error: 'Task not found' });

  const completion = await TaskCompletion.findOne({ userId: telegramId, taskId });
  if (!completion) {
    return res.status(400).json({ error: 'Tap "Go" first before verifying' });
  }
  if (completion.status === 'completed' || completion.status === 'claimable') {
    return res.json({ ok: true, status: completion.status, alreadyCompleted: true });
  }

  completion.status = 'pending_verification';
  completion.submittedUsername = username.trim();
  await completion.save();

  for (const ownerId of OWNER_IDS) {
    try {
      await bot.telegram.sendMessage(
        ownerId,
        `🔍 New verification request\nUser: ${telegramId}\nTask: ${task.title}\nPlatform: ${task.platform} (${task.actionType})\nSubmitted username: ${username.trim()}\n\nReview it in the Mini App → Tasks → Verifications.`
      );
    } catch (e) {}
  }

  return res.json({ ok: true, status: 'pending_verification' });
}

async function listPendingVerifications(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const list = await TaskCompletion.find({ status: 'pending_verification' })
    .sort({ updatedAt: 1 })
    .limit(50)
    .populate('taskId')
    .lean();

  return res.json({
    verifications: list
      .filter((v) => v.taskId)
      .map((v) => ({
        id: v._id,
        userId: v.userId,
        submittedUsername: v.submittedUsername,
        taskTitle: v.taskId.title,
        platform: v.taskId.platform,
        actionType: v.taskId.actionType,
        rewardUSDT: v.taskId.rewardUSDT,
        taskUrl: v.taskId.url,
      })),
  });
}

// Admin approves the submitted username -> task becomes CLAIMABLE (not
// completed yet). The user still has to open the app and tap Claim.
async function approveVerification(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const completion = await TaskCompletion.findById(req.params.id).populate('taskId');
  if (!completion || completion.status !== 'pending_verification' || !completion.taskId) {
    return res.status(404).json({ error: 'Verification not found' });
  }

  completion.status = 'claimable';
  completion.claimableAt = new Date();
  await completion.save();

  try {
    await bot.telegram.sendMessage(
      completion.userId,
      `✅ Your submission for "${completion.taskId.title}" was verified! Open ZORY X BOT → Tasks and tap Claim to receive your reward.`
    );
  } catch (e) {}

  return res.json({ ok: true });
}

async function rejectVerification(req, res) {
  const telegramId = String(req.tgUser.id);
  if (!(await isAdmin(telegramId))) return res.status(403).json({ error: 'Not authorized' });

  const completion = await TaskCompletion.findById(req.params.id).populate('taskId');
  if (!completion || completion.status !== 'pending_verification') {
    return res.status(404).json({ error: 'Verification not found' });
  }

  completion.status = 'started';
  completion.submittedUsername = null;
  await completion.save();

  try {
    await bot.telegram.sendMessage(
      completion.userId,
      `❌ We couldn't verify your submission for "${completion.taskId ? completion.taskId.title : 'the task'}". Please double check and tap "Verify Now" again.`
    );
  } catch (e) {}

  return res.json({ ok: true });
}

// ================= Claim =================
// Final step for EVERY task type (auto/wait/manual alike) - only after this
// does the reward actually get credited to the user's USDT balance.
async function claimTask(req, res) {
  const telegramId = String(req.tgUser.id);
  const { taskId } = req.body;

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const completion = await TaskCompletion.findOne({ userId: telegramId, taskId });
  if (!completion || completion.status !== 'claimable') {
    return res.status(400).json({ error: 'Nothing to claim for this task yet.' });
  }

  if (task.maxCompletions && task.completionsCount >= task.maxCompletions) {
    return res.status(400).json({ error: 'This task has reached its completion limit.' });
  }

  completion.status = 'completed';
  completion.completedAt = new Date();
  await completion.save();

  task.completionsCount += 1;
  await task.save();

  const user = await User.findOne({ telegramId });
  addBalance(user, task.rewardUSDT);
  user.completedTasksCount += 1;
  await user.save();

  return res.json({
    ok: true,
    status: 'completed',
    rewardUSDT: task.rewardUSDT,
    balanceUSDT: user.balanceUSDT,
  });
}

module.exports = {
  listTasks,
  createTask,
  deleteTask,
  submitTaskRequest,
  listPendingTaskRequests,
  handleTaskRequest,
  rejectTaskRequest,
  startTask,
  checkTask,
  submitVerification,
  listPendingVerifications,
  approveVerification,
  rejectVerification,
  claimTask,
};
