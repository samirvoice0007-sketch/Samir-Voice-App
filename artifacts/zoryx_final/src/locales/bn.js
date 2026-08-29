module.exports = {
  chooseLanguage: `🌐 আপনার ভাষা বেছে নিন:`,
  languageSet: `✅ ভাষা বাংলা সেট করা হয়েছে!`,
  marketingIntro: `🚀 টাস্কের পরিমাণ ও আয় দ্রুত বাড়ছে, বট একদম স্মুথলি চলছে!\n\n💰 প্রতিদিন শত শত নতুন টাস্ক আসছে, কিছু ইউজার ইতিমধ্যে বট থেকে মাসে $100–$3000 আয় করছেন।\n\n🎉 বট ওপেন করুন এবং আজই নিজের অনলাইন ইনকাম শুরু করুন!\n\n🌐 আপনার ভাষা বেছে নিন`,
  welcome: (name) =>
    `🎉 *ZORY X BOT এ স্বাগতম!*\n\nহ্যালো, ${name}!\n\n💰 সোশ্যাল মিডিয়া টাস্ক সম্পন্ন করে USDT আয় করুন\n📅 ডেইলি চেক-ইন করে USDT পান\n👥 বন্ধু ইনভাইট করে ২০% পর্যন্ত কমিশন পান\n\n🚀 বন্ধু ইনভাইট করে মাসে $100–$3000 USDT আয় করুন\n\n👇 আয় শুরু করতে নিচে ট্যাপ করুন!`,
  welcomeLinks: (officialChannel, communityChannel) =>
    `🔔 নোটিফিকেশন ➔ ${officialChannel}\n📢 অ্যানাউন্সমেন্ট ➔ ${officialChannel}\n👥 কমিউনিটি ➔ ${communityChannel}\n\n⚡ আপডেটেড থাকুন, নতুন টাস্ক মিস করবেন না!`,
  openApp: `🚀 ZORY X BOT ওপেন করুন`,
  changeLanguage: `🌐 ভাষা পরিবর্তন`,
  ownerHelpTitle: `🛠 *ওনার কমান্ড লিস্ট — ZORY X BOT*`,
  ownerHelpBody: `/start — বট চালু ও ওয়েলকাম মেসেজ\n/help — এই কমান্ড লিস্ট\n/announcement — সকল ইউজারকে মেসেজ পাঠান\n/addadmin <telegram_id> — নতুন এডমিন যোগ করুন (শুধু ওনার)\n/removeadmin <telegram_id> — এডমিন রিমুভ করুন (শুধু ওনার)\n/stats — বট এর মোট ইউজার/এডমিন পরিসংখ্যান\n/totalusers — মোট কতজন বট স্টার্ট করেছে\n/withdrawals — পেন্ডিং উইথড্র রিকোয়েস্ট লিস্ট\n/approvewithdraw <id> — উইথড্র সম্পন্ন হিসেবে মার্ক করুন\n/rejectwithdraw <id> — উইথড্র বাতিল ও ব্যালেন্স ফেরত\n\nℹ️ টাস্ক Mini App এর *Earn* সেকশন থেকে যোগ/এডিট করা যাবে।`,
  adminHelpTitle: `🛠 *এডমিন কমান্ড লিস্ট — ZORY X BOT*`,
  adminHelpBody: `/announcement — সকল ইউজারকে মেসেজ পাঠান\n/totalusers — মোট কতজন বট স্টার্ট করেছে\n/withdrawals — পেন্ডিং উইথড্র রিকোয়েস্ট লিস্ট\n/approvewithdraw <id> — উইথড্র সম্পন্ন হিসেবে মার্ক করুন\n/rejectwithdraw <id> — উইথড্র বাতিল ও ব্যালেন্স ফেরত`,
  announcementAsk: `📢 এখন আপনার অ্যানাউন্সমেন্ট মেসেজটি পাঠান। এটি সকল ইউজারের কাছে ফরওয়ার্ড হবে।`,
  announcementSending: (count) => `⏳ ${count}...`,
  announcementDone: (sent, failed) => `✅ পাঠানো হয়েছে: ${sent} / ব্যর্থ: ${failed}`,
  notAdmin: `⛔ এই কমান্ডটি শুধু এডমিনদের জন্য।`,
  addAdminUsage: `ব্যবহার: /addadmin <telegram_id>`,
  addAdminDone: (id) => `✅ ${id}`,
  removeAdminDone: (id) => `🗑️ ${id}`,
  stats: (users, admins, tasks) => `📊 ইউজার: ${users} | এডমিন: ${admins} | টাস্ক: ${tasks}`,
  totalUsersText: (count) => `📊 মোট কতজন বট স্টার্ট করেছে: *${count}*`,
  checkinReminder: (streak, reward) =>
    `📅 *চেক-ইন রিমাইন্ডার*\n\n⏰ আপনি আজ চেক-ইন করেননি!\n🔥 বর্তমান স্ট্রিক: ${streak} দিন\n🎁 আজকের রিওয়ার্ড: ${reward} USDT\n\nপ্রতিদিন চেক-ইন করতে ভুলবেন না!`,
  checkInNowBtn: `📅 এখনই চেক ইন করুন`,
};
