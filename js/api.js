/**
 * מודול לניהול קריאות API – גרסה נקייה מ‑CORS
 * -------------------------------------------------
 * • כל POST נשלח כ‑text/plain → בקשה “פשוטה” (אין OPTIONS).
 * • fetch מוגדר עם ‎redirect:'follow'‎ כדי לעבור את ה‑302 של Apps Script.
 * • אם תרצה נתוני דמה בסביבת localhost, כבה את ‎FORCE_API_IN_DEV‎.
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzuKSbq_0_OAJpaaVWEVyyrlU-lmbEERMKRLYaH8e8cg2PjugCZkwRExxB2-tf4ymVH/exec';

const CACHE_DURATION = 60_000;          // 1 דקה
const FORCE_API_IN_DEV = true;          // אל תשתמש בדמה גם ב‑localhost

let prizesCache = { data: null, timestamp: 0 };

/* ---------- עזר ---------- */
function shouldUseMockData() {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalhost && !FORCE_API_IN_DEV;
}

function getMockPrizes() {
  return [
    { id: 1, name: 'ייעוץ משפטי אישי', probability: 5 },
    { id: 2, name: 'חבילת ספרי חקיקה', probability: 15 },
    { id: 3, name: 'מנוי שנתי לאתר אסקי', probability: 10 },
    { id: 4, name: 'קורס AI וחדשנות משפטית', probability: 15 },
    { id: 5, name: 'יום עיון מקצועי', probability: 10 },
    { id: 6, name: 'מינוי חצי‑שנתי לפודקאסט', probability: 15 },
    { id: 7, name: 'הספר "מהפכת הבוררות"', probability: 15 },
    { id: 8, name: 'סט עטי יוקרה', probability: 15 }
  ];
}

/* ---------- GET / getPrizes ---------- */
export async function getPrizes() {
  const now = Date.now();
  if (prizesCache.data && now - prizesCache.timestamp < CACHE_DURATION) {
    return prizesCache.data;            // מטמון
  }

  if (shouldUseMockData()) return getMockPrizes();

  const res = await fetch(`${APPS_SCRIPT_URL}?action=getPrizes`, {
    method: 'GET',
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  prizesCache = { data, timestamp: now };
  return data;
}

/* ---------- POST / saveWin ---------- */
export async function saveWinningRecord(winRecord) {
  if (shouldUseMockData()) {
    return { success: true, id: `mock-${Date.now()}` };
  }

  const payload = JSON.stringify({ action: 'saveWin', payload: winRecord });

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // פותר CORS
    body: payload
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

/* ---------- GET / getSettings ---------- */
export async function getSettings() {
  if (shouldUseMockData()) {
    return { idleVideoUrl: 'https://www.example.com/video.mp4' };
  }

  const res = await fetch(`${APPS_SCRIPT_URL}?action=getSettings`, {
    method: 'GET',
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

/* ---------- Utility: בחירת פרס אקראי ---------- */
export function getRandomPrize() {
  if (!prizesCache.data?.length) {
    throw new Error('אין פרסים זמינים');
  }

  const total = prizesCache.data.reduce((s, p) => s + (p.probability || 1), 0);
  let rnd = Math.random() * total;

  for (const prize of prizesCache.data) {
    rnd -= (prize.probability || 1);
    if (rnd <= 0) return prize;
  }
  return prizesCache.data.at(-1);
}
