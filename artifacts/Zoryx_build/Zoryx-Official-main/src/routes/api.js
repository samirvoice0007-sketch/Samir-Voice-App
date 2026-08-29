const express = require('express');
const router = express.Router();

const {
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
  getDepositInfo,
  createDepositRequest,
  listPendingDeposits,
  approveDeposit,
  rejectDeposit,
  proxyAvatar,
} = require('../controllers/userController');

const {
  listTasks,
  pinTask,
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
} = require('../controllers/taskController');

const { MONETAG_ZONE_ID } = require('../config');

router.use(requireTelegramAuth);

// user
router.get('/me', getMe);
router.get('/balance', getBalance); // lightweight, for live-sync polling
router.post('/language', setLanguage);
router.post('/checkin', dailyCheckIn);
router.get('/leaderboard', getLeaderboard);
router.get('/stats', getStats);
router.get('/achievements', getAchievements);
router.post('/achievements/claim', claimAchievement);
router.post('/ads/watch', watchAd);
router.get('/ads/history', getAdHistory);
router.get('/ads/reward', getAdRewardSetting);
router.post('/ads/reward', updateAdRewardSetting); // admin only
router.get('/config', (req, res) => res.json({ monetagZoneId: MONETAG_ZONE_ID }));

// events
router.get('/events', listEvents);
router.post('/events', createEvent); // admin only
router.delete('/events/:id', deleteEvent); // admin only

// withdraw
router.get('/withdraw/info', getWithdrawInfo);
router.post('/withdraw', createWithdrawRequest);
router.get('/withdraw/history', listMyWithdrawals);

// tasks
router.get('/tasks', listTasks);
router.post('/tasks', createTask); // admin only
router.delete('/tasks/:id', deleteTask); // admin only
router.post('/tasks/go', startTask);
router.post('/tasks/check', checkTask);       // verify -> status becomes "claimable"
router.post('/tasks/claim', claimTask);       // claim -> credits the reward
router.post('/tasks/verify', submitVerification);

// admin: verification review queue
router.post('/tasks/:id/pin', requireTelegramAuth, pinTask);
router.get('/tasks/verifications', listPendingVerifications);
router.post('/tasks/verifications/:id/approve', approveVerification); // -> "claimable"
router.post('/tasks/verifications/:id/reject', rejectVerification);

// paid task requests (regular users pay a fixed amount, admin manually adds the task)
router.get('/tasks/payment-info', getTaskPaymentInfo);
router.post('/tasks/requests', submitTaskRequest);
router.get('/tasks/requests/pending', listPendingTaskRequests); // admin only
router.post('/tasks/requests/:id/handle', handleTaskRequest); // admin only
router.post('/tasks/requests/:id/reject', rejectTaskRequest); // admin only

// Deposit
router.get('/deposit/info', requireTelegramAuth, getDepositInfo);
router.post('/deposit', requireTelegramAuth, createDepositRequest);
router.get('/deposit/pending', requireTelegramAuth, listPendingDeposits);
router.post('/deposit/:id/approve', requireTelegramAuth, approveDeposit);
router.post('/deposit/:id/reject', requireTelegramAuth, rejectDeposit);

// Avatar proxy (no auth — used by <img> tags in ranking)
router.get('/avatar/:telegramId', proxyAvatar);

module.exports = router;

