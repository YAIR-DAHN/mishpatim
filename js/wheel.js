/**
 * מודול לניהול גלגל המזל
 */

// משתנים גלובליים
let wheelCanvas = null;
let wheelCtx = null;
let canvasWidth = 400;
let canvasHeight = 400;
let prizes = [];
let spinEndCallback = null;
export let isSpinning = false;
let spinTimeout = null;
let currentRotation = 0;
let audioContext = null;

/**
 * אתחול גלגל המזל
 * @param {Array} prizesArray - מערך הפרסים
 * @param {Function} callback - פונקציית קולבק לסיום הסיבוב
 */
export function initWheel(prizesArray, callback) {
    prizes = prizesArray;
    spinEndCallback = callback;
    
    // אתחול בד הציור
    wheelCanvas = document.getElementById('wheel-canvas');
    if (!wheelCanvas) {
        console.error('לא נמצא אלמנט canvas עבור הגלגל');
        return;
    }
    
    // הגדרת גודל
    wheelCanvas.width = canvasWidth;
    wheelCanvas.height = canvasHeight;
    
    // הגדרת הקשר
    wheelCtx = wheelCanvas.getContext('2d');
    
    // ציור הגלגל
    drawWheel();
    
    console.log('גלגל המזל אותחל עם', prizes.length, 'פרסים');
    
    // אתחול מערכת השמע
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('לא ניתן ליצור הקשר אודיו:', e);
    }
}

/**
 * ציור הגלגל
 */
function drawWheel() {
    if (!wheelCtx || !prizes.length) return;
    
    // ניקוי בד הציור
    wheelCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // חישוב גודל כל מקטע
    const arc = Math.PI * 2 / prizes.length;
    
    // הגדרת המרכז
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // ציור המקטעים
    for (let i = 0; i < prizes.length; i++) {
        const angle = i * arc + currentRotation;
        const nextAngle = (i + 1) * arc + currentRotation;
        
        // ציור מקטע
        wheelCtx.beginPath();
        wheelCtx.moveTo(centerX, centerY);
        wheelCtx.arc(centerX, centerY, radius, angle, nextAngle);
        wheelCtx.closePath();
        
        // בחירת צבעים מתחלפים בגלגל
        const colorIndex = i % 3;
        let primaryColor, secondaryColor;
        
        if (colorIndex === 0) {
            primaryColor = '#1e3a8a';  // כחול כהה (לשכה)
            secondaryColor = '#1e40af'; // כחול כהה יותר
        } else if (colorIndex === 1) {
            primaryColor = '#0891b2';  // ציאן
            secondaryColor = '#0e7490'; // ציאן כהה
        } else {
            primaryColor = '#1d4ed8';  // כחול רויאל
            secondaryColor = '#1e3a8a'; // כחול נייבי
        }
        
        // יצירת גרדיאנט
        const gradient = wheelCtx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);
        
        // צביעת מקטע
        wheelCtx.fillStyle = gradient;
        wheelCtx.fill();
        
        // הוספת גבול
        wheelCtx.strokeStyle = '#ffffff';
        wheelCtx.lineWidth = 1;
        wheelCtx.stroke();
        
        // ציור טקסט
        wheelCtx.save();
        wheelCtx.translate(centerX, centerY);
        wheelCtx.rotate(angle + arc / 2);
        
        wheelCtx.textAlign = 'right';
        wheelCtx.fillStyle = '#ffffff';
        wheelCtx.font = 'bold 14px Heebo, Arial';
        wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        wheelCtx.shadowBlur = 2;
        
        // קיצור שם הפרס אם ארוך מדי
        let prizeName = prizes[i].name;
        if (prizeName.length > 20) {
            prizeName = prizeName.substring(0, 17) + '...';
        }
        
        // ציור הטקסט
        wheelCtx.fillText(prizeName, radius - 25, 5);
        wheelCtx.restore();
    }
    
    // ציור העיגול האמצעי
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    wheelCtx.fillStyle = '#ffffff';
    wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    wheelCtx.shadowBlur = 5;
    wheelCtx.shadowOffsetX = 2;
    wheelCtx.shadowOffsetY = 2;
    wheelCtx.fill();
    
    // ציור המחוון (חץ)
    drawPointer(centerX, centerY);
}

/**
 * ציור החץ המצביע על הפרס
 * @param {number} centerX - מרכז ציר X
 * @param {number} centerY - מרכז ציר Y
 */
function drawPointer(centerX, centerY) {
    const radius = Math.min(centerX, centerY) - 5;
    
    wheelCtx.save();
    
    // יצירת צורת חץ משופרת
    wheelCtx.beginPath();
    wheelCtx.moveTo(centerX + radius + 15, centerY - 2);
    wheelCtx.lineTo(centerX + radius + 30, centerY - 12);
    wheelCtx.lineTo(centerX + radius + 30, centerY + 12);
    wheelCtx.lineTo(centerX + radius + 15, centerY + 2);
    wheelCtx.closePath();
    
    // יצירת גרדיאנט לחץ
    const gradient = wheelCtx.createLinearGradient(
        centerX + radius + 15, centerY,
        centerX + radius + 30, centerY
    );
    gradient.addColorStop(0, '#ef4444'); // אדום בהיר
    gradient.addColorStop(1, '#b91c1c'); // אדום כהה
    
    wheelCtx.fillStyle = gradient;
    wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    wheelCtx.shadowBlur = 5;
    wheelCtx.shadowOffsetX = 2;
    wheelCtx.shadowOffsetY = 2;
    wheelCtx.fill();
    
    // הוספת מסגרת לחץ
    wheelCtx.strokeStyle = '#ffffff';
    wheelCtx.lineWidth = 1;
    wheelCtx.stroke();
    
    wheelCtx.restore();
}

/**
 * יצירת צליל סיבוב
 * @param {number} frequency - תדירות הצליל
 * @param {number} duration - משך הצליל בשניות
 */
function playTickSound(frequency, duration) {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.15;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        // דעיכה הדרגתית של הצליל
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.warn('לא ניתן להשמיע צליל:', e);
    }
}

/**
 * הפעלת רצף צלילים עם הפחתה בתדירות
 */
function startSpinSound() {
    if (!audioContext) return;
    
    let currentFreq = 800;
    const soundInterval = 100; // משך בין הצלילים במילישניות
    
    const playNextTick = () => {
        if (!isSpinning) return;
        
        playTickSound(currentFreq, 0.1);
        
        // הפחתה הדרגתית בתדירות הצליל
        currentFreq = Math.max(200, currentFreq * 0.98);
        
        // המשך רצף הצלילים
        setTimeout(playNextTick, soundInterval);
    };
    
    // התחלת רצף הצלילים
    playNextTick();
}

/**
 * סיבוב הגלגל
 */
export function spinWheel() {
    if (isSpinning) return;
    
    isSpinning = true;
    
    // נגינת צליל התחלה
    if (audioContext) {
        playTickSound(500, 0.3);
        
        // התחלת רצף צלילי הסיבוב
        setTimeout(startSpinSound, 300);
    }
    
    // בחירה אקראית של מספר הסיבובים (בין 3 ל-5 סיבובים מלאים)
    const numRotations = 3 + Math.random() * 2;
    const totalAngle = numRotations * Math.PI * 2;
    
    // בחירה אקראית של עצירה על פרס ספציפי
    const selectedPrizeIndex = Math.floor(Math.random() * prizes.length);
    const arc = Math.PI * 2 / prizes.length;
    const targetAngle = selectedPrizeIndex * arc;
    
    // חישוב הזווית הסופית (מספר סיבובים מלאים + הזווית של הפרס הנבחר)
    const finalAngle = totalAngle + targetAngle;
    
    // הגדרת זמן הסיבוב (בין 4 ל-6 שניות)
    const spinDuration = 4000 + Math.random() * 2000;
    
    // הגדרת פרמטרים לאנימציה
    const startTime = Date.now();
    const startAngle = currentRotation;
    
    // פונקציית האנימציה
    const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        // חישוב ההתקדמות באנימציה (0-1)
        const progress = Math.min(1, elapsed / spinDuration);
        
        // הפונקציה להאטה - מתחיל מהר ומאט בסוף (easeOutCubic)
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        
        // חישוב הזווית הנוכחית
        currentRotation = startAngle + easeOut(progress) * finalAngle;
        
        // ציור הגלגל
        drawWheel();
        
        // המשך האנימציה אם לא הסתיימה
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // סיום הסיבוב
            finishSpin(selectedPrizeIndex);
        }
    };
    
    // התחלת האנימציה
    requestAnimationFrame(animate);
    
    // הגדרת טיימר בטיחות - אם מסיבה כלשהי האנימציה לא מסתיימת כראוי
    clearTimeout(spinTimeout);
    spinTimeout = setTimeout(() => {
        if (isSpinning) {
            const randomIndex = Math.floor(Math.random() * prizes.length);
            finishSpin(randomIndex);
        }
    }, spinDuration + 1000); // זמן הסיבוב + מרווח בטיחות
}

/**
 * סיום סיבוב הגלגל
 * @param {number} prizeIndex - אינדקס הפרס הזוכה
 */
function finishSpin(prizeIndex) {
    isSpinning = false;
    
    // ניגון צליל זכייה
    if (audioContext) {
        // צליל זכייה - רצף עולה של צלילים
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                playTickSound(600 + i * 200, 0.2);
            }, i * 150);
        }
    }
    
    console.log('הגלגל עצר על פרס מספר:', prizeIndex, prizes[prizeIndex].name);
    
    // קריאה לפונקציית הקולבק
    if (spinEndCallback && typeof spinEndCallback === 'function') {
        setTimeout(() => {
            spinEndCallback(prizeIndex);
        }, 500);
    }
}

/**
 * איפוס הגלגל
 */
export function resetWheel() {
    currentRotation = 0;
    isSpinning = false;
    
    if (spinTimeout) {
        clearTimeout(spinTimeout);
        spinTimeout = null;
    }
    
    drawWheel();
}