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

function saveWin(ss, win) {
  if (!win || !win.userName || !win.prizeName)
    return { success:false, error:'נתונים חסרים' };

  const winners = ss.getSheetByName('זוכים');
  if (!winners) return { success:false, error:'גיליון הזוכים לא נמצא' };

  winners.appendRow([
    new Date(),
    win.userName,
    win.userPhone,
    win.userEmail || '',
    win.prizeId  || 0,
    win.prizeName
  ]);

  if (win.prizeId) {
    const prizes = ss.getSheetByName('פרסים');
    if (prizes) {
      const rows = prizes.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === win.prizeId) {
          prizes.getRange(i + 1, 5).setValue((rows[i][4] || 0) + 1);
          break;
        }
      }
    }
  }
  return { success:true, id:Date.now() };
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('הגדרות');
  if (!sheet) return { idleVideoUrl:'' };
  return { idleVideoUrl: sheet.getRange('A2').getValue() || '' };
}
