/**
 * קובץ ראשי למערכת גלגל המזל
 * מכיל את הלוגיקה והאינטראקציות הראשיות של האפליקציה
 */

import { initWheel, spinWheel, isSpinning } from './wheel.js';
import { getPrizes, saveWinningRecord, getSettings, clearPrizesCache } from './api.js';
import EmailSender from './email-sender.js';

// משתנים גלובליים
let prizes = [];
let currentUser = null;
let emailSender = null;
let idleSettings = null;
let idleTimer = null;
const IDLE_DELAY = 60 * 1000; // דקה

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
    console.log('מתחיל אתחול אפליקציה');
    try {
        // אתחול שולח המיילים
        emailSender = new EmailSender();
        
        // טעינת פרסים מה-API
        console.log('טוען פרסים מה-API...');
        prizes = await getPrizes();
        console.log('התקבלו פרסים:', prizes);
        
        // טעינת הגדרות (סרטון מצב המתנה)
        console.log('טוען הגדרות מה-API...');
        idleSettings = await getSettings();
        console.log('התקבלו הגדרות:', idleSettings);
        setupIdleVideo();
        
        // אתחול גלגל המזל
        console.log('מאתחל גלגל המזל עם', prizes.length, 'פרסים');
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
 * מטפל בסיום סיבוב הגלגל
 * @param {number} prizeIndex - אינדקס הפרס הזוכה
 */
async function handleSpinEnd(prizeIndex) {
    console.log('סיום סיבוב הגלגל, אינדקס פרס:', prizeIndex);
    
    if (prizeIndex === undefined || prizeIndex === null || !prizes[prizeIndex]) {
        console.error('אינדקס פרס לא תקין או פרס לא נמצא:', prizeIndex);
        return;
    }
    
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
        const prizeId = prize.id || prizeIndex;
        resultImage.src = getPrizeImagePath(prizeId);
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
            // הכנת נתוני המשתמש לשליחה
            const winData = {
                userName: currentUser?.name || '',
                userEmail: currentUser?.email || '',
                userPhone: currentUser?.phone || '',
                prizeId: prize.id || prizeIndex,
                prizeName: prize.name,
                timestamp: new Date().toISOString()
            };
            
            // לוגים ניפוי באגים מפורטים
            console.group('נתוני שמירת זכייה:');
            console.log('שם משתמש:', winData.userName);
            console.log('דוא"ל:', winData.userEmail);
            console.log('טלפון:', winData.userPhone);
            console.log('מזהה פרס:', winData.prizeId);
            console.log('שם פרס:', winData.prizeName);
            console.log('זמן:', winData.timestamp);
            console.groupEnd();
            
            // נעטוף את הנתונים בבלוק try נוסף כדי לתפוס שגיאה ספציפית
            console.log('שולח בקשה לשמירת זכייה...');
            const result = await saveWinningRecord(winData);
            console.log('תשובה משרת:', result);
            
            if (result.success) {
                console.log('הזכייה נשמרה בהצלחה!');
            } else {
                console.error('שגיאה בשמירת הזכייה:', result.error);
                showError('אירעה שגיאה בשמירת הזכייה: ' + result.error);
            }
        } catch (error) {
            console.error('שגיאה בשמירת הזכייה (כללי):', error);
            showError('אירעה שגיאה בשמירת הזכייה. אנא נסו שוב מאוחר יותר.');
        }
    }
}

/**
 * מתחיל את האפליקציה מחדש - מחזיר את המשתמש לדף הראשון
 */
async function restartApp() {
    const userSection = document.getElementById('user-section');
    const wheelSection = document.getElementById('wheel-section');
    const resultScreen = document.getElementById('result-screen');
    
    if (!userSection || !wheelSection || !resultScreen) {
        console.error('אחד מהמסכים לא נמצא');
        return;
    }
    
    try {
        // ניקוי קאש הפרסים
        clearPrizesCache();
        
        // טעינה מחדש של רשימת הפרסים מה-API
        console.log('טוען מחדש רשימת פרסים...');
        const newPrizes = await getPrizes();
        if (!newPrizes || newPrizes.length === 0) {
            throw new Error('לא התקבלו פרסים מה-API');
        }
        
        // עדכון מערך הפרסים הגלובלי
        prizes = newPrizes;
        console.log('רשימת הפרסים עודכנה:', prizes);
        
        // אתחול מחדש של גלגל המזל עם הנתונים המעודכנים
        const wheelCanvas = document.getElementById('wheel-canvas');
        if (wheelCanvas) {
            // ניקוי הקנבס
            const ctx = wheelCanvas.getContext('2d');
            ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
            
            // אתחול מחדש של הגלגל
            initWheel(prizes, handleSpinEnd);
        }
        
        // איפוס משתנים גלובליים
        currentUser = null;
        
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
                        
                        // איפוס תמונת הפרס
                        const resultImage = document.getElementById('result-image');
                        if (resultImage) {
                            resultImage.src = 'assets/images/prizes/default-prize.png';
                        }
                        
                        // איפוס תיאור הפרס
                        const resultDescription = document.getElementById('result-description');
                        if (resultDescription) {
                            resultDescription.textContent = 'תיאור הפרס יופיע כאן';
                        }
                        
                        // איפוס כותרת התוצאה
                        const resultTitle = document.getElementById('result-title');
                        if (resultTitle) {
                            resultTitle.textContent = 'ברכות! זכית בפרס';
                        }
                    }, 500);
                }, 50);
            }, 500);
        }, 50);
    } catch (error) {
        console.error('שגיאה בטעינה מחדש של רשימת הפרסים:', error);
        showError('אירעה שגיאה בטעינה מחדש של רשימת הפרסים. אנא נסו שוב.');
    }
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
    console.log('מחפש תמונה לפרס:', prizeId);
    
    if (prizeId === undefined || prizeId === null) {
        console.warn('ID פרס לא תקין:', prizeId);
        return "assets/images/prizes/prize-generic.png";
    }
    
    const prizeImages = {
        // 1: "assets/images/prizes/legal-advice.png",     // ייעוץ משפטי אישי
        // 2: "assets/images/prizes/law-books.png",        // חבילת ספרי חקיקה
        // 3: "assets/images/prizes/aski-subscription.png",// מנוי שנתי לאתר אסקי
        // 4: "assets/images/prizes/ai-course.png",        // קורס מקוון בנושא AI וחדשנות משפטית
        // 5: "assets/images/prizes/seminar.png",          // השתתפות ביום עיון מקצועי
        // 6: "assets/images/prizes/podcast.png",          // מינוי חצי שנתי לפודקאסט המשפטי
        // 7: "assets/images/prizes/book.png",             // ספר "מהפכת הבוררות"
        // 8: "assets/images/prizes/pen-set.png"           // סט עטי יוקרה של הלשכה
    };
    
    // החזרת תמונה ספציפית או תמונה כללית אם אין התאמה
    const imagePath = prizeImages[prizeId] || "assets/images/prizes/default-prize.png";
    console.log('נתיב תמונה לפרס:', imagePath);
    return imagePath;
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

/**
 * אתחול וידאו מצב המתנה והאזנה לאירועי משתמש
 */
function setupIdleVideo() {
    const overlay = document.getElementById('idle-overlay');
    const video = document.getElementById('idle-video');
    if (!overlay || !video) return;
    
    // הגדרת מקור הווידאו מההגדרות
    if (idleSettings?.idleVideoUrl) {
        video.src = idleSettings.idleVideoUrl;
    }
    
    // מאזינים לאירועי משתמש
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    
    // התחלת טיימר ראשוני
    resetIdleTimer();
}

/**
 * איפוס טיימר חוסר פעילות
 */
function resetIdleTimer() {
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;
    
    if (!overlay.classList.contains('hidden')) {
        hideIdleOverlay();
    }
    
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(showIdleOverlay, IDLE_DELAY);
}

/**
 * הצגת שכבת הווידאו במסך מלא
 */
function showIdleOverlay() {
    const overlay = document.getElementById('idle-overlay');
    const video = document.getElementById('idle-video');
    if (!overlay || !video) return;
    
    // אל תציג אם אין וידאו תקין
    if (!idleSettings?.idleVideoUrl) return;
    if (!video.src) {
        video.src = idleSettings.idleVideoUrl;
    }
    
    overlay.classList.add('show');
    overlay.classList.remove('hidden');
    video.currentTime = 0;
    video.play().catch(() => {/* דיכוי שגיאת autoplay */});
}

function hideIdleOverlay() {
    const overlay = document.getElementById('idle-overlay');
    const video = document.getElementById('idle-video');
    if (!overlay || !video) return;
    
    video.pause();
    overlay.classList.remove('show');
    overlay.classList.add('hidden');
}