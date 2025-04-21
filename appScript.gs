/**
 * טיפול בבקשות GET
 * משמש לקבלת נתונים
 */
function doGet(e) {
  // הגדרת כותרות CORS
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // הוספת כותרות CORS לכל תשובה
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', '*');
  
  const ss = SpreadsheetApp.getActive();
  let data = {};
  
  try {
    // טיפול בפעולות השונות
    if (e.parameter.action === 'getPrizes') {
      data = getPrizesSheet(ss);
    } else if (e.parameter.action === 'getSettings') {
      data = getSettings(ss);
    } else {
      data = { error: "פעולה לא ידועה" };
    }
  } catch (error) {
    data = { error: error.toString() };
  }
  
  output.setContent(JSON.stringify(data));
  return output;
}

/**
 * טיפול בבקשות POST
 * משמש לשמירת נתונים
 */
function doPost(e) {
  // הגדרת כותרות CORS
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // הוספת כותרות CORS לכל תשובה
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', '*');
  
  const ss = SpreadsheetApp.getActive();
  let data = {};
  
  try {
    // קריאת נתוני הבקשה
    let payload;
    
    if (e.parameter.action === 'saveWin' && e.postData && e.postData.contents) {
      // מנסה לקרוא מהפרמטר action והתוכן
      payload = JSON.parse(e.postData.contents);
      data = saveWin(ss, payload.payload || e.parameter);
    } else if (e.postData && e.postData.contents) {
      // קריאה מהתוכן בלבד
      payload = JSON.parse(e.postData.contents);
      if (payload.action === 'saveWin') {
        data = saveWin(ss, payload.payload);
      } else {
        data = { error: "פעולה לא ידועה בבקשת POST" };
      }
    } else {
      data = { error: "לא התקבל תוכן תקין" };
    }
  } catch (error) {
    data = { error: error.toString() };
  }
  
  output.setContent(JSON.stringify(data));
  return output;
}

/**
 * טיפול בבקשות OPTIONS
 * משמש לתמיכה ב-CORS preflight
 */
function doOptions(e) {
  // הגדרת כותרות CORS מלאה
  const output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  
  // הגדרת הרשאות מורחבות
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', '*');
  output.setHeader('Access-Control-Max-Age', '3600');
  
  return output;
}

/**
 * פונקציה לשליפת פרסים מהגיליון
 */
function getPrizesSheet(ss) {
  const sheet = ss.getSheetByName('פרסים');
  if (!sheet) {
    return [];
  }
  
  const rows = sheet.getDataRange().getValues().slice(1); // דילוג כותרת
  return rows.map(r => ({
    id: r[0], 
    name: r[1], 
    probability: r[2], 
    stock: r[3] || 1, 
    distributed: r[4] || 0
  })).filter(p => (p.stock || 1) > (p.distributed || 0)); // מחזיר רק פרסים זמינים
}

/**
 * פונקציה לשמירת נתוני זכייה
 */
function saveWin(ss, win) {
  if (!win || !win.userName || !win.prizeName) {
    return { success: false, error: "נתונים חסרים" };
  }
  
  try {
    const winnersSheet = ss.getSheetByName('זוכים');
    if (!winnersSheet) {
      return { success: false, error: "גיליון הזוכים לא נמצא" };
    }
    
    // הוספת שורה חדשה עם נתוני הזכייה
    winnersSheet.appendRow([
      new Date(), 
      win.userName, 
      win.userEmail || "", 
      win.prizeId || 0, 
      win.prizeName
    ]);
    
    // עדכון מספר המימושים של הפרס
    try {
      // עדכון מימושים רק אם יש מזהה פרס תקין
      if (win.prizeId) {
        const prizes = ss.getSheetByName('פרסים');
        if (prizes) {
          const rows = prizes.getDataRange().getValues();
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === win.prizeId) {
              prizes.getRange(i + 1, 5).setValue((rows[i][4] || 0) + 1); // עמודה 5 = מימושים
              break;
            }
          }
        }
      }
    } catch (e) {
      // במקרה של שגיאה בעדכון המימושים, נמשיך בלי להפסיק את השמירה
      console.error("שגיאה בעדכון מימושים: " + e);
    }
    
    return { success: true, id: new Date().getTime() };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * פונקציה לשליפת הגדרות
 */
function getSettings(ss) {
  try {
    const sheet = ss.getSheetByName('הגדרות');
    if (!sheet) {
      return { idleVideoUrl: '' };
    }
    
    const range = sheet.getRange('A2');
    if (!range) {
      return { idleVideoUrl: '' };
    }
    
    const val = range.getValue() || ''; // נניח A1=כותרת, A2=וידאו
    return { idleVideoUrl: val };
  } catch (error) {
    return { idleVideoUrl: '', error: error.toString() };
  }
}