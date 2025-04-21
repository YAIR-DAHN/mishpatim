/**
 * מודול לשליחת מיילי זכייה למשתתפים
 */
class EmailSender {
    constructor(apiEndpoint) {
        this.apiEndpoint = apiEndpoint || '/api/send-email';
        this.templateCache = null;
    }

    /**
     * טוען את תבנית המייל
     * @returns {Promise<string>} תבנית HTML של המייל
     */
    async loadEmailTemplate() {
        if (this.templateCache) {
            return this.templateCache;
        }

        try {
            const response = await fetch('assets/email/email-template.html');
            if (!response.ok) {
                throw new Error(`שגיאה בטעינת תבנית המייל: ${response.status}`);
            }
            this.templateCache = await response.text();
            return this.templateCache;
        } catch (error) {
            console.error('שגיאה בטעינת תבנית המייל:', error);
            throw error;
        }
    }

    /**
     * מחליף את המשתנים בתבנית עם הערכים הנכונים
     * @param {string} template - תבנית HTML
     * @param {Object} data - אובייקט עם נתונים להחלפה
     * @returns {string} תבנית HTML מעודכנת
     */
    replaceTemplateVariables(template, data) {
        let result = template;
        
        // החלפת כל המשתנים בתבנית
        for (const [key, value] of Object.entries(data)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(placeholder, value);
        }
        
        return result;
    }

    /**
     * מכין את נתוני המייל לזוכה
     * @param {Object} user - פרטי המשתמש
     * @param {Object} prize - פרטי הפרס
     * @returns {Object} אובייקט עם נתונים להחלפה בתבנית
     */
    prepareEmailData(user, prize) {
        const currentDate = new Date();
        const formattedDate = new Intl.DateTimeFormat('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(currentDate);

        return {
            NAME: user.name || 'משתתף יקר',
            PRIZE_NAME: prize.name,
            PRIZE_IMAGE_URL: this.getPrizeImageUrl(prize.id),
            DATE: formattedDate,
            LOGO_URL: 'assets/images/logo/logo-lawpub.png',
            WEBSITE_URL: 'https://lawpub.odoo.com',
            FACEBOOK_URL: 'https://facebook.com/israelbarpublishing',
            LINKEDIN_URL: 'https://linkedin.com/company/israelbarlawoub',
            TWITTER_URL: 'https://twitter.com/IsraelBarPub',
            CURRENT_YEAR: currentDate.getFullYear().toString()
        };
    }

    /**
     * מקבל את נתיב התמונה של הפרס לפי מזהה הפרס
     * @param {number} prizeId - מזהה הפרס
     * @returns {string} נתיב יחסי לתמונת הפרס
     */
    getPrizeImageUrl(prizeId) {
        const prizeImages = {
            1: 'assets/images/prizes/legal-advice.png',     // ייעוץ משפטי אישי
            2: 'assets/images/prizes/law-books.png',        // חבילת ספרי חקיקה
            3: 'assets/images/prizes/aski-subscription.png',// מנוי שנתי לאתר אסקי
            4: 'assets/images/prizes/ai-course.png',        // קורס מקוון בנושא AI וחדשנות משפטית
            5: 'assets/images/prizes/seminar.png',          // השתתפות ביום עיון מקצועי
            6: 'assets/images/prizes/podcast.png',          // מינוי חצי שנתי לפודקאסט המשפטי
            7: 'assets/images/prizes/book.png',             // ספר "מהפכת הבוררות"
            8: 'assets/images/prizes/pen-set.png'           // סט עטי יוקרה של הלשכה
        };

        return prizeImages[prizeId] || 'assets/images/prizes/prize-generic.png';
    }

    /**
     * שולח מייל לזוכה
     * @param {Object} user - פרטי המשתמש
     * @param {Object} prize - פרטי הפרס
     * @returns {Promise<Object>} תשובה מהשרת
     */
    async sendWinningEmail(user, prize) {
        if (!user || !user.email) {
            console.error('לא ניתן לשלוח מייל: חסרה כתובת מייל');
            return { success: false, error: 'חסרה כתובת מייל' };
        }

        try {
            // טעינת תבנית המייל
            const template = await this.loadEmailTemplate();
            
            // הכנת הנתונים
            const emailData = this.prepareEmailData(user, prize);
            
            // החלפת המשתנים בתבנית
            const htmlContent = this.replaceTemplateVariables(template, emailData);
            
            // שליחת המייל דרך ה־API
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: user.email,
                    subject: `ברכות! זכית בפרס: ${prize.name} - הלשכת עורכי הדין`,
                    html: htmlContent
                })
            });

            if (!response.ok) {
                throw new Error(`שגיאה בשליחת המייל: ${response.status}`);
            }

            const result = await response.json();
            console.log('המייל נשלח בהצלחה:', result);
            return { success: true, data: result };
        } catch (error) {
            console.error('שגיאה בשליחת המייל:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * בדיקת פונקציונליות שליחת מייל
     * @param {string} testEmail - כתובת מייל לבדיקה
     */
    async testEmailSending(testEmail) {
        if (!testEmail) {
            console.error('נא לספק כתובת מייל לבדיקה');
            return;
        }

        const testUser = {
            name: 'משתמש לבדיקה',
            email: testEmail
        };

        const testPrize = {
            id: 1,
            name: 'ייעוץ משפטי חינם'
        };

        return this.sendWinningEmail(testUser, testPrize);
    }
}

// ייצוא המחלקה לשימוש
export default EmailSender; 