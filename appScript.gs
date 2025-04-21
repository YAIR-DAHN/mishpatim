function doGet(e) {
  const ss = SpreadsheetApp.getActive();
  switch (e.parameter.action) {
    case 'getPrizes':
      return json(getPrizesSheet(ss));
    case 'getSettings':
      return json(getSettings(ss));
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === 'saveWin') {
    return json(saveWin(ss, data.payload));
  }
}

function getPrizesSheet(ss) {
  const sheet = ss.getSheetByName('פרסים');
  const rows = sheet.getDataRange().getValues().slice(1); // דילוג כותרת
  return rows.map(r => ({
    id: r[0], name: r[1], probability: r[2], stock: r[3], distributed: r[4]
  })).filter(p => p.stock > p.distributed); // מחזיר רק פרסים זמינים
}

function saveWin(ss, win) {
  ss.getSheetByName('זוכים').appendRow([
    new Date(), win.userName, win.userEmail, win.prizeId, win.prizeName
  ]);
  // עדכון מימושים
  const prizes = ss.getSheetByName('פרסים');
  const rows = prizes.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === win.prizeId) {
      prizes.getRange(i + 1, 5).setValue(rows[i][4] + 1); // עמודה 5 = מימושים
      break;
    }
  }
  return { success: true };
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('הגדרות');
  const val = sheet.getRange('A2').getValue(); // נניח A1=כותרת, A2=וידאו
  return { idleVideoUrl: val };
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
         .setMimeType(ContentService.MimeType.JSON)
         .setHeader('Access-Control-Allow-Origin', '*')
         .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
         .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// פונקציה לטיפול בבקשות OPTIONS (preflight requests)
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}