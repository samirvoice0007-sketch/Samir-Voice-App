require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');
const Gift = require('../src/models/Gift');
const User = require('../src/models/User');

const GIFTS = [
  { giftId: 'kiss', name: 'Kiss', icon: '💋', price: 10, sort: 1 },
  { giftId: 'rose', name: 'Rose', icon: '🌹', price: 50, sort: 2 },
  { giftId: 'heart', name: 'Heart', icon: '❤️', price: 100, sort: 3 },
  { giftId: 'cake', name: 'Cake', icon: '🎂', price: 500, sort: 4 },
  { giftId: 'car', name: 'Car', icon: '🚗', price: 2000, sort: 5 },
  { giftId: 'rocket', name: 'Rocket', icon: '🚀', price: 5000, sort: 6 },
  { giftId: 'castle', name: 'Castle', icon: '🏰', price: 10000, sort: 7 },
  { giftId: 'lion', name: 'Lion', icon: '🦁', price: 20000, sort: 8 },
  { giftId: 'helicopter', name: 'Helicopter', icon: '🚁', price: 50000, sort: 9 },
  { giftId: 'yacht', name: 'Yacht', icon: '🛥️', price: 100000, sort: 10 }
];

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('connected');
  await Gift.deleteMany({});
  await Gift.insertMany(GIFTS);
  console.log('gifts seeded');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
