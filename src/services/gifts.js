const GIFTS = [
  { id: "rose", nameEn: "Rose", nameBn: "গোলাপ", cost: 10, emoji: "🌹" },
  { id: "kiss", nameEn: "Kiss", nameBn: "চুমু", cost: 20, emoji: "💋" },
  { id: "heart", nameEn: "Heart", nameBn: "হার্ট", cost: 50, emoji: "💖" },
  { id: "teddy", nameEn: "Teddy", nameBn: "টেডি", cost: 80, emoji: "🧸" },
  { id: "crown", nameEn: "Crown", nameBn: "ক্রাউন", cost: 120, emoji: "👑" },
  { id: "ring", nameEn: "Ring", nameBn: "রিং", cost: 200, emoji: "💍" },
  { id: "car", nameEn: "Sports Car", nameBn: "গাড়ি", cost: 400, emoji: "🏎️" },
  { id: "castle", nameEn: "Castle", nameBn: "প্রাসাদ", cost: 800, emoji: "🏰" },
];

function giftById(id) {
  return GIFTS.find((g) => g.id === id) || null;
}

module.exports = { GIFTS, giftById };
