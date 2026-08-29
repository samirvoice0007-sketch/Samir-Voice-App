const { OWNER_IDS } = require('../../config');
const Admin = require('../../models/Admin');

function isOwner(telegramId) {
  return OWNER_IDS.includes(String(telegramId));
}

async function isAdmin(telegramId) {
  if (isOwner(telegramId)) return true;
  const admin = await Admin.findOne({ telegramId: String(telegramId) });
  return !!admin;
}

async function getPermissions(telegramId) {
  if (isOwner(telegramId)) {
    return { canAddTask: true, canAnnounce: true, isOwner: true };
  }
  const admin = await Admin.findOne({ telegramId: String(telegramId) });
  if (!admin) return { canAddTask: false, canAnnounce: false, isOwner: false };
  return { ...admin.permissions.toObject(), isOwner: false };
}

module.exports = { isOwner, isAdmin, getPermissions };
