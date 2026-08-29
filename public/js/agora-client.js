window.AgoraVoice = (() => {
  let client = null;
  let localAudio = null;
  let joined = false;

  async function join(agora) {
    await leave();
    if (!agora || !agora.appId || typeof AgoraRTC === "undefined") {
      console.warn("[agora] demo mode or SDK missing");
      return { demo: true };
    }
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });
    client.on("user-unpublished", (user) => {
      if (user.audioTrack) user.audioTrack.stop();
    });
    const uid = agora.uid || null;
    await client.join(agora.appId, agora.channel, agora.token || null, uid);
    localAudio = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([localAudio]);
    joined = true;
    return { demo: false };
  }

  async function setMuted(muted) {
    if (localAudio) await localAudio.setEnabled(!muted);
  }

  async function leave() {
    try {
      if (localAudio) {
        localAudio.stop();
        localAudio.close();
        localAudio = null;
      }
      if (client && joined) await client.leave();
    } catch (_) {}
    client = null;
    joined = false;
  }

  return { join, setMuted, leave };
})();
