/**
 * מודול לניהול קריאות API
 */

// ניתן להגדיר URL בסיסי לכל קריאות ה-API
const API_BASE_URL = '/api';

// זמן קש לקריאות (במילישניות)
const CACHE_DURATION = 60 * 1000; // דקה אחת

// כתובת ה-Apps Script (להחליף ב-URL בפועל לאחר פריסה)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXFUxw22hkHVsC9V89zKcAfV0G4WSQ2CwTDl38NIQCmU00-S2cbjs9SlVDKYtGh0DF/exec';

// האם לכפות שימוש ב-API גם בסביבת פיתוח
const FORCE_API_IN_DEV = true;

/**
 * מטמון פרסים - שימוש למניעת קריאות עודפות
 */
let prizesCache = {
    data: null,
    timestamp: 0
};

/**
 * פונקציה להתמודדות עם שגיאות ברשת
 * @param {Response} response - תשובת HTTP
 * @returns {Promise} - התשובה או שגיאה
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`שגיאת API: ${response.status} - ${errorText}`);
    }
    return response.json();
}

/**
 * פונקציה לשליפת רשימת הפרסים מהשרת
 * @returns {Promise<Array>} - מערך הפרסים
 */
export async function getPrizes() {
    // בדיקה אם המטמון תקף
    const now = Date.now();
    if (prizesCache.data && (now - prizesCache.timestamp < CACHE_DURATION)) {
        console.log('מחזיר פרסים ממטמון');
        return prizesCache.data;
    }

    try {
        // בדיקה האם להשתמש בנתוני דמה
        if (shouldUseMockData()) {
            console.log('סביבת פיתוח: משתמש בנתוני דמה');
            return getMockPrizes();
        }

        console.log('מתחבר ל-Google Sheets דרך Apps Script:', APPS_SCRIPT_URL);
        
        // קריאה ל-Apps Script לקבלת פרסים
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getPrizes`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await handleResponse(response);

        console.log('התקבלו פרסים מהשרת:', data);

        // שמירה במטמון
        prizesCache.data = data;
        prizesCache.timestamp = now;

        return data;
    } catch (error) {
        console.error('שגיאה בשליפת פרסים:', error);
        console.warn('משתמש בנתוני דמה עקב שגיאת התחברות לשרת');
        return getMockPrizes();
    }
}

/**
 * פונקציה לשמירת רשומת זכייה בשרת
 * @param {Object} winRecord - אובייקט המכיל את פרטי הזכייה
 * @returns {Promise<Object>} - תשובת השרת
 */
export async function saveWinningRecord(winRecord) {
    try {
        // בדיקה האם להשתמש בנתוני דמה
        if (shouldUseMockData()) {
            console.log('סביבת פיתוח: סימולציה של שמירת זכייה', winRecord);
            return { success: true, id: `mock-${Date.now()}` };
        }

        console.log('שולח נתוני זכייה ל-Google Sheets:', winRecord);

        // שליחת הנתונים ל-Apps Script
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'saveWin', payload: winRecord })
        });

        const result = await handleResponse(response);
        console.log('תוצאת שמירת זכייה:', result);
        return result;
    } catch (error) {
        console.error('שגיאה בשמירת זכייה:', error);
        console.warn('משתמש בסימולציה של שמירת זכייה עקב שגיאת התחברות');
        return { success: true, id: `mock-${Date.now()}` };
    }
}

/**
 * פונקציה המחזירה נתוני דמה לפרסים (לשימוש בסביבת פיתוח)
 * @returns {Array} - מערך פרסים לדוגמה
 */
function getMockPrizes() {
    return [
        { id: 1, name: "ייעוץ משפטי אישי", probability: 5 },
        { id: 2, name: "חבילת ספרי חקיקה", probability: 15 },
        { id: 3, name: "מנוי שנתי לאתר אסקי", probability: 10 },
        { id: 4, name: "קורס מקוון בנושא AI וחדשנות משפטית", probability: 15 },
        { id: 5, name: "השתתפות ביום עיון מקצועי", probability: 10 },
        { id: 6, name: "מינוי חצי שנתי לפודקאסט המשפטי", probability: 15 },
        { id: 7, name: "ספר \"מהפכת הבוררות\"", probability: 15 },
        { id: 8, name: "סט עטי יוקרה של הלשכה", probability: 15 }
    ];
}

/**
 * פונקציה לדגימת דמה של פרס אקראי (בהתבסס על הסתברויות)
 * @returns {Object} - פרס אקראי
 */
export function getRandomPrize() {
    // ודא שיש פרסים במטמון
    if (!prizesCache.data || !prizesCache.data.length) {
        throw new Error('אין פרסים זמינים');
    }

    const prizes = prizesCache.data;
    
    // חישוב סכום ההסתברויות
    const totalProbability = prizes.reduce((sum, prize) => sum + (prize.probability || 1), 0);
    
    // בחירת מספר אקראי בטווח סכום ההסתברויות
    let random = Math.random() * totalProbability;
    
    // מציאת הפרס המתאים
    for (const prize of prizes) {
        random -= (prize.probability || 1);
        if (random <= 0) {
            return prize;
        }
    }
    
    // במקרה קצה, החזר את הפרס האחרון
    return prizes[prizes.length - 1];
}

/**
 * שליפת הגדרות (לדוגמה: קישור סרטון)
 * @returns {Promise<Object>} - אובייקט הגדרות
 */
export async function getSettings() {
    try {
        // בדיקה האם להשתמש בנתוני דמה
        if (shouldUseMockData()) {
            console.log('סביבת פיתוח: משתמש בהגדרות דמה');
            return { idleVideoUrl: 'https://www.example.com/video.mp4' };
        }

        console.log('מושך הגדרות מ-Google Sheets');
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getSettings`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await handleResponse(response);
        console.log('התקבלו הגדרות מהשרת:', data);
        return data;
    } catch (error) {
        console.error('שגיאה בשליפת הגדרות:', error);
        return { idleVideoUrl: '' };
    }
}

/**
 * בדיקה האם אנחנו בסביבת פיתוח והאם צריך להשתמש בנתוני דמה
 * @returns {boolean} האם להשתמש בנתוני דמה
 */
function shouldUseMockData() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocalhost && !FORCE_API_IN_DEV;
} 