const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    const userId = payload.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresIn,
  });
}

module.exports = { authRequired, adminRequired, signToken };
