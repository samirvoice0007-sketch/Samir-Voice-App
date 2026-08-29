require('dotenv').config();

module.exports = {
  port: process.env.PORT || 10000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gfbf',
  jwtSecret: process.env.JWT_SECRET || 'gfbf_dev_secret_change_me',
  jwtExpires: process.env.JWT_EXPIRES_IN || '30d',
  agoraAppId: process.env.AGORA_APP_ID || '',
  agoraCert: process.env.AGORA_APP_CERTIFICATE || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@gbfb.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  nodeEnv: process.env.NODE_ENV || 'development'
};
