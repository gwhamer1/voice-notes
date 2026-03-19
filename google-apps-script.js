// ============================================================
// VOICE NOTES → GOOGLE SHEETS
// Paste this entire file into Google Apps Script (Extensions > Apps Script)
// Then: Deploy > New deployment > Web app > Anyone > Deploy
// Copy the URL and paste into Vercel env var: GOOGLE_SHEETS_WEBHOOK
// ============================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Map project names (or keywords) to sheet tab names
// Add your own mappings here — case insensitive matching
const PROJECT_MAP = {
  'sps': 'SPS',
  'sustainable paving': 'SPS',
  'paving stones': 'SPS',
  'pickleball': 'Pickleball Body',
  'pickleball body': 'Pickleball Body',
  'roof': 'Roof Leads',
  'roof leads': 'Roof Leads',
  'ail': 'AIL',
  'adventuring into life': 'AIL',
  'gp scoop': 'GP Scoop',
  'grande prairie': 'GP Scoop',
  'general': 'General',
};

const HEADERS = ['Timestamp', 'Project', 'Title', 'Summary', 'Action Items', 'Raw Transcript'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // Determine which tab to write to
    const tabName = resolveTab(data.project);
    const sheet = getOrCreateSheet(ss, tabName);

    // Append the row
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.project || 'General',
      data.title || '',
      data.summary || '',
      data.action_items || '',
      data.transcript || '',
    ]);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, 6);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, tab: tabName }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function resolveTab(project) {
  if (!project) return 'General';
  const key = project.toLowerCase().trim();
  for (const [k, v] of Object.entries(PROJECT_MAP)) {
    if (key.includes(k)) return v;
  }
  // If no match, use the project name as-is (creates a new tab)
  return project;
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Add headers on first creation
    const headerRow = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRow.setValues([HEADERS]);
    headerRow.setFontWeight('bold');
    headerRow.setBackground('#1a1a1a');
    headerRow.setFontColor('#e8ff5a');
    sheet.setFrozenRows(1);
    // Set column widths
    sheet.setColumnWidth(1, 160); // Timestamp
    sheet.setColumnWidth(2, 120); // Project
    sheet.setColumnWidth(3, 200); // Title
    sheet.setColumnWidth(4, 300); // Summary
    sheet.setColumnWidth(5, 250); // Action Items
    sheet.setColumnWidth(6, 300); // Raw Transcript
  }
  return sheet;
}

// Test function — run this manually to verify setup
function testWrite() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'General');
  sheet.appendRow([
    new Date().toISOString(),
    'General',
    'Test note',
    'This is a test bullet\nAnother bullet',
    'Follow up on test',
    'This is a test transcript from the Apps Script setup.',
  ]);
  Logger.log('Test row written to General tab.');
}
