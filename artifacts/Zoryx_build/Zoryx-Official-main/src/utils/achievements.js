// Static achievement definitions (USDT-only). Progress is computed live from
// the user's stored counters (referralCount / completedTasksCount).

const ACHIEVEMENTS = [
  {
    id: 'first_invitation',
    category: 'invite',
    icon: '👋',
    titleKey: 'ach_first_invitation_title',
    descKey: 'ach_first_invitation_desc',
    target: 3,
    metric: 'referralCount',
    rewardUSDT: 1.5,
  },
  {
    id: 'social_butterfly',
    category: 'invite',
    icon: '🦋',
    titleKey: 'ach_social_butterfly_title',
    descKey: 'ach_social_butterfly_desc',
    target: 50,
    metric: 'referralCount',
    rewardUSDT: 25,
  },
  {
    id: 'invite_master',
    category: 'invite',
    icon: '⭐',
    titleKey: 'ach_invite_master_title',
    descKey: 'ach_invite_master_desc',
    target: 200,
    metric: 'referralCount',
    rewardUSDT: 100,
  },
  {
    id: 'invite_the_master',
    category: 'invite',
    icon: '🏆',
    titleKey: 'ach_invite_the_master_title',
    descKey: 'ach_invite_the_master_desc',
    target: 1000,
    metric: 'referralCount',
    rewardUSDT: 500,
  },
  {
    id: 'invite_the_king',
    category: 'invite',
    icon: '👑',
    titleKey: 'ach_invite_the_king_title',
    descKey: 'ach_invite_the_king_desc',
    target: 5000,
    metric: 'referralCount',
    rewardUSDT: 2500,
  },
  {
    id: 'invite_the_vip',
    category: 'invite',
    icon: '🎖️',
    titleKey: 'ach_invite_the_vip_title',
    descKey: 'ach_invite_the_vip_desc',
    target: 20000,
    metric: 'referralCount',
    rewardUSDT: 10000,
  },
  {
    id: 'first_task',
    category: 'earning',
    icon: '✅',
    titleKey: 'ach_first_task_title',
    descKey: 'ach_first_task_desc',
    target: 1,
    metric: 'completedTasksCount',
    rewardUSDT: 0.05,
  },
  {
    id: 'task_grinder',
    category: 'earning',
    icon: '💪',
    titleKey: 'ach_task_grinder_title',
    descKey: 'ach_task_grinder_desc',
    target: 25,
    metric: 'completedTasksCount',
    rewardUSDT: 0.5,
  },
  {
    id: 'task_legend',
    category: 'earning',
    icon: '🏆',
    titleKey: 'ach_task_legend_title',
    descKey: 'ach_task_legend_desc',
    target: 100,
    metric: 'completedTasksCount',
    rewardUSDT: 2,
  },
];

function getProgress(user, achievement) {
  return user[achievement.metric] || 0;
}

module.exports = { ACHIEVEMENTS, getProgress };
