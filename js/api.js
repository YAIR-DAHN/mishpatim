/**
 * מודול לניהול קריאות API
 */

// ניתן להגדיר URL בסיסי לכל קריאות ה-API
const API_BASE_URL = '/api';

// זמן קש לקריאות (במילישניות)
const CACHE_DURATION = 60 * 1000; // דקה אחת

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
        // בסביבת פיתוח: החזרת נתוני דמה כדי להימנע מקריאות API
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('סביבת פיתוח: משתמש בנתוני דמה');
            return getMockPrizes();
        }

        // בסביבת ייצור: קריאה אמיתית לשרת
        const response = await fetch(`${API_BASE_URL}/prizes`);
        const data = await handleResponse(response);

        // שמירה במטמון
        prizesCache.data = data;
        prizesCache.timestamp = now;

        return data;
    } catch (error) {
        console.error('שגיאה בשליפת פרסים:', error);
        
        // במקרה של שגיאה, החזר נתוני דמה
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
        // בסביבת פיתוח: סימולציה של בקשת POST מוצלחת
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('סביבת פיתוח: סימולציה של שמירת זכייה', winRecord);
            return { success: true, id: `mock-${Date.now()}` };
        }

        // בסביבת ייצור: שליחת הנתונים לשרת
        const response = await fetch(`${API_BASE_URL}/wins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(winRecord)
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('שגיאה בשמירת זכייה:', error);
        throw error;
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