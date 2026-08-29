const admin = require("firebase-admin");
const config = require("../config");

let initialized = false;

function isConfigured() {
  return Boolean(config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey);
}

function getAdmin() {
  if (initialized) return admin;
  if (!isConfigured()) return null;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      privateKey: config.firebasePrivateKey,
    }),
  });
  initialized = true;
  return admin;
}

async function verifyIdToken(idToken) {
  const sdk = getAdmin();
  if (!sdk) {
    const err = new Error("Phone login is not configured");
    err.status = 503;
    throw err;
  }
  if (!idToken || typeof idToken !== "string") {
    const err = new Error("Firebase ID token required");
    err.status = 400;
    throw err;
  }
  try {
    return await sdk.auth().verifyIdToken(idToken);
  } catch (e) {
    const err = new Error("Invalid or expired Firebase token");
    err.status = 401;
    throw err;
  }
}

module.exports = { isConfigured, getAdmin, verifyIdToken };
