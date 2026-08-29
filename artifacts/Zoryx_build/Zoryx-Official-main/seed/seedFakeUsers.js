// Run with: npm run seed:fake
// Populates the leaderboard (Tasks / Invites / Weekly tabs) with realistic
// looking fake accounts so the Rank page never looks empty for a new bot.
require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const User = require('../src/models/User');
const { MONGODB_URI } = require('../src/config');
const { getWeekKey } = require('../src/utils/economy');

// Diverse full names from many different countries — mixed scripts/languages for a global look
const FAKE_NAMES_POOL = [
  // South Asian
  'Arif Hasan', 'Nusrat Jahan', 'Rakibul Islam', 'Sadia Afrin', 'Tanvir Ahmed',
  'Farhana Akter', 'Mahmudul Hasan', 'Sumaiya Islam', 'Rafiul Karim', 'Jannatul Ferdous',
  'Aditya Sharma', 'Priya Verma', 'Rahul Khan', 'Ayesha Siddiqui', 'Rohan Mehta',
  'Kavya Reddy', 'Vikram Singh', 'Ananya Iyer', 'Aarav Patel', 'Zoya Malik',
  // Middle East / Arabic
  'Omar Farouk', 'Fatima Zahra', 'Yusuf Al-Amin', 'Layla Hassan', 'Khalid Rahman',
  'Amina Youssef', 'Tariq Aziz', 'Nadia Karam', 'Hassan Ali', 'Mariam Saleh',
  // East Asian
  '王伟', '李娜', '张敏', '陈杰', '刘洋',
  '田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲',
  '김민준', '이서연', '박지훈', '최유나',
  // Russian / Eastern Europe
  'Иван Петров', 'Мария Смирнова', 'Дмитрий Волков', 'Анна Кузнецова', 'Сергей Иванов',
  'Ольга Соколова', 'Алексей Морозов',
  // Western Europe
  'John Smith', 'Emily Clark', 'David Lee', 'Sophia Turner', 'James Wilson',
  'Marie Dubois', 'Pierre Lefèvre', 'Claire Moreau', 'Hans Müller', 'Anna Schmidt',
  'Giulia Rossi', 'Marco Bianchi',
  // Latin America / Spanish / Portuguese
  'Carlos Fernández', 'Sofía García', 'Diego Martínez', 'Valentina López',
  'Lucas Silva', 'Beatriz Souza', 'Rafael Costa', 'Camila Oliveira',
  // Southeast Asia
  'Nguyễn Văn An', 'Trần Thị Hương', 'Lê Minh Đức',
  'Siti Nurhaliza', 'Budi Santoso', 'Ahmad Fauzi',
  'Juan Dela Cruz', 'Maria Santos',
  // Africa
  'Chidi Okafor', 'Amara Nwosu', 'Kwame Mensah', 'Zanele Dlamini', 'Tendai Moyo',
  // Turkey / Central Asia
  'Mehmet Yılmaz', 'Elif Kaya', 'Ahmet Demir',
];

function randomFloat(min, max, decimals = 2) {
  const val = Math.random() * (max - min) + min;
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick `count` unique random names from the pool (falls back to numbered
// duplicates only if the pool is smaller than requested — shouldn't happen here)
function pickRandomNames(count) {
  const pool = [...FAKE_NAMES_POOL];
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = randomInt(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// Fetch real human face photos from randomuser.me
function fetchRandomUsers(count) {
  return new Promise((resolve, reject) => {
    https.get(
      `https://randomuser.me/api/?results=${count}&inc=picture&noinfo`,
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.results);
          } catch (err) {
            reject(err);
          }
        });
      }
    ).on('error', reject);
  });
}

const FAKE_NAMES = pickRandomNames(100);

async function run() {
  // If this script is required from inside the already-running app (e.g. via a temp
  // admin route), mongoose is already connected — reuse that connection and don't
  // disconnect it afterwards, or we'd kill the live app's database connection.
  const alreadyConnected = mongoose.connection.readyState === 1;
  if (!alreadyConnected) {
    await mongoose.connect(MONGODB_URI);
  }
  console.log('Connected to MongoDB, fetching real profile photos...');

  // Fetch one unique real photo per user — no cartoons/illustrated avatars
  const realFacePool = await fetchRandomUsers(FAKE_NAMES.length);
  console.log(`Fetched ${realFacePool.length} real photos, seeding fake leaderboard users...`);

  const currentWeekKey = getWeekKey();

  for (let i = 0; i < FAKE_NAMES.length; i++) {
    const name = FAKE_NAMES[i];
    const telegramId = `fake_${1000 + i}`;
    const balanceUSDT = randomFloat(107, 8064.56, 2);     // Tasks tab
    const referralCount = randomInt(97, 21864);            // Invites tab — whole numbers only
    const weeklyUSDT = randomFloat(156.12, 7493.64, 2);    // Weekly tab (resets every Monday)
    const photoUrl = realFacePool[i] ? realFacePool[i].picture.large : '';

    await User.findOneAndUpdate(
      { telegramId },
      {
        telegramId,
        firstName: name,
        username: name.toLowerCase().replace(/\s+/g, '_'),
        balanceUSDT,
        referralCount,
        weeklyUSDT,
        weeklyWeekKey: currentWeekKey,
        isFake: true,
        language: 'en',
        photoUrl,
      },
      { upsert: true }
    );
  }

  console.log(`✅ Seeded ${FAKE_NAMES.length} fake leaderboard users with unique real photos (Tasks / Invites / Weekly).`);

  // Only disconnect if we opened the connection ourselves (i.e. running standalone via `npm run seed:fake`)
  if (!alreadyConnected) {
    await mongoose.disconnect();
  }
}

async function runSeed() {
  return run();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = { runSeed, run };
