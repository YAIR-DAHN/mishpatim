// דוגמה למידע על פרסים
const prizes = [
    { id: 1, name: "עט יוקרתי", description: "עט מותג פרימיום באריזת מתנה", image: "pen.jpg", probability: 20 },
    { id: 2, name: "ספר משפטים", description: "ספר מקצועי בנושא משפטים", image: "book.jpg", probability: 20 },
    { id: 3, name: "שובר הנחה 10%", description: "שובר הנחה לשירותים משפטיים", image: "voucher.jpg", probability: 30 },
    { id: 4, name: "כרטיס לכנס משפטי", description: "כרטיס VIP לכנס משפטי הבא", image: "ticket.jpg", probability: 5 },
    { id: 5, name: "חולצת טי", description: "חולצה עם הלוגו של המשרד", image: "tshirt.jpg", probability: 15 },
    { id: 6, name: "כוס תרמית", description: "כוס תרמית עם הלוגו של המשרד", image: "cup.jpg", probability: 10 }
];

// משתנים גלובליים
let userData = null;
let selectedPrize = null;
let isSpinning = false;

// אלמנטים מה-DOM
const screens = {
    splash: document.getElementById('splash-screen'),
    form: document.getElementById('form-screen'),
    wheel: document.getElementById('wheel-screen'),
    prize: document.getElementById('prize-screen')
};

const userForm = document.getElementById('user-form');
const wheelElement = document.getElementById('wheel');
const spinButton = document.getElementById('spin-button');
const prizeDisplay = document.getElementById('prize-display');
const restartButton = document.getElementById('restart-button');

// פונקציה להחלפה בין מסכים
function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenId].classList.add('active');
}

// יצירת גלגל המזל
function createWheel() {
    const totalPrizes = prizes.length;
    const wheelHtml = prizes.map((prize, index) => {
        const angle = (index * 360) / totalPrizes;
        const rotation = 90 + angle; // מבטיח שהאלמנט הראשון מופיע למעלה
        
        // חישוב צבעים מתחלפים עבור המקטעים בגלגל
        const bgColor = index % 2 === 0 ? '#1976d2' : '#0d47a1';
        
        return `
            <div class="wheel-item" data-id="${prize.id}" style="
                position: absolute;
                width: 50%;
                height: 50%;
                transform-origin: bottom right;
                transform: rotate(${angle}deg) skewY(-${(360 / totalPrizes) - 90}deg);
                background-color: ${bgColor};
                right: 50%;
                bottom: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                color: white;
                font-weight: bold;
                padding-bottom: 30%;
                box-sizing: border-box;
                text-align: center;
            ">
                ${prize.name}
            </div>
        `;
    }).join('');
    
    wheelElement.innerHTML = wheelHtml;
}

// מסובב את הגלגל וקובע את הפרס
function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    
    // בוחר פרס על פי הסתברות
    const selectedPrizeIndex = getRandomPrizeIndex();
    selectedPrize = prizes[selectedPrizeIndex];
    
    // מחשב את הזווית הסופית כך שהגלגל יעצר בפרס שנבחר
    const totalPrizes = prizes.length;
    const segmentAngle = 360 / totalPrizes;
    const prizeAngle = segmentAngle * selectedPrizeIndex;
    const extraSpins = 5; // מספר הסיבובים המלאים לפני עצירה
    const finalAngle = -(prizeAngle + 360 * extraSpins + Math.random() * (segmentAngle / 2) - (segmentAngle / 4));
    
    // מסובב את הגלגל
    wheelElement.style.setProperty('--rotation-value', `${finalAngle}deg`);
    wheelElement.style.animation = `spin 5s cubic-bezier(0.17, 0.67, 0.15, 1) forwards`;
    
    // קובע טיימר להצגת הפרס לאחר 5 שניות (משך הסיבוב)
    setTimeout(() => {
        showPrize();
        isSpinning = false;
    }, 5000);
}

// בוחר פרס על פי ההסתברות שהוגדרה
function getRandomPrizeIndex() {
    // יוצר מערך של הסתברויות מצטברות
    const probabilities = [];
    let cumulativeProbability = 0;
    
    for (const prize of prizes) {
        cumulativeProbability += prize.probability;
        probabilities.push(cumulativeProbability);
    }
    
    // מגריל מספר בין 0 ל-100
    const randomValue = Math.random() * 100;
    
    // מוצא את האינדקס של הפרס שבו נעצרה ההטבה
    for (let i = 0; i < probabilities.length; i++) {
        if (randomValue <= probabilities[i]) {
            return i;
        }
    }
    
    // ברירת מחדל - פרס ראשון
    return 0;
}

// מציג את מסך הזכייה עם הפרס שנבחר
function showPrize() {
    if (!selectedPrize) return;
    
    prizeDisplay.innerHTML = `
        <h2>${selectedPrize.name}</h2>
        <p>${selectedPrize.description}</p>
        <div class="prize-image">
            <img src="${selectedPrize.image}" alt="${selectedPrize.name}" onerror="this.src='placeholder.jpg'">
        </div>
    `;
    
    showScreen('prize');
    
    // שומר את הנתונים בשרת
    saveUserData();
    
    // מציג קונפטי
    createConfetti();
}

// שולח את הנתונים לשרת (מדומה בשלב זה)
function saveUserData() {
    const data = {
        user: userData,
        prize: selectedPrize,
        timestamp: new Date().toISOString()
    };
    
    console.log('נתונים נשמרו:', data);
    
    // אם יש חיבור ל-Google Sheets, כאן יתבצע החיבור והשמירה
    // ניתן להשתמש ב-fetch API לשליחת הנתונים לשרת
    
    /*
    fetch('https://script.google.com/macros/s/YOUR_APPSCRIPT_ID/exec', {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Success:', result);
    })
    .catch(error => {
        console.error('Error:', error);
    });
    */
}

// יוצר אנימציית קונפטי
function createConfetti() {
    const confettiElement = document.querySelector('.confetti');
    const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: ${colors[Math.floor(Math.random() * colors.length)]};
            top: -10px;
            left: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.8 + 0.2};
            transform: rotate(${Math.random() * 360}deg);
            animation: fall ${Math.random() * 3 + 2}s linear forwards;
        `;
        confettiElement.appendChild(confetti);
    }
    
    // סגנון אנימציית הקונפטי
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fall {
            to {
                top: 100%;
                transform: rotate(${Math.random() * 360 + 360}deg);
            }
        }
    `;
    document.head.appendChild(style);
}

// מאזינים לאירועים
document.addEventListener('DOMContentLoaded', () => {
    // יצירת גלגל המזל
    createWheel();
    
    // מאזין למסך הפתיחה
    screens.splash.addEventListener('click', () => {
        showScreen('form');
    });
    screens.splash.addEventListener('mousemove', () => {
        showScreen('form');
    });
    
    // מאזין לטופס המשתמש
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // שומר את נתוני המשתמש
        userData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            email: document.getElementById('email').value
        };
        
        showScreen('wheel');
    });
    
    // מאזין לכפתור הסיבוב
    spinButton.addEventListener('click', spinWheel);
    
    // מאזין לכפתור האתחול
    restartButton.addEventListener('click', () => {
        // מאפס את המשתנים
        selectedPrize = null;
        userData = null;
        
        // מאפס את הטופס
        userForm.reset();
        
        // מאפס את הגלגל
        wheelElement.style.animation = 'none';
        wheelElement.style.transform = 'rotate(0deg)';
        
        // מסיר את כל אלמנטי הקונפטי
        document.querySelector('.confetti').innerHTML = '';
        
        // חוזר למסך הפתיחה
        showScreen('splash');
        
        // מאפשר הפעלה מחדש של האנימציה על ידי איפוס זמני
        setTimeout(() => {
            wheelElement.style.animation = '';
        }, 50);
    });

    // קוד למודל תנאי שימוש
    const termsModal = document.getElementById('terms-modal');
    const termsLink = document.getElementById('terms-link');
    const closeBtn = document.querySelector('.close');

    termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        termsModal.style.display = 'block';
    });

    closeBtn.addEventListener('click', function() {
        termsModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target == termsModal) {
            termsModal.style.display = 'none';
        }
    });
});

// הסתר את הגלגל והצג את הטופס
wheelContainer.style.display = 'none';
formContainer.style.display = 'block';

// הסתר את כפתור הגלגל הנוסף והצג כפתור התחלה מחדש
const spinAgainBtn = document.querySelector('.spin-again-btn');
if (spinAgainBtn) {
    spinAgainBtn.style.display = 'none';
}

const restartBtn = document.createElement('button');
restartBtn.className = 'submit-btn';
restartBtn.textContent = 'הבא בתור בבקשה!';
restartBtn.style.marginTop = '20px';
restartBtn.onclick = function() {
    location.reload();
};
formContainer.appendChild(restartBtn); 