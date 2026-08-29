const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const config = require('../config');

function buildToken(channelName, uid = 0, role = 'publisher', expireSeconds = 3600) {
  if (!config.agoraAppId || !config.agoraCert) {
    return { token: null, appId: config.agoraAppId || '', note: 'Agora not configured' };
  }
  const roleVal = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expire = Math.floor(Date.now() / 1000) + expireSeconds;
  const token = RtcTokenBuilder.buildTokenWithUid(
    config.agoraAppId,
    config.agoraCert,
    channelName,
    Number(uid) || 0,
    roleVal,
    expire
  );
  return { token, appId: config.agoraAppId, expire };
}

module.exports = { buildToken };
