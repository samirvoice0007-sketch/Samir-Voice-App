const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const config = require("../config");

function buildRtcToken(channelName, uid = 0, role = "publisher") {
  if (!config.agoraAppId) {
    return { appId: "", token: null, channel: channelName, uid, demo: true };
  }
  if (!config.agoraCertificate) {
    return { appId: config.agoraAppId, token: null, channel: channelName, uid, demo: true };
  }
  const expire = Math.floor(Date.now() / 1000) + 3600;
  const rtcRole = role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const token = RtcTokenBuilder.buildTokenWithUid(
    config.agoraAppId,
    config.agoraCertificate,
    channelName,
    Number(uid) || 0,
    rtcRole,
    expire
  );
  return { appId: config.agoraAppId, token, channel: channelName, uid, demo: false };
}

module.exports = { buildRtcToken };
