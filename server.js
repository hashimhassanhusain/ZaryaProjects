// server.ts
import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import AdmZip from "adm-zip";
import { jsPDF } from "jspdf";
import { Readable } from "stream";
var app = express();
var PORT = process.env.PORT || 3e3;
var upload = multer({ dest: "uploads/" });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
var getDriveClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return { error: 'Google Drive OAuth2 Credentials Missing: Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your environment variables.' };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    return { drive, clientEmail: 'OAuth2 Integration' };
  } catch (e) {
    console.error('CRITICAL Drive Init Error:', e.message);
    return { error: `Configuration Error: ${e.message}` };
  }
};
async function createFolder(drive, name, parentId) {
  console.log(`Creating folder: "${name}" (Parent: ${parentId || "ROOT"})`);
  const fileMetadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : []
  };
  const res = await drive.files.create(
    {
      requestBody: fileMetadata,
      fields: "id",
      supportsAllDrives: true
    },
    { timeout: 1e4 }
  );
  return res.data.id;
}
async function createFolderTree(drive, tree, parentId) {
  const folderMap = {};
  if (Array.isArray(tree)) {
    const promises = tree.map(async (item) => {
      if (typeof item === "string") {
        const id = await createFolder(drive, item, parentId);
        return { [item]: id };
      } else {
        return await createFolderTree(drive, item, parentId);
      }
    });
    const results = await Promise.all(promises);
    results.forEach((res) => Object.assign(folderMap, res));
  } else if (typeof tree === "object") {
    const entries = Object.entries(tree);
    const promises = entries.map(async ([folderName, subfolders]) => {
      const currentFolderId = await createFolder(drive, folderName, parentId);
      const localMap = { [folderName]: currentFolderId };
      if (subfolders) {
        const subMap = await createFolderTree(drive, subfolders, currentFolderId);
        Object.assign(localMap, subMap);
      }
      return localMap;
    });
    const results = await Promise.all(promises);
    Object.assign(folderMap, ...results);
  }
  return folderMap;
}
function generateProjectCharterPDF(projectName, projectCode, charterData) {
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.text("PROJECT CHARTER", 105, 20, { align: "center" });
  doc.setFontSize(16);
  doc.text(`${projectCode} - ${projectName}`, 105, 30, { align: "center" });
  doc.setFontSize(12);
  let y = 50;
  if (charterData && Object.keys(charterData).length > 0) {
    Object.entries(charterData).forEach(([key, value]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${key}:`, 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(String(value), 170);
      doc.text(lines, 20, y);
      y += lines.length * 7 + 5;
    });
  } else {
    doc.text("No charter data available.", 20, y);
  }
  doc.setFontSize(10);
  doc.text(`Generated on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`, 105, 285, { align: "center" });
  return Buffer.from(doc.output("arraybuffer"));
}
async function findOrCreateFolderByPath(drive, rootFolderId, pathParts) {
  let currentParentId = rootFolderId;
  console.log(`Ensuring path: ${pathParts.join("/")} starting from root: ${rootFolderId}`);
  for (const part of pathParts) {
    const response = await drive.files.list({
      q: `name = '${part.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    const files = response.data.files;
    if (!files || files.length === 0) {
      console.log(`Folder part not found: "${part}". Creating in parent: ${currentParentId}`);
      try {
        const newFolder = await drive.files.create({
          requestBody: {
            name: part,
            mimeType: "application/vnd.google-apps.folder",
            parents: [currentParentId]
          },
          supportsAllDrives: true
        });
        currentParentId = newFolder.data.id || "";
        if (!currentParentId) return null;
        console.log(`Created folder: "${part}" with ID: ${currentParentId}`);
      } catch (err) {
        console.error(`Error creating folder "${part}":`, err.message);
        return null;
      }
    } else {
      currentParentId = files[0].id;
      console.log(`Found folder: "${part}" with ID: ${currentParentId}`);
    }
  }
  return currentParentId;
}
async function archiveExistingFile(drive, folderId, fileName) {
  try {
    const escapedName = fileName.replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: `name = '${escapedName}' and '${folderId}' in parents and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    const files = response.data.files;
    if (files && files.length > 0) {
      const archiveResponse = await drive.files.list({
        q: `name = 'Archive' and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      let archiveFolderId;
      if (archiveResponse.data.files && archiveResponse.data.files.length > 0) {
        archiveFolderId = archiveResponse.data.files[0].id;
      } else {
        archiveFolderId = await createFolder(drive, "Archive", folderId);
      }
      for (const file of files) {
        const timestamp = (/* @__PURE__ */ new Date()).getTime();
        const newName = `${file.name.split(".").slice(0, -1).join(".")}_v${timestamp}.${file.name.split(".").pop()}`;
        await drive.files.update({
          fileId: file.id,
          addParents: archiveFolderId,
          removeParents: folderId,
          requestBody: {
            name: newName
          },
          fields: "id, parents",
          supportsAllDrives: true
        });
      }
    }
  } catch (error) {
    console.error("Archive failed:", error);
  }
}
app.post("/api/drive/upload-by-path", upload.single("file"), async (req, res) => {
  const { projectRootId, path: path2 } = req.body;
  const file = req.file;
  const { drive, error } = getDriveClient();
  if (error || !drive || !file || !projectRootId || !path2) {
    return res.status(500).json({ error: error || "Missing required parameters" });
  }
  try {
    const pathParts = path2.split("/").filter((p) => p.length > 0);
    const targetFolderId = await findOrCreateFolderByPath(drive, projectRootId, pathParts);
    if (!targetFolderId) {
      console.error(`Folder path creation failed: ${path2} in project: ${projectRootId}`);
      return res.status(500).json({ error: `Could not navigate or create the folder path "${path2}". Please check Google Drive permissions.` });
    }
    await archiveExistingFile(drive, targetFolderId, file.originalname);
    const resDrive = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [targetFolderId]
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path)
      },
      supportsAllDrives: true,
      // @ts-ignore
      uploadType: "multipart"
    });
    fs.unlinkSync(file.path);
    res.json({ fileId: resDrive.data.id, folderId: targetFolderId });
  } catch (error2) {
    console.error("Upload by path failed:", error2);
    const errorMessage = error2.response?.data?.error?.message || error2.message || "Upload failed";
    if (errorMessage.includes("storage quota")) {
      return res.status(403).json({
        error: "System Storage Permission Error: Please ensure the Service Account is added to the Shared Drive as a Manager.",
        details: error2.response?.data?.error?.errors || null
      });
    }
    const errorDetails = error2.response?.data?.error?.errors || null;
    res.status(500).json({
      error: errorMessage,
      details: errorDetails
    });
  }
});
app.post("/api/drive/create-metadata", async (req, res) => {
  const { name, parents, description } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || "Drive client not initialized" });
  try {
    const resDrive = await drive.files.create({
      requestBody: {
        name,
        parents,
        description,
        mimeType: "text/plain"
      },
      media: {
        mimeType: "text/plain",
        body: `ZARYA CLOUD STORAGE FILE

This file is stored in Firebase Cloud Storage for performance and reliability.

Direct Download Link:
${description.replace("FIREBASE_URL:", "")}

Uploaded at: ${(/* @__PURE__ */ new Date()).toISOString()}`
      },
      supportsAllDrives: true
    });
    res.json({ fileId: resDrive.data.id });
  } catch (error2) {
    console.error("Create metadata failed:", error2);
    res.status(500).json({ error: error2.message });
  }
});
app.post("/api/projects/init-drive", async (req, res) => {
  const { projectName, projectCode, charterData, userEmail } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || "Drive client not initialized" });
  try {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const rootFolderName = `[${projectCode}]_${projectName}_Project`;
    console.log(`--- INITIALIZING DRIVE FOR PROJECT: ${projectName} ---`);
    console.log(`Target Parent ID: ${parentFolderId || "ROOT (My Drive)"}`);
    if (parentFolderId === "1veRtpHqs_f8nCDtRMpMa9NqCy1oiBRE0") {
      console.warn("\u26A0\uFE0F WARNING: You are using the My Drive ID. This will likely fail with a Storage Quota error.");
    }
    const rootFolderId = await createFolder(drive, rootFolderName, parentFolderId);
    if (userEmail) {
      try {
        await drive.permissions.create({
          fileId: rootFolderId,
          requestBody: { role: "writer", type: "user", emailAddress: userEmail },
          supportsAllDrives: true
        });
        console.log(`Shared root folder with ${userEmail}`);
      } catch (permErr) {
        console.warn(`Could not share folder with ${userEmail}:`, permErr.message);
      }
    }
    const folderTree = {
      "ADMIN_AND_CORRESPONDENCE_00": [
        { "00.1_Incoming_Correspondence": ["Emails", "Letters"] },
        { "00.2_Outgoing_Correspondence": ["Transmittals", "RFIs", "Letters_Sent"] },
        { "00.3_Legal_and_Contracts": ["Client_Main_Contract"] }
      ],
      "01_PROJECT_MANAGEMENT_FORMS": [
        { "1.0_Initiating": ["1.1_Governance_Domain", "1.2_Scope_Domain", "1.3_Schedule_Domain", "1.4_Finance_Domain", "1.5_Stakeholders_Domain", "1.6_Resources_Domain", "1.7_Risk_Domain"] },
        { "2.0_Planning": [
          { "2.1_Governance_Domain": ["2.1.1_CHANGE_MANAGEMENT_PLAN", "2.1.2_PROJECT_MANAGEMENT_PLAN", "2.1.3_QUALITY_MANAGEMENT_PLAN"] },
          "2.2_Scope_Domain",
          "2.3_Schedule_Domain",
          "2.4_Finance_Domain",
          "2.5_Stakeholders_Domain",
          "2.6_Resources_Domain",
          "2.7_Risk_Domain"
        ] },
        { "3.0_Executing": ["3.1_Governance_Domain", "3.2_Scope_Domain", "3.3_Schedule_Domain", "3.4_Finance_Domain", "3.5_Stakeholders_Domain", "3.6_Resources_Domain", "3.7_Risk_Domain"] },
        { "4.0_Monitoring_and_Controlling": ["4.1_Governance_Domain", "4.2_Scope_Domain", "4.3_Schedule_Domain", "4.4_Finance_Domain", "4.5_Stakeholders_Domain", "4.6_Resources_Domain", "4.7_Risk_Domain"] },
        { "5.0_Closing": ["5.1_Governance_Domain", "5.2_Scope_Domain", "5.3_Schedule_Domain", "5.4_Finance_Domain", "5.5_Stakeholders_Domain", "5.6_Resources_Domain", "5.7_Risk_Domain"] }
      ],
      "TECHNICAL_DIVISIONS_MASTERFORMAT_02": [
        { "Division_03_Concrete": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_04_Masonry": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_22_Plumbing": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_23_HVAC": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_26_Electrical": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_27_Communications": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_31_Earthwork": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] }
      ],
      "PROCUREMENT_AND_SUBCONTRACTORS_03": [
        "03.1_Vendors_and_Suppliers_Database",
        "03.2_Purchase_Orders_PO",
        { "03.3_Subcontractors_Hub": [
          { "Div_01_General_Requirements": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_02_Existing_Conditions": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_03_Concrete": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_04_Masonry": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_05_Metals": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_06_Wood_and_Plastics": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_07_Thermal_and_Moisture": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_08_Openings": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_09_Finishes": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_10_Specialties": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_11_Equipment": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_12_Furnishings": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_13_Special_Construction": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_14_Conveying_Equipment": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_22_Plumbing": ["01_RFQ", "02_PO", "03_Contracts"] },
          { "Div_26_Electrical": ["01_RFQ", "02_PO", "03_Contracts"] }
        ] }
      ],
      "SITE_OPERATIONS_04": [
        "04.1_Daily_Site_Reports",
        "04.2_Progress_Photos_and_Videos",
        { "04.3_HSE_and_Safety": ["Safety_Reports", "Incident_Logs"] }
      ],
      "MEETINGS_LOG_05": [
        "05.1_Client_Meetings",
        "05.2_Internal_Technical_Meetings",
        "05.3_Subcontractor_Meetings"
      ]
    };
    const folderMap = await createFolderTree(drive, folderTree, rootFolderId);
    console.log("Successfully created folder tree for project:", projectName);
    console.log("Folder Map Keys:", Object.keys(folderMap));
    const adminFolderId = folderMap["ADMIN_AND_CORRESPONDENCE_00"];
    if (adminFolderId) {
      console.log("Admin folder found:", adminFolderId);
      try {
        console.log("Generating Project Charter PDF...");
        const pdfBuffer = generateProjectCharterPDF(projectName, projectCode, charterData);
        console.log("PDF Buffer generated, size:", pdfBuffer.length);
        const fileName = `Project_Charter_${projectCode}.pdf`;
        console.log(`Uploading PDF "${fileName}" to folder ${adminFolderId}...`);
        const uploadRes = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [adminFolderId]
          },
          media: {
            mimeType: "application/pdf",
            body: Readable.from(pdfBuffer)
          },
          supportsAllDrives: true,
          // @ts-ignore
          uploadType: "multipart"
        });
        console.log("Project Charter PDF uploaded successfully, file ID:", uploadRes.data.id);
      } catch (pdfError) {
        console.error("Error during PDF generation/upload:", pdfError.message);
      }
    } else {
      console.warn("ADMIN_AND_CORRESPONDENCE_00 folder not found in folderMap");
    }
    res.json({ rootFolderId });
  } catch (error2) {
    console.error("Failed to create folder tree:", error2);
    const errorMessage = error2.response?.data?.error?.message || error2.message || "Failed to create folder tree";
    res.status(500).json({ error: errorMessage });
  }
});
app.post("/api/admin/backup-code", async (req, res) => {
  console.log("Starting codebase backup process...");
  const { drive, error } = getDriveClient();
  if (error || !drive) {
    console.error("Backup failed:", error);
    return res.status(500).json({ error: error || "Google Drive client not initialized." });
  }
  const backupFolderId = process.env.GOOGLE_DRIVE_CODE_BACKUP_FOLDER_ID;
  if (!backupFolderId) {
    console.error("Backup failed: GOOGLE_DRIVE_CODE_BACKUP_FOLDER_ID is missing.");
    return res.status(400).json({ error: "Backup folder ID is missing in environment variables." });
  }
  try {
    const zip = new AdmZip();
    const filesToInclude = [
      "server.ts",
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "index.html",
      ".env.example",
      "metadata.json",
      "firebase-blueprint.json",
      "firestore.rules"
    ];
    console.log("Zipping files...");
    filesToInclude.forEach((file) => {
      if (fs.existsSync(file)) {
        zip.addLocalFile(file);
        console.log(`Added to zip: ${file}`);
      }
    });
    if (fs.existsSync("src")) {
      zip.addLocalFolder("src", "src");
      console.log("Added src folder to zip");
    }
    const zipBuffer = zip.toBuffer();
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleString("en-GB", { timeZone: "UTC" }).replace(/[/, :]/g, "-");
    const fileName = `PMIS_Source_Backup_${timestamp}.zip`;
    console.log(`Uploading ${fileName} to Drive folder: ${backupFolderId}`);
    const tempPath = path.join(process.cwd(), "temp_backup.zip");
    fs.writeFileSync(tempPath, zipBuffer);
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [backupFolderId]
      },
      media: {
        mimeType: "application/zip",
        body: fs.createReadStream(tempPath)
      },
      fields: "id, name",
      supportsAllDrives: true,
      // @ts-ignore
      uploadType: "multipart"
    });
    fs.unlinkSync(tempPath);
    console.log("Backup successful! File ID:", response.data.id);
    res.json({
      success: true,
      fileId: response.data.id,
      fileName: response.data.name
    });
  } catch (error2) {
    console.error("Backup process crashed:", error2);
    const message = error2.response?.data?.error?.message || error2.message || "Unknown backup error";
    res.status(500).json({ error: `Backup failed: ${message}` });
  }
});
app.post("/api/admin/test-drive", async (req, res) => {
  const { drive, clientEmail, error } = getDriveClient();
  if (error || !drive) {
    return res.status(500).json({ error: error || "Google Drive client not initialized." });
  }
  try {
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    if (!parentId) {
      return res.status(400).json({ error: "GOOGLE_DRIVE_PARENT_FOLDER_ID is missing in environment variables." });
    }
    const folder = await drive.files.get(
      {
        fileId: parentId,
        supportsAllDrives: true
      },
      { timeout: 1e4 }
    );
    const auth = drive.context._options.auth;
    const clientEmail2 = auth?.credentials?.client_email || "OAuth2 Integration (Refresh Token Active)";
    res.json({
      success: true,
      folderName: folder.data.name,
      clientEmail: clientEmail2
    });
  } catch (error2) {
    console.error("Test Drive Connection failed:", error2);
    const message = error2.response?.data?.error?.message || error2.message || "Unknown connection error";
    res.status(500).json({ error: `Connection failed: ${message}` });
  }
});
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const { folderId } = req.body;
  const file = req.file;
  const { drive, error } = getDriveClient();
  if (error || !drive || !file) return res.status(500).json({ error: error || "Drive client or file missing" });
  try {
    const resDrive = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [folderId]
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path)
      },
      supportsAllDrives: true,
      // @ts-ignore
      uploadType: "multipart"
    });
    fs.unlinkSync(file.path);
    res.json({ fileId: resDrive.data.id });
  } catch (error2) {
    console.error("Upload failed:", error2);
    res.status(500).json({ error: "Upload failed" });
  }
});
app.get("/api/drive/folders-recursive/:folderId", async (req, res) => {
  const { folderId } = req.params;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || "Drive client not initialized" });
  try {
    const folders = [];
    async function collectFolders(currentId, currentPath = "", parentId = null) {
      const response = await drive.files.list({
        // Optimization: only get specific fields
        q: `'${currentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        // Optimization: larger page size if many folders
        pageSize: 1e3
      });
      if (response.data.files) {
        for (const f of response.data.files) {
          const folderPath = currentPath ? `${currentPath}/${f.name}` : f.name;
          folders.push({ id: f.id, name: f.name, path: folderPath, parentId: currentId });
          await collectFolders(f.id, folderPath, currentId);
        }
      }
    }
    const initialResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    if (initialResponse.data.files) {
      const initialFolders = initialResponse.data.files;
      const promises = initialFolders.map((f) => {
        const folderPath = f.name;
        folders.push({ id: f.id, name: f.name, path: folderPath, parentId: folderId });
        return collectFolders(f.id, folderPath, folderId);
      });
      await Promise.all(promises);
    }
    res.json({ folders });
  } catch (error2) {
    console.error("Failed to list folders recursively:", error2);
    res.status(500).json({ error: "Failed to list folders recursively" });
  }
});
app.get("/api/drive/files/:folderId", async (req, res) => {
  const { folderId } = req.params;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || "Drive client not initialized" });
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size, webViewLink, iconLink, modifiedTime, createdTime, version, description, lastModifyingUser(displayName, photoLink))",
      orderBy: "folder,name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    res.json({ files: response.data.files });
  } catch (error2) {
    console.error("Failed to list files:", error2);
    res.status(500).json({ error: "Failed to list files" });
  }
});
app.get("/api/admin/drive-status", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  res.json({
    isConfigured: !!clientId && !!refreshToken,
    hasParentFolder: !!parentId,
    parentFolderId: parentId
  });
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});
async function startServer() {
  console.log("--- ZARYA SERVER STARTING ---");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    (async () => {
      try {
        console.log("Running background connection test...");
        const { drive, error } = getDriveClient();
        if (drive) {
          const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
          if (parentId) {
            const folder = await drive.files.get(
              {
                fileId: parentId,
                supportsAllDrives: true
              },
              { timeout: 1e4 }
            );
            console.log("\u2705 Background connection test successful. Parent folder:", folder.data.name);
          } else {
            console.warn("\u26A0\uFE0F GOOGLE_DRIVE_PARENT_FOLDER_ID not set.");
          }
        } else {
          console.warn("\u26A0\uFE0F Google Drive client not initialized:", error);
        }
      } catch (e) {
        console.error("\u274C Background connection test failed:", e.message);
      }
    })();
  });
}
startServer();
