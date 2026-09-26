/* ============================================================
   6-Month Comeback Tracker — shared config + helpers
   ------------------------------------------------------------
   Paste your Firebase config below (see README.md for how to
   get one — it's free). Both tracker.html and history.html
   load this one file, so you only ever edit it here.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCvr2Z4Wznh2qjYk3aPMg47ZuRXpUO3TUo",
  authDomain: "mytracker-1c9a7.firebaseapp.com",
  projectId: "mytracker-1c9a7",
  storageBucket: "mytracker-1c9a7.firebasestorage.app",
  messagingSenderId: "256411811656",
  appId: "1:256411811656:web:5613a46134db0417567d7d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const TOTAL_DAYS = 180;
const MOOD = { great: "Great", normal: "Normal", low: "Low", worst: "Worst" };
const TIER = { full: "Full", partial: "Partial", min: "Min", failed: "Failed" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayNumberOf(dateStr, startDateStr) {
  const a = new Date(startDateStr + "T00:00:00");
  const b = new Date(dateStr + "T00:00:00");
  return Math.round((b - a) / 86400000) + 1;
}

function dateOfDayNumber(n, startDateStr) {
  return addDays(startDateStr, n - 1);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function weekOf(dayNumber) { return Math.ceil(dayNumber / 7); }
function monthOf(dayNumber) { return Math.ceil(dayNumber / 30); }

function hasContent(entry) {
  return !!(entry && (entry.mood || entry.tier || (entry.journal && entry.journal.trim())));
}

// Makes sure a user doc with a startDate exists, returns that startDate.
async function ensureUserDoc(uid) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists || !snap.data().startDate) {
    const sd = todayStr();
    await ref.set({ startDate: sd }, { merge: true });
    return sd;
  }
  return snap.data().startDate;
}

function entriesCollection(uid) {
  return db.collection("users").doc(uid).collection("entries");
}

function formatEntryBlock(dayNumber, entry) {
  return [
    `Day ${dayNumber} — ${formatDate(entry.date)}`,
    `Mood: ${entry.mood ? MOOD[entry.mood] : "—"}`,
    `Effort: ${entry.tier ? TIER[entry.tier] : "—"}`,
    `Journal: ${entry.journal && entry.journal.trim() ? entry.journal.trim() : "—"}`
  ].join("\n");
}

// Turns a chronological list of {dayNumber, date, mood, tier, journal}
// into text, inserting Month/Week headers only when they change.
function formatSelection(entries) {
  const out = [];
  let lastMonth = null, lastWeek = null;
  for (const e of entries) {
    const m = monthOf(e.dayNumber), w = weekOf(e.dayNumber);
    if (m !== lastMonth) { out.push(`\n===== Month ${m} =====`); lastWeek = null; }
    if (w !== lastWeek) { out.push(`-- Week ${w} --`); }
    out.push(formatEntryBlock(e.dayNumber, e));
    out.push("");
    lastMonth = m; lastWeek = w;
  }
  return out.join("\n").trim();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e2) {}
    document.body.removeChild(ta);
    return ok;
  }
}