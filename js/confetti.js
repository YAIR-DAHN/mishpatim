/**
 * מודול אפקט קונפטי
 * קובץ זה מכיל את הלוגיקה להפעלת אפקט קונפטי בעת זכייה
 */

// משתנים גלובליים
let confettiActive = false;
let confettiRenderFrame = null;
let confettiCanvas = null;
let confettiContext = null;
let confettiParticles = [];

// הגדרות מחדל
const DEFAULT_SETTINGS = {
    particleCount: 150,
    particleSpeed: 2,
    particleSize: 6,
    particleSizeVariation: 3,
    defaultColors: [
        '#1e3a8a', // כחול כהה
        '#0ea5e9', // כחול בהיר
        '#4338ca', // סגול
        '#0891b2', // ציאן
        '#f59e0b', // כתום
        '#10b981'  // ירוק
    ],
    gravity: 0.5,
    spread: 50,
    terminalVelocity: 2
};

// אתחול מודול הקונפטי
function initConfetti() {
    // יצירת אלמנט הקנבס אם לא קיים
    if (!confettiCanvas) {
        confettiCanvas = document.createElement('canvas');
        confettiCanvas.className = 'confetti-canvas';
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.pointerEvents = 'none';
        confettiCanvas.style.zIndex = '1000';
        document.body.appendChild(confettiCanvas);
        
        // יצירת קונטקסט הציור
        confettiContext = confettiCanvas.getContext('2d');
        
        // התאמת גודל הקנבס לחלון
        resizeConfettiCanvas();
        
        // הוספת מאזין לשינוי גודל החלון
        window.addEventListener('resize', resizeConfettiCanvas);
    }
}

// התאמת גודל הקנבס לחלון
function resizeConfettiCanvas() {
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
}

// יצירת חלקיק קונפטי
function createConfettiParticle(settings = {}) {
    const options = { ...DEFAULT_SETTINGS, ...settings };
    
    return {
        x: options.startX || Math.random() * confettiCanvas.width,
        y: options.startY || -10,
        size: options.particleSize + Math.random() * options.particleSizeVariation,
        color: options.defaultColors[Math.floor(Math.random() * options.defaultColors.length)],
        speed: Math.random() * options.particleSpeed + 1,
        angle: (Math.PI / 4) + (Math.random() * options.spread / 100),
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 2 - 1
    };
}

// ציור חלקיק קונפטי
function drawConfettiParticle(particle) {
    confettiContext.save();
    confettiContext.translate(particle.x, particle.y);
    confettiContext.rotate(particle.rotation * Math.PI / 180);
    
    confettiContext.fillStyle = particle.color;
    confettiContext.beginPath();
    
    // צורות שונות של חלקיקים
    const shapeType = Math.floor(Math.random() * 3);
    
    if (shapeType === 0) {
        // מלבן
        confettiContext.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
    } else if (shapeType === 1) {
        // עיגול
        confettiContext.beginPath();
        confettiContext.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        confettiContext.fill();
    } else {
        // משולש
        confettiContext.beginPath();
        confettiContext.moveTo(-particle.size / 2, particle.size / 4);
        confettiContext.lineTo(0, -particle.size / 2);
        confettiContext.lineTo(particle.size / 2, particle.size / 4);
        confettiContext.closePath();
        confettiContext.fill();
    }
    
    confettiContext.restore();
}

// עדכון מיקום החלקיקים
function updateConfettiParticles() {
    for (let i = 0; i < confettiParticles.length; i++) {
        const particle = confettiParticles[i];
        
        // עדכון תנועה
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed + DEFAULT_SETTINGS.gravity;
        
        // עדכון סיבוב
        particle.rotation += particle.rotationSpeed;
        
        // הגבלת מהירות (מהירות סופית)
        if (particle.speed > DEFAULT_SETTINGS.terminalVelocity) {
            particle.speed = DEFAULT_SETTINGS.terminalVelocity;
        }
        
        // הסרת חלקיקים שיצאו מהמסך
        if (particle.y > confettiCanvas.height) {
            confettiParticles.splice(i, 1);
            i--;
        }
    }
}

// רינדור אנימציית הקונפטי
function renderConfetti() {
    if (!confettiActive) {
        return;
    }
    
    // ניקוי הקנבס
    confettiContext.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    // ציור החלקיקים
    for (const particle of confettiParticles) {
        drawConfettiParticle(particle);
    }
    
    // עדכון מיקום החלקיקים
    updateConfettiParticles();
    
    // הוספת חלקיקים חדשים אם צריך
    if (confettiParticles.length < 30 && Math.random() > 0.9) {
        confettiParticles.push(createConfettiParticle({
            startX: Math.random() * confettiCanvas.width
        }));
    }
    
    // בקשה לפריים הבא
    confettiRenderFrame = requestAnimationFrame(renderConfetti);
}

// התחלת אפקט הקונפטי
function startConfettiEffect(settings = {}) {
    // אתחול הקנבס אם צריך
    initConfetti();
    
    // איפוס החלקיקים הקיימים
    confettiParticles = [];
    
    // שילוב הגדרות ברירת מחדל עם ההגדרות שנשלחו
    const options = { ...DEFAULT_SETTINGS, ...settings };
    
    // יצירת החלקיקים הראשוניים
    for (let i = 0; i < options.particleCount; i++) {
        confettiParticles.push(createConfettiParticle({
            startX: confettiCanvas.width / 2,
            particleSize: options.particleSize,
            particleSizeVariation: options.particleSizeVariation,
            defaultColors: options.defaultColors,
            particleSpeed: options.particleSpeed,
            spread: options.spread
        }));
    }
    
    // הפעלת האנימציה
    confettiActive = true;
    
    if (!confettiRenderFrame) {
        confettiRenderFrame = requestAnimationFrame(renderConfetti);
    }
}

// עצירת אפקט הקונפטי
function stopConfettiEffect() {
    confettiActive = false;
    
    if (confettiRenderFrame) {
        cancelAnimationFrame(confettiRenderFrame);
        confettiRenderFrame = null;
    }
    
    // ניקוי הקנבס
    if (confettiContext) {
        confettiContext.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
    
    // איפוס החלקיקים
    confettiParticles = [];
}

// חשיפת פונקציות לשימוש גלובלי
window.startConfettiEffect = startConfettiEffect;
window.stopConfettiEffect = stopConfettiEffect; 