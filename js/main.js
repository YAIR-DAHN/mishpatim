/**
 * קובץ ראשי למערכת גלגל המזל
 * מכיל את הלוגיקה והאינטראקציות הראשיות של האפליקציה
 */

import { initWheel, spinWheel, isSpinning } from './wheel.js';
import { getPrizes, saveWinningRecord } from './api.js';
import EmailSender from './email-sender.js';

// משתנים גלובליים
let prizes = [];
let currentUser = null;
let emailSender = null;

// מערך הפרסים
const prizesArray = [
    { name: "ספר חוקים", probability: 30 },
    { name: "שובר הנחה 10%", probability: 25 },
    { name: "עט יוקרתי", probability: 20 },
    { name: "תיק מסמכים", probability: 15 },
    { name: "כרטיס לכנס", probability: 10 }
];

// אתחול האפליקציה
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // אתחול שולח המיילים
        emailSender = new EmailSender();
        
        // טעינת פרסים מה-API
        prizes = await getPrizes();
        
        // אתחול גלגל המזל
        initWheel(prizes, handleSpinEnd);
        
        // התחברות לכפתור
        document.getElementById('spin-button').addEventListener('click', handleSpinClick);
        
        // טופס משתמש
        document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
        
        // טיפול במודל תנאי השימוש
        setupTermsModal();
        
        // כפתור התחל מחדש
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', restartApp);
        }
        
        console.log('האפליקציה אותחלה בהצלחה!');
    } catch (error) {
        console.error('שגיאה באתחול האפליקציה:', error);
        showError('אירעה שגיאה בטעינת האפליקציה. אנא נסו שוב מאוחר יותר.');
    }
});

/**
 * מטפל בהגשת טופס המשתמש
 * @param {Event} event - אירוע הטופס
 */
function handleUserSubmit(event) {
    event.preventDefault();
    
    // וידוא שכל האלמנטים קיימים
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const phoneInput = document.getElementById('phone');
    const termsCheckbox = document.getElementById('terms-checkbox');
    
    if (!nameInput || !emailInput || !phoneInput || !termsCheckbox) {
        console.error('אחד או יותר משדות הטופס לא נמצאו');
        return;
    }
    
    // בדיקה שתנאי השימוש אושרו
    if (!termsCheckbox.checked) {
        showError('יש לאשר את תנאי השימוש כדי להמשיך');
        return;
    }
    
    // בדיקת תקינות השדות
    if (!nameInput.value.trim()) {
        showError('נא להזין שם מלא');
        nameInput.focus();
        return;
    }
    
    if (!isValidEmail(emailInput.value)) {
        showError('נא להזין כתובת דוא"ל תקינה');
        emailInput.focus();
        return;
    }
    
    if (!isValidPhone(phoneInput.value)) {
        showError('נא להזין מספר טלפון תקין');
        phoneInput.focus();
        return;
    }
    
    // שמירת פרטי המשתמש
    currentUser = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim()
    };
    
    console.log('נתוני משתמש:', currentUser);
    
    // מעבר למסך הגלגל עם אנימציה
    transitionToWheelScreen();
}

/**
 * מעבר בין מסך הטופס למסך הגלגל בצורה חלקה עם אנימציה
 */
function transitionToWheelScreen() {
    const userSection = document.getElementById('user-section');
    const wheelSection = document.getElementById('wheel-section');
    
    if (!userSection || !wheelSection) {
        console.error('אחד מהמסכים לא נמצא');
        return;
    }
    
    // הוספת אנימציית יציאה למסך הטופס
    userSection.style.opacity = '1';
    userSection.style.transform = 'translateY(0)';
    userSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    // התחלת אנימציית יציאה
    setTimeout(() => {
        userSection.style.opacity = '0';
        userSection.style.transform = 'translateY(-20px)';
        
        // בסיום אנימציית היציאה, החלפת המסכים
        setTimeout(() => {
            // הסתרת מסך הטופס
            userSection.classList.add('hidden');
            userSection.style.opacity = '';
            userSection.style.transform = '';
            
            // הכנת מסך הגלגל לכניסה
            wheelSection.classList.remove('hidden');
            wheelSection.style.opacity = '0';
            wheelSection.style.transform = 'translateY(20px)';
            wheelSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            // התחלת אנימציית כניסה למסך הגלגל
            setTimeout(() => {
                wheelSection.style.opacity = '1';
                wheelSection.style.transform = 'translateY(0)';
                
                // ניקוי סגנונות בסיום האנימציה
                setTimeout(() => {
                    wheelSection.style.opacity = '';
                    wheelSection.style.transform = '';
                    wheelSection.style.transition = '';
                }, 500);
            }, 50);
        }, 500);
    }, 50);
}

/**
 * בדיקת תקינות כתובת דוא"ל
 * @param {string} email - כתובת הדוא"ל לבדיקה
 * @returns {boolean} האם כתובת הדוא"ל תקינה
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * בדיקת תקינות מספר טלפון
 * @param {string} phone - מספר הטלפון לבדיקה
 * @returns {boolean} האם מספר הטלפון תקין
 */
function isValidPhone(phone) {
    // בדיקה בסיסית למספר טלפון ישראלי (מינימום 9 ספרות, מקסימום 10)
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 10;
}

/**
 * התחלת סיבוב הגלגל
 */
function startSpin() {
    const spinButton = document.getElementById('spin-button');
    spinButton.disabled = true;
    spinButton.textContent = 'מסתובב...';
    
    // הסתרת הודעות קודמות
    document.getElementById('result-container').classList.add('hidden');
    
    // הפעלת הגלגל
    spinWheel();
}

/**
 * מטפל בסיום סיבוב הגלגל
 * @param {number} prizeIndex - אינדקס הפרס הזוכה
 */
async function handleSpinEnd(prizeIndex) {
    const prize = prizes[prizeIndex];
    console.log('זכית בפרס:', prize.name);
    
    // עדכון מסך התוצאה
    const resultTitle = document.getElementById('result-title');
    const resultDescription = document.getElementById('result-description');
    const resultImage = document.getElementById('result-image');
    
    if (resultTitle && resultDescription && resultImage) {
        // הגדרת כותרת הפרס
        resultTitle.textContent = `ברכות! זכית ב${prize.name}`;
        
        // הגדרת תיאור הפרס
        resultDescription.textContent = prize.description || `זכית ב${prize.name}. נציג מטעמנו יצור איתך קשר בהקדם.`;
        
        // הגדרת תמונת הפרס
        resultImage.src = getPrizeImagePath(prizeIndex);
        resultImage.alt = prize.name;
        
        // הסתרת מסך הגלגל והצגת מסך התוצאה
        const wheelSection = document.getElementById('wheel-section');
        const resultScreen = document.getElementById('result-screen');
        
        if (wheelSection && resultScreen) {
            wheelSection.classList.add('hidden');
            resultScreen.classList.remove('hidden');
        }
        
        // איפוס כפתור הסיבוב למקרה שנחזור לגלגל בעתיד
        const spinButton = document.getElementById('spin-button');
        if (spinButton) {
            spinButton.disabled = false;
            spinButton.textContent = 'סובב את הגלגל';
        }
        
        // ניסיון לשמור את הזכייה ב-API
        try {
            await saveWinningRecord({
                userName: currentUser?.name || 'אורח',
                userEmail: currentUser?.email || 'לא זמין',
                prizeId: prizeIndex,
                prizeName: prize.name,
                timestamp: new Date().toISOString()
            });
            console.log('הזכייה נשמרה בהצלחה');
        } catch (error) {
            console.error('שגיאה בשמירת הזכייה:', error);
        }
    }
}

/**
 * מתחיל את האפליקציה מחדש - מחזיר את המשתמש לדף הראשון
 */
function restartApp() {
    const userSection = document.getElementById('user-section');
    const wheelSection = document.getElementById('wheel-section');
    const resultScreen = document.getElementById('result-screen');
    
    if (!userSection || !wheelSection || !resultScreen) {
        console.error('אחד מהמסכים לא נמצא');
        return;
    }
    
    // אנימציית יציאה למסך הנוכחי (תוצאה)
    resultScreen.style.opacity = '1';
    resultScreen.style.transform = 'translateY(0)';
    resultScreen.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    // התחלת אנימציית יציאה
    setTimeout(() => {
        resultScreen.style.opacity = '0';
        resultScreen.style.transform = 'translateY(-20px)';
        
        // בסיום אנימציית היציאה, החלפת המסכים
        setTimeout(() => {
            // הסתרת מסכים נוכחיים
            wheelSection.classList.add('hidden');
            resultScreen.classList.add('hidden');
            resultScreen.style.opacity = '';
            resultScreen.style.transform = '';
            
            // הכנת מסך הטופס לכניסה
            userSection.classList.remove('hidden');
            userSection.style.opacity = '0';
            userSection.style.transform = 'translateY(20px)';
            userSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            // התחלת אנימציית כניסה למסך הטופס
            setTimeout(() => {
                userSection.style.opacity = '1';
                userSection.style.transform = 'translateY(0)';
                
                // ניקוי סגנונות בסיום האנימציה
                setTimeout(() => {
                    userSection.style.opacity = '';
                    userSection.style.transform = '';
                    userSection.style.transition = '';
                    
                    // איפוס הטופס
                    const form = document.getElementById('user-form');
                    if (form) {
                        form.reset();
                    }
                }, 500);
            }, 50);
        }, 500);
    }, 50);
}

/**
 * מציג את הפרס הזוכה
 * @param {Object} prize - אובייקט הפרס
 */
function displayPrize(prize) {
    const prizeDisplay = document.getElementById('prize-display');
    const resultContainer = document.getElementById('result-container');
    
    // מציאת התמונה המתאימה לפרס
    const prizeImagePath = getPrizeImagePath(prize.id);
    
    prizeDisplay.innerHTML = `
        <h2 class="prize-title">${prize.name}</h2>
        <div class="prize-image">
            <img src="${prizeImagePath}" alt="${prize.name}">
        </div>
        <p class="prize-description">זכית בפרס: ${prize.name}</p>
        <p class="prize-instructions">נציג מטעמנו יצור איתך קשר בהקדם</p>
    `;
    
    resultContainer.classList.remove('hidden');
    
    // גלילה לתוצאה
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * מקבל את נתיב התמונה המתאימה לפרס לפי מזהה
 * @param {number} prizeId - מזהה הפרס
 * @returns {string} נתיב לתמונת הפרס
 */
function getPrizeImagePath(prizeId) {
    const prizeImages = {
        1: "assets/images/prizes/legal-advice.png",     // ייעוץ משפטי אישי
        2: "assets/images/prizes/law-books.png",        // חבילת ספרי חקיקה
        3: "assets/images/prizes/aski-subscription.png",// מנוי שנתי לאתר אסקי
        4: "assets/images/prizes/ai-course.png",        // קורס מקוון בנושא AI וחדשנות משפטית
        5: "assets/images/prizes/seminar.png",          // השתתפות ביום עיון מקצועי
        6: "assets/images/prizes/podcast.png",          // מינוי חצי שנתי לפודקאסט המשפטי
        7: "assets/images/prizes/book.png",             // ספר "מהפכת הבוררות"
        8: "assets/images/prizes/pen-set.png"           // סט עטי יוקרה של הלשכה
    };
    
    // החזרת תמונה ספציפית או תמונה כללית אם אין התאמה
    return prizeImages[prizeId] || "assets/images/prizes/prize-generic.png";
}

/**
 * מציג הודעת שגיאה למשתמש
 * @param {string} message - הודעת השגיאה
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
        console.error('לא נמצא אלמנט להצגת שגיאות');
        return;
    }
    
    // הסתרת הודעה קודמת אם קיימת
    if (!errorContainer.classList.contains('hidden')) {
        errorContainer.classList.add('hidden');
        // המתנה קצרה לפני הצגת השגיאה החדשה כדי לאפשר לאנימציה להתאפס
        setTimeout(() => showErrorWithAnimation(errorContainer, message), 100);
    } else {
        // הצגה מיידית אם אין הודעה מוצגת כרגע
        showErrorWithAnimation(errorContainer, message);
    }
}

/**
 * מציג הודעת שגיאה עם אנימציה
 * @param {HTMLElement} container - אלמנט תיבת השגיאה
 * @param {string} message - הודעת השגיאה
 */
function showErrorWithAnimation(container, message) {
    // עדכון תוכן ההודעה
    container.textContent = message;
    
    // הצגת האלמנט והפעלת האנימציה
    container.classList.remove('hidden');
    
    // גלילה אל ההודעה אם היא לא בתחום הנראות
    if (!isElementInViewport(container)) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // הסתרה אוטומטית אחרי 5 שניות
    setTimeout(() => {
        if (!container.classList.contains('hidden')) {
            container.classList.add('hidden');
        }
    }, 5000);
}

/**
 * בודק אם אלמנט מסוים נמצא בתחום הנראות של המסך
 * @param {HTMLElement} element - האלמנט לבדיקה
 * @returns {boolean} האם האלמנט בתחום הנראות
 */
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * טיפול בלחיצה על כפתור הסיבוב
 */
function handleSpinClick() {
    // וידוא שלא מסתובב כבר
    if (isSpinning) return;
    
    const spinButton = document.getElementById('spin-button');
    if (spinButton) {
        spinButton.disabled = true;
        spinButton.textContent = 'מסתובב...';
    }
    
    // ניקוי תוצאות קודמות
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) {
        resultContainer.classList.add('hidden');
        // הסרת כפתורים קודמים של התחלה מחדש
        const oldRestartButtons = resultContainer.querySelectorAll('.restart-button');
        oldRestartButtons.forEach(btn => btn.remove());
    }
    
    // הפעלת הגלגל
    spinWheel();
}

/**
 * אתחול ופתיחת מודל תנאי השימוש
 */
function setupTermsModal() {
    const termsModal = document.getElementById('terms-modal');
    const termsLink = document.getElementById('terms-link');
    const closeBtn = document.querySelector('.close');
    
    if (!termsModal || !termsLink || !closeBtn) {
        console.error('אלמנטים חסרים למודל תנאי השימוש');
        return;
    }
    
    // פתיחת המודל בלחיצה על הקישור
    termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        openTermsModal();
    });
    
    // סגירת המודל בלחיצה על X
    closeBtn.addEventListener('click', function() {
        closeTermsModal();
    });
    
    // סגירת המודל בלחיצה מחוץ לתוכן
    window.addEventListener('click', function(e) {
        if (e.target === termsModal) {
            closeTermsModal();
        }
    });
    
    // סגירת המודל בלחיצה על ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && termsModal.style.display === 'block') {
            closeTermsModal();
        }
    });
}

/**
 * פתיחת מודל תנאי השימוש עם אנימציה
 */
function openTermsModal() {
    const termsModal = document.getElementById('terms-modal');
    if (!termsModal) {
        console.error('לא נמצא אלמנט מודל תנאי השימוש');
        return;
    }
    
    termsModal.style.display = 'block';
    termsModal.classList.add('show');
    
    // הוספת קלאס לביטול גלילה בגוף הדף
    document.body.style.overflow = 'hidden';
}

/**
 * סגירת מודל תנאי השימוש עם אנימציה
 */
function closeTermsModal() {
    const termsModal = document.getElementById('terms-modal');
    if (!termsModal) {
        console.error('לא נמצא אלמנט מודל תנאי השימוש');
        return;
    }
    
    termsModal.classList.remove('show');
    
    // אנימציית סגירה
    setTimeout(() => {
        termsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300);
}