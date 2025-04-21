/**
 * מודול נתונים 
 * קובץ זה מכיל את הלוגיקה לניהול הנתונים, כולל אינטגרציה עם Google Sheets
 */

const AppData = (function() {
    // משתנים פרטיים
    let prizes = [
        { id: 1, name: "ייעוץ משפטי חינם", probability: 10, availableQuantity: 5 },
        { id: 2, name: "ספר חוקים", probability: 20, availableQuantity: 15 },
        { id: 3, name: "הנחה של 15% לשירותים משפטיים", probability: 30, availableQuantity: 30 },
        { id: 4, name: "סדנת זכויות אונליין", probability: 15, availableQuantity: 10 },
        { id: 5, name: "פגישת ייעוץ וירטואלית", probability: 15, availableQuantity: 8 },
        { id: 6, name: "עט יוקרתי", probability: 10, availableQuantity: 25 }
    ];
    
    let selectedPrize = null;
    let userData = null;
    
    // פונקציות פרטיות
    
    // בחירת פרס אקראי בהתאם למשקלים ולזמינות
    const selectRandomPrize = () => {
        // סינון פרסים שיש להם כמות זמינה
        const availablePrizes = prizes.filter(prize => prize.availableQuantity > 0);
        
        if (availablePrizes.length === 0) {
            console.error("אין פרסים זמינים!");
            return null;
        }
        
        // חישוב סך המשקלים של הפרסים הזמינים
        const totalWeight = availablePrizes.reduce((sum, prize) => sum + prize.probability, 0);
        
        // בחירה אקראית בהתבסס על משקל
        let random = Math.random() * totalWeight;
        let currentWeight = 0;
        
        for (const prize of availablePrizes) {
            currentWeight += prize.probability;
            if (random <= currentWeight) {
                return prize;
            }
        }
        
        // במקרה שמשהו השתבש, להחזיר את הפרס הראשון הזמין
        return availablePrizes[0];
    };
    
    // עדכון כמות זמינה של פרס
    const decrementPrizeQuantity = (prizeId) => {
        const prizeIndex = prizes.findIndex(p => p.id === prizeId);
        if (prizeIndex !== -1 && prizes[prizeIndex].availableQuantity > 0) {
            prizes[prizeIndex].availableQuantity--;
            return true;
        }
        return false;
    };
    
    // שליחת נתונים ל-Google Sheets
    const saveToGoogleSheets = async (data) => {
        try {
            // בהמשך יהיה כאן קוד אמיתי לשליחת נתונים ל-Google Sheets
            console.log("שולח נתונים ל-Google Sheets:", data);
            
            // במקום זה, נשמור מידע לאחסון מקומי כגיבוי
            const savedLeads = JSON.parse(localStorage.getItem('leads') || '[]');
            savedLeads.push({
                ...data,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('leads', JSON.stringify(savedLeads));
            
            return true;
        } catch (error) {
            console.error("שגיאה בשמירת נתונים:", error);
            return false;
        }
    };
    
    // שליחת מייל למשתמש
    const sendEmailToUser = async (userData, prize) => {
        try {
            // בהמשך יהיה כאן קוד אמיתי לשליחת מיילים
            console.log("שולח מייל למשתמש:", userData.email, "עם פרס:", prize.name);
            return true;
        } catch (error) {
            console.error("שגיאה בשליחת מייל:", error);
            return false;
        }
    };
    
    // API ציבורי
    return {
        // אתחול המודול - טעינת נתונים מהשרת
        initialize: async function() {
            try {
                // בהמשך יהיה כאן קוד אמיתי לטעינת נתונים מ-Google Sheets
                console.log("טוען נתונים מהשרת...");
                
                // אם יש נתונים מקומיים שנשמרו ולא הועלו, ננסה להעלות אותם שוב
                const pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
                if (pendingUploads.length > 0) {
                    console.log("מנסה להעלות נתונים שלא הועלו בהצלחה:", pendingUploads.length);
                    // קוד להעלאת נתונים תקועים יבוא כאן
                }
                
                return true;
            } catch (error) {
                console.error("שגיאה באתחול נתונים:", error);
                return false;
            }
        },
        
        // קבלת רשימת הפרסים הזמינים
        getAvailablePrizes: function() {
            return prizes.filter(prize => prize.availableQuantity > 0);
        },
        
        // קבלת כל הפרסים (לצורך ניהול)
        getAllPrizes: function() {
            return [...prizes];
        },
        
        // בחירת פרס אקראי
        getRandomPrize: function() {
            selectedPrize = selectRandomPrize();
            return selectedPrize;
        },
        
        // הגדרת הפרס שנבחר
        setSelectedPrize: function(prize) {
            selectedPrize = prize;
        },
        
        // קבלת הפרס הנוכחי שנבחר
        getSelectedPrize: function() {
            return selectedPrize;
        },
        
        // שמירת נתוני משתמש
        setUserData: function(data) {
            userData = data;
            return userData;
        },
        
        // קבלת נתוני המשתמש
        getUserData: function() {
            return userData;
        },
        
        // שמירת לוג זכייה
        savePrizeWin: async function(userData, prize) {
            if (!userData || !prize) {
                console.error("נתוני משתמש או פרס חסרים!");
                return false;
            }
            
            // עדכון כמות הפרס
            decrementPrizeQuantity(prize.id);
            
            // נתונים לשמירה
            const recordData = {
                name: userData.name,
                phone: userData.phone,
                email: userData.email,
                address: userData.address,
                prizeId: prize.id,
                prizeName: prize.name,
                date: new Date().toISOString()
            };
            
            // שמירה ל-Google Sheets
            const savedToSheets = await saveToGoogleSheets(recordData);
            
            // שליחת מייל למשתמש
            const emailSent = await sendEmailToUser(userData, prize);
            
            return savedToSheets && emailSent;
        },
        
        // איפוס נתונים (למשל בסיום תהליך)
        resetSessionData: function() {
            selectedPrize = null;
            userData = null;
        }
    };
})();

// ייצוא המודול לשימוש גלובלי
window.AppData = AppData; 