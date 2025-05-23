/**
 * מודול לניהול גלגל המזל
 */

import { getRandomPrize, clearPrizesCache, getPrizes } from './api.js';

// משתנים גלובליים
let wheelCanvas = null;
let wheelCtx = null;
let canvasWidth = 600;
let canvasHeight = 600;
let prizes = [];
let spinEndCallback = null;
export let isSpinning = false;
let spinTimeout = null;
let currentRotation = 0;
let audioContext = null;
let originalPrizes = []; // שמירת רשימת הפרסים המקורית

/**
 * אתחול גלגל המזל
 * @param {Array} prizesArray - מערך הפרסים
 * @param {Function} callback - פונקציית קולבק לסיום הסיבוב
 */
export function initWheel(prizesArray, callback) {
    // שמירת רשימת הפרסים המקורית
    originalPrizes = prizesArray;
    
    // סינון רק פרסים זמינים (יש במלאי וההסתברות חיובית)
    prizes = prizesArray.filter(prize => 
        (prize.stock || 0) > (prize.distributed || 0) && 
        (prize.probability || 0) > 0
    );
    
    // אם אין פרסים זמינים, נציג הודעה ונחזיר
    if (prizes.length === 0) {
        console.error('אין פרסים זמינים להצגה בגלגל!');
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = 'מצטערים, כל הפרסים חולקו! תודה על השתתפותכם';
            errorContainer.classList.remove('hidden');
        }
        return;
    }
    
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
    
    console.log('גלגל המזל אותחל עם', prizes.length, 'פרסים זמינים מתוך', originalPrizes.length, 'פרסים');
    
    // אתחול מערכת השמע
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('לא ניתן ליצור הקשר אודיו:', e);
    }
}

/**
 * עוטף טקסט לשורות לפי רוחב מקסימלי
 * @param {CanvasRenderingContext2D} ctx - קונטקסט הקנבס
 * @param {string} text - הטקסט לעיטוף
 * @param {number} maxWidth - רוחב מקסימלי לשורה
 * @returns {string[]} - מערך שורות
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + (line ? ' ' : '') + words[n];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && line) {
            lines.push(line);
            line = words[n];
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    return lines;
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
    const radius = Math.min(centerX, centerY) - 2;
    
    // ציור המקטעים
    for (let i = 0; i < prizes.length; i++) {
        const prize = prizes[i];
        const angle = i * arc + currentRotation;
        const nextAngle = (i + 1) * arc + currentRotation;
        
        // ציור מקטע
        wheelCtx.beginPath();
        wheelCtx.moveTo(centerX, centerY);
        wheelCtx.arc(centerX, centerY, radius, angle, nextAngle);
        wheelCtx.closePath();
        
        // בחירת צבעים לפי האינדקס
        let primaryColor, secondaryColor;
        
        // צבעים לפרס - מתחלפים לפי האינדקס
        const colorIndex = i % 3;
        if (colorIndex === 0) {
            primaryColor = '#1e3a8a';   // כחול כהה (לשכה)
            secondaryColor = '#1e40af';  // כחול כהה יותר
        } else if (colorIndex === 1) {
            primaryColor = '#0891b2';   // ציאן
            secondaryColor = '#0e7490';  // ציאן כהה
        } else {
            primaryColor = '#1d4ed8';   // כחול רויאל
            secondaryColor = '#1e3a8a';  // כחול נייבי
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
        
        // עטיפת שם הפרס לשורות
        let prizeName = prizes[i].name;
        // מרחק מהקצה החיצוני
        const textRadius = radius - 20;
        const maxTextWidth = radius * 0.6;
        let lines = wrapText(wheelCtx, prizeName, maxTextWidth);
        const maxLines = 3;
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[maxLines-1] = lines[maxLines-1].replace(/.{3}$/, '') + '...';
        }
        const lineHeight = 15;
        // ציור כל שורה במרחק קבוע מהמרכז, קרוב לקצה
        for (let j = 0; j < lines.length; j++) {
            wheelCtx.fillText(
                lines[j],
                textRadius,
                (j - (lines.length - 1) / 2) * lineHeight
            );
        }
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
    return new Promise(async (resolve, reject) => {
        if (isSpinning) {
            showError('הגלגל כבר מסתובב, אנא המתן');
            reject(new Error('הגלגל כבר מסתובב'));
            return;
        }

        // בדיקה האם יש פרסים זמינים
        if (prizes.length === 0) {
            showError('מצטערים, כל הפרסים חולקו! תודה על השתתפותכם');
            reject(new Error('אין פרסים זמינים'));
            return;
        }

        isSpinning = true;
        
        // נגינת צליל התחלה
        if (audioContext) {
            playTickSound(500, 0.3);
            // התחלת רצף צלילי הסיבוב
            setTimeout(startSpinSound, 300);
        }

        try {
            // קבלת פרס אקראי מה-API
            let selectedPrize = getRandomPrize();
            
            // אם אין פרס זמין, ננסה לרענן את המטמון ולנסות שוב
            if (!selectedPrize) {
                console.log('אין פרסים זמינים במטמון, מרענן מטמון...');
                // ניקוי המטמון
                clearPrizesCache();
                // טעינה מחדש של הפרסים
                const freshPrizes = await getPrizes();
                console.log('נטענו פרסים חדשים:', freshPrizes);
                // ניסיון נוסף לקבלת פרס אקראי
                selectedPrize = getRandomPrize();
            }
            
            if (!selectedPrize) {
                isSpinning = false;
                showError('מצטערים, אירעה שגיאה בבחירת הפרס. אנא נסו שוב');
                reject(new Error('לא נמצא פרס זמין גם אחרי ריענון המטמון'));
                return;
            }

            // בדיקה נוספת שהפרס לא אזל מהמלאי
            if ((selectedPrize.stock || 0) <= (selectedPrize.distributed || 0)) {
                isSpinning = false;
                showError('מצטערים, הפרס שנבחר אזל מהמלאי. אנא נסו שוב');
                reject(new Error('הפרס שנבחר אזל מהמלאי'));
                return;
            }

            // מציאת האינדקס של הפרס בגלגל
            console.log('מחפש את הפרס בגלגל. ID הפרס הנבחר:', selectedPrize.id);
            const prizeIndex = prizes.findIndex(p => p.id === selectedPrize.id);
            console.log('אינדקס הפרס בגלגל:', prizeIndex);
            
            if (prizeIndex === -1) {
                isSpinning = false;
                showError('מצטערים, אירעה שגיאה בהתאמת הפרס לגלגל. אנא נסו שוב');
                reject(new Error('הפרס שנבחר לא נמצא בגלגל'));
                return;
            }

            // בדיקה נוספת שהפרס במיקום בגלגל זהה לפרס שנבחר
            if (prizes[prizeIndex].id !== selectedPrize.id) {
                isSpinning = false;
                console.error(
                    'שגיאה חמורה: אי-התאמה בין הפרס שנבחר לבין הפרס בגלגל!',
                    'פרס נבחר:', selectedPrize,
                    'פרס בגלגל:', prizes[prizeIndex]
                );
                showError('מצטערים, אירעה שגיאה בהתאמת הפרס. אנא נסו שוב');
                reject(new Error('אי-התאמה בין הפרס שנבחר לבין הפרס בגלגל'));
                return;
            }

            // חישוב הזווית הסופית
            const segmentAngle = 360 / prizes.length;
            const finalAngle = 360 * 5 + (360 - (prizeIndex * segmentAngle) - (segmentAngle / 2)); // 5 סיבובים מלאים + הזווית לפרס
            
            // אנימציית הסיבוב
            const startTime = performance.now();
            const spinDuration = 5; // 5 שניות
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / (spinDuration * 1000), 1);
                
                // פונקציית האטה
                const easeOut = (t) => 1 - Math.pow(1 - t, 3);
                currentRotation = easeOut(progress) * finalAngle;
                
                drawWheel();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    finishSpin(prizeIndex, resolve);
                }
            };
            
            requestAnimationFrame(animate);
        } catch (error) {
            console.error('שגיאה בסיבוב הגלגל:', error);
            isSpinning = false;
            showError('אירעה שגיאה בסיבוב הגלגל. אנא נסו שוב');
            reject(error);
        }
    });
}

/**
 * סיום סיבוב הגלגל
 * @param {number} prizeIndex - אינדקס הפרס הזוכה
 */
function finishSpin(prizeIndex, resolve) {
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
    
    // בדיקה שוב שהפרס לא אזל מהמלאי בזמן הסיבוב
    const selectedPrize = prizes[prizeIndex];
    console.log('הגלגל עצר על פרס מספר:', prizeIndex, selectedPrize.name, `(ID: ${selectedPrize.id})`);

    // בדיקה סופית שהפרס זמין
    if ((selectedPrize.stock || 0) <= (selectedPrize.distributed || 0)) {
        console.error('שגיאה חמורה: הפרס שנבחר אזל מהמלאי!', selectedPrize);
        showError('מצטערים, הפרס שנבחר אזל מהמלאי. אנא נסו שוב');
        resetWheel();
        // מחזירים null כדי לסמן שהייתה שגיאה
        resolve(null);
        return;
    }
    
    // עדכון המטמון לאחר זכייה
    clearPrizesCache();
    console.log('מטמון הפרסים נוקה');
    
    // קריאה לפונקציית הקולבק
    if (spinEndCallback && typeof spinEndCallback === 'function') {
        setTimeout(() => {
            spinEndCallback(selectedPrize);
        }, 500);
    }
    
    resolve(selectedPrize);
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

/**
 * הצגת הודעת שגיאה למשתמש
 * @param {string} message - הודעת השגיאה להצגה
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        
        // הסתרת ההודעה אחרי 5 שניות
        setTimeout(() => {
            errorContainer.classList.add('hidden');
        }, 5000);
    }
}