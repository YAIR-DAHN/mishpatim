/**
 * doGet – שליפת נתונים
 *   GET .../exec?action=getPrizes     → רשימת פרסים
 *   GET .../exec?action=getSettings   → הגדרות
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActive();
  let data = {};
  try {
    switch (e.parameter.action) {
      case 'getPrizes':
        data = getPrizesSheet(ss);
        break;
      case 'getSettings':
        data = getSettings(ss);
        break;
      default:
        data = { error: 'פעולה לא ידועה' };
    }
  } catch (err) {
    data = { error: err.toString() };
  }
  return ContentService
           .createTextOutput(JSON.stringify(data))
           .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost – שמירת זכייה
 *   POST plain‑text body: { "action":"saveWin", "payload":{...} }
 */
function doPost(e) {
  let data = {};
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'saveWin') {
      data = saveWin(SpreadsheetApp.getActive(), body.payload);
    } else {
      data = { error: 'פעולה לא ידועה בבקשת POST' };
    }
  } catch (err) {
    data = { error: err.toString() };
  }
  return ContentService
           .createTextOutput(JSON.stringify(data))
           .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- פונקציות‑עזר ללא שינוי משמעותי ---------- */

function getPrizesSheet(ss) {
  const sheet = ss.getSheetByName('פרסים');
  if (!sheet) return [];
  
  // החזרת כל הפרסים, כולל אלה שאזלו מהמלאי
  return sheet.getDataRange().getValues().slice(1).map(r => {
    const stock = r[3] || 0;
    const distributed = r[4] || 0;
    
    return {
      id: r[0],
      name: r[1],
      probability: r[2] || 0,  // הסתברות ברירת מחדל 0
      stock: stock,
      distributed: distributed,
      isOutOfStock: stock <= distributed  // שדה חדש שמציין האם הפרס אזל
    };
  });
}

/**
 * קונפיגורציה של MailerSend
 */
const MAILERSEND_CONFIG = {
  API_KEY: "mlsn.e91ad7e60b9d79dcb61d2e0a2a818692ec4d4a8d2ea69083596bbc65b0704a36",
  FROM_EMAIL: "noreply@test-nrw7gymmewjg2k8e.mlsender.net", // דומיין מאומת
  FROM_NAME: "הוצאה לאור - לשכת עורכי הדין"
};

/**
 * שליחת מייל למשתמש עם פרטי הזכייה דרך MailerSend
 */
function sendWinningEmail(userEmail, userName, prizeName) {
  var subject = "מזל טוב! זכית ב" + prizeName + " 🎉";
  var html = `
    <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h1 style="color:#1e3a8a;">מזל טוב ${userName}!</h1>
      <p>שמחים לבשר לך שזכית בהגרלה שלנו!</p>
      <div style="background:#fff;padding:16px;border-radius:8px;margin:20px 0;">
        <h2>הפרס שלך:</h2>
        <h3>${prizeName}</h3>
      </div>
      <p>פרטי מימוש הפרס:</p>
      <ul>
        <li>ניתן לממש את הפרס במהלך הכנס</li>
        <li>יש להציג מייל זה בדוכן ההוצאה לאור</li>
        <li>תוקף המימוש: 30 יום מיום קבלת המייל</li>
      </ul>
      <p>לשאלות ובירורים: <a href="mailto:support@lawpub.odoo.com">support@lawpub.odoo.com</a> | 03-6368222</p>
      <div style="color:#6b7280;font-size:0.9em;margin-top:24px;">© הוצאה לאור של לשכת עורכי הדין בע\"מ 2024</div>
    </div>
  `;

  var payload = {
    from: {
      email: MAILERSEND_CONFIG.FROM_EMAIL,
      name: MAILERSEND_CONFIG.FROM_NAME
    },
    to: [
      {
        email: userEmail,
        name: userName
      }
    ],
    subject: subject,
    html: html,
    text: "מזל טוב " + userName + "! זכית ב" + prizeName + "."
  };

  var options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      "Authorization": "Bearer " + MAILERSEND_CONFIG.API_KEY
    },
    payload: JSON.stringify(payload)
  };

  try {
    var response = UrlFetchApp.fetch("https://api.mailersend.com/v1/email", options);
    var code = response.getResponseCode();
    var content = response.getContentText();
    Logger.log("MailerSend response code: " + code);
    Logger.log("MailerSend response: " + content);

    if (code === 202) {
      return { success: true, message: "המייל נשלח בהצלחה!" };
    } else {
      return { success: false, error: "שגיאה בשליחת המייל: " + content };
    }
  } catch (e) {
    Logger.log("שגיאה בשליחת המייל: " + e);
    return { success: false, error: e.toString() };
  }
}

function saveWin(ss, win) {
  Logger.log('התקבלה בקשה לשמירת זכייה:', win);

  if (!win || !win.userName || !win.prizeName) {
    Logger.log('נתונים חסרים:', win);
    return { success:false, error:'נתונים חסרים' };
  }

  const winners = ss.getSheetByName('זוכים');
  if (!winners) {
    Logger.log('גיליון הזוכים לא נמצא');
    return { success:false, error:'גיליון הזוכים לא נמצא' };
  }

  try {
    // שמירת הזכייה בגיליון
    winners.appendRow([
      new Date(),
      win.userName,
      win.userPhone,
      win.userEmail || '',
      win.prizeId  || 0,
      win.prizeName
    ]);

    Logger.log('הזכייה נשמרה בגיליון בהצלחה');

    // עדכון מלאי הפרס
    if (win.prizeId) {
      const prizes = ss.getSheetByName('פרסים');
      if (prizes) {
        const rows = prizes.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === win.prizeId) {
            prizes.getRange(i + 1, 5).setValue((rows[i][4] || 0) + 1);
            Logger.log('המלאי עודכן בהצלחה לפרס:', win.prizeId);
            break;
          }
        }
      }
    }

    // שליחת מייל לזוכה
    if (win.userEmail) {
      Logger.log('מתחיל תהליך שליחת מייל...');
      var emailResult = sendWinningEmail(win.userEmail, win.userName, win.prizeName);
      Logger.log('תוצאת שליחת המייל:', emailResult);
      if (!emailResult.success) {
        Logger.log('שגיאה בשליחת המייל:', emailResult.error);
        // נחזיר שגיאה ללקוח!
        return { success: false, error: emailResult.error };
      }
    } else {
      Logger.log('לא נשלח מייל - אין כתובת מייל');
    }

    return { success:true, id:Date.now() };
  } catch (error) {
    Logger.log('שגיאה בשמירת הזכייה:', error);
    return { success:false, error: error.toString() };
  }
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('הגדרות');
  if (!sheet) return { idleVideoUrl:'' };
  return { idleVideoUrl: sheet.getRange('A2').getValue() || '' };
}
