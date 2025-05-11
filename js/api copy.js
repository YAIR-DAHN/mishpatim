/**
 * מודול לניהול קריאות API – גרסה נקייה מ‑CORS
 * -------------------------------------------------
 * • כל POST נשלח כ‑text/plain → בקשה "פשוטה" (אין OPTIONS).
 * • fetch מוגדר עם ‎redirect:'follow'‎ כדי לעבור את ה‑302 של Apps Script.
 * • אם תרצה נתוני דמה בסביבת localhost, כבה את ‎FORCE_API_IN_DEV‎.
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwh0D-4MlxqEuJOwBw9ChWggvrf49A2ivxZD7-3ZuG-h3Us-mYzuu7jTyNBDBKAqO9e/exec';

const CACHE_DURATION = 10_000;          // 10 שניות
const FORCE_API_IN_DEV = true;          // אל תשתמש בדמה גם ב‑localhost

let prizesCache = { data: null, timestamp: 0 };

/* ---------- עזר ---------- */
function shouldUseMockData() {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalhost && !FORCE_API_IN_DEV;
}

function getMockPrizes() {
  return [
    { id: 1, name: 'ספר משפטי', probability: 5, stock: 7, distributed: 6 },
    { id: 2, name: 'קורס', probability: 0, stock: 2, distributed: 3 },
    { id: 3, name: 'מנוי שנתי לאתר אסקי', probability: 10 },
    { id: 4, name: 'קורס AI וחדשנות משפטית', probability: 15 },
    { id: 5, name: 'יום עיון מקצועי', probability: 10 },
    { id: 6, name: 'מינוי חצי‑שנתי לפודקאסט', probability: 15 },
    { id: 7, name: 'הספר "מהפכת הבוררות"', probability: 15 },
    { id: 8, name: 'סט עטי יוקרה', probability: 15 }
  ];
}

/* ---------- ניהול מטמון ---------- */
function invalidateCache() {
  prizesCache = { data: null, timestamp: 0 };
}

/* ---------- GET / getPrizes ---------- */
export async function getPrizes() {
  const now = Date.now();
  if (prizesCache.data && now - prizesCache.timestamp < CACHE_DURATION) {
    return prizesCache.data;
  }

  if (shouldUseMockData()) return getMockPrizes();

  const res = await fetch(`${APPS_SCRIPT_URL}?action=getPrizes`, {
    method: 'GET',
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  prizesCache = { data, timestamp: now };
  return data;
}

/* ---------- POST / saveWin ---------- */
export async function saveWinningRecord(winRecord) {
  if (shouldUseMockData()) {
    return { success: true, id: `mock-${Date.now()}` };
  }

  const payload = JSON.stringify({ 
    action: 'saveWin', 
    payload: {
      userName: winRecord.userName,
      userEmail: winRecord.userEmail,
      userPhone: winRecord.userPhone,
      prizeId: winRecord.prizeId,
      prizeName: winRecord.prizeName
    } 
  });

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload
    });
    
    if (!res.ok) {
      console.error('שגיאת רשת (fetch):', res.status, res.statusText);
      throw new Error(`HTTP ${res.status}`);
    }
    
    // איפוס המטמון אחרי זכייה כדי לקבל נתונים מעודכנים
    invalidateCache();
    
    const data = await res.json();
    if (data.success) {
      console.log('השרת החזיר הצלחה:', data);
    } else {
      console.error('השרת החזיר שגיאה:', data);
    }
    if (!data.success) {
      throw new Error(data.error || 'שגיאה בשמירת הזכייה');
    }
    
    return data;
  } catch (error) {
    console.error('שגיאה בשמירת הזכייה (client):', error);
    throw error;
  }
}

/* ---------- GET / getSettings ---------- */
export async function getSettings() {
  if (shouldUseMockData()) {
    return { idleVideoUrl: 'https://www.example.com/video.mp4' };
  }

  const res = await fetch(`${APPS_SCRIPT_URL}?action=getSettings`, {
    method: 'GET',
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

/* ---------- Utility: בחירת פרס אקראי ---------- */
export function getRandomPrize() {
  if (!prizesCache.data || !prizesCache.data.length) {
    console.error('אין פרסים זמינים');
    return null;
  }

  // סינון רק פרסים זמינים (יש מלאי ויש הסתברות חיובית)
  const availablePrizes = prizesCache.data.filter(prize => 
    (prize.stock || 0) > (prize.distributed || 0) && 
    (prize.probability || 0) > 0
  );

  if (!availablePrizes.length) {
    console.error('אין פרסים זמינים להגרלה');
    return null;
  }

  // חישוב סך כל ההסתברויות
  const totalProbability = availablePrizes.reduce((sum, prize) => 
    sum + (prize.probability || 0), 0
  );

  // בחירת מספר אקראי בין 0 לסך ההסתברויות
  let random = Math.random() * totalProbability;

  // בחירת הפרס לפי ההסתברות
  for (const prize of availablePrizes) {
    random -= (prize.probability || 0);
    if (random <= 0) {
      return prize;
    }
  }

  // במקרה קצה, נחזיר את הפרס האחרון
  return availablePrizes[availablePrizes.length - 1];
}

/* ---------- Utility: בדיקה האם פרס זמין ---------- */
export function isPrizeAvailable(prize) {
  return (prize.stock || 0) > (prize.distributed || 0) && prize.probability > 0;
}
