/**
 * Zarya Project Management - Google Apps Script Automation
 * This script handles PDF generation from templates and cross-domain data syncing.
 */

const PROJECT_ROOT_ID = "YOUR_PROJECT_ROOT_FOLDER_ID";

/**
 * Generates a PDF from a Google Doc template and saves it to the specified path.
 * @param {Object} data The data to populate the template with.
 * @param {string} templateId The ID of the Google Doc template.
 * @param {string} destinationPath The path in Google Drive to save the PDF.
 * @param {string} fileName The name of the generated PDF file.
 */
function generateZaryaPDF(data, templateId, destinationPath, fileName) {
  const templateFile = DriveApp.getFileById(templateId);
  const tempFile = templateFile.makeCopy("Temp_" + fileName);
  const tempDoc = DocumentApp.openById(tempFile.getId());
  const body = tempDoc.getBody();

  // Replace placeholders in the template
  for (let key in data) {
    body.replaceText("{{" + key + "}}", data[key] || "N/A");
  }

  tempDoc.saveAndClose();

  // Convert to PDF
  const pdfBlob = tempFile.getAs(MimeType.PDF);
  pdfBlob.setName(fileName);

  // Find or create destination folder
  const folder = getOrCreateFolder(destinationPath);
  folder.createFile(pdfBlob);

  // Delete temp file
  DriveApp.getFileById(tempFile.getId()).setTrashed(true);
}

/**
 * Syncs stakeholder data to other registers.
 * @param {Object} stakeholder The stakeholder data.
 */
function syncStakeholderData(stakeholder) {
  // Example: Sync to Team Directory Spreadsheet
  const teamSheetId = "YOUR_TEAM_DIRECTORY_SHEET_ID";
  const sheet = SpreadsheetApp.openById(teamSheetId).getActiveSheet();
  
  // Check if stakeholder already exists
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === stakeholder.name) {
      // Update existing
      sheet.getRange(i + 1, 2).setValue(stakeholder.role);
      sheet.getRange(i + 1, 3).setValue(stakeholder.contactInfo);
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Append new
    sheet.appendRow([stakeholder.name, stakeholder.role, stakeholder.contactInfo]);
  }
}

/**
 * Helper function to get or create a folder path.
 */
function getOrCreateFolder(path) {
  const parts = path.split("/");
  let currentFolder = DriveApp.getFolderById(PROJECT_ROOT_ID);
  
  for (let part of parts) {
    if (!part) continue;
    const folders = currentFolder.getFoldersByName(part);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      currentFolder = currentFolder.createFolder(part);
    }
  }
  return currentFolder;
}
