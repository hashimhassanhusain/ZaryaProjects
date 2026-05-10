import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import AdmZip from 'adm-zip';
import { jsPDF } from 'jspdf';
import { Readable } from 'stream';

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// Enhanced Folder Cache with creation promises to prevent race conditions
const FOLDER_CREATE_PROMISES = new Map<string, Promise<string | null>>();

let lastDriveError: string | null = null;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Logger for API requests to help debug background failures
app.use('/api', (req, res, next) => {
  console.log(`📡 [API] ${req.method} ${req.path} - Timestamp: ${new Date().toISOString()}`);
  next();
});

// Google Drive Auth (OAuth 2.0 version)
const getDriveClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

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

    // Handle token refresh events for debugging
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        console.log('New refresh token received');
      }
      console.log('Access token refreshed');
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    lastDriveError = null; // Clear error on success initialization (though we haven't tested connection yet)
    return { drive, docs, clientEmail: 'OAuth2 Integration' };
  } catch (e: any) {
    lastDriveError = e.message;
    console.error('CRITICAL Drive Init Error:', e.message);
    return { error: `Configuration Error: ${e.message}` };
  }
};

// Drive Status/Test Endpoints
app.get('/api/drive/status', (req: any, res: any) => {
  const { error } = getDriveClient();
  res.json({
    initialized: !error,
    auth_type: 'OAuth2',
    parent_folder_id: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 'UNSET',
    last_error: error || lastDriveError,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/pr/manage-folder', async (req: any, res: any) => {
  const { prNumber, prName } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const folderName = `${prNumber}_${prName}`;
    const folderId = await createFolder(drive, folderName, parentId);
    
    // Get view link
    const folder = await drive.files.get({ fileId: folderId, fields: 'webViewLink', supportsAllDrives: true });
    
    res.json({ folderId, folderUrl: folder.data.webViewLink });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pr/upload-file', upload.single('file'), async (req: any, res: any) => {
  const { folderId } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });
  if (!req.file || !folderId) return res.status(400).json({ error: 'File or folderId missing' });

  try {
    const fileMetadata = { name: req.file.originalname, parents: [folderId] };
    const media = { mimeType: req.file.mimetype, body: fs.createReadStream(req.file.path) };
    const file = await drive.files.create({ requestBody: fileMetadata, media, fields: 'id', supportsAllDrives: true });
    
    // Clean up
    fs.unlinkSync(req.file.path);
    
    res.json({ fileId: file.data.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pr/list-files/:folderId', async (req: any, res: any) => {
  const { folderId } = req.params;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink, mimeType)',
      supportsAllDrives: true,
    });
    res.json({ files: listRes.data.files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-sow-doc', async (req: any, res: any) => {
  const { title, prNumber, prName } = req.body;
  const { docs, error } = getDriveClient();
  if (error || !docs) return res.status(500).json({ error: error || 'Drive/Docs client not initialized' });

  try {
    const documentName = `${prNumber} - Scope of Work - ${prName}`;
    const doc = await docs.documents.create({
      requestBody: {
        title: documentName,
      },
    });

    const docId = doc.data.documentId!;

    const requests = [
        { insertText: { text: 'Substrate Preparation\n\n', location: { index: 1 } } },
        { insertText: { text: 'Material and Application\n\n', location: { index: 1 } } },
        { insertText: { text: 'Water Supply / Resources\n\n', location: { index: 1 } } },
        { insertText: { text: 'Curing & Quality Control\n\n', location: { index: 1 } } },
        { insertText: { text: 'Safety & Scaffolding\n\n', location: { index: 1 } } },
        { insertText: { text: 'Project Duration & Milestones\n\n', location: { index: 1 } } },
    ];

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }, 
    });

    res.json({ docUrl: `https://docs.google.com/document/d/${docId}/edit` });
  } catch (error: any) {
    console.error('Doc generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drive/test-connection', async (req: any, res: any) => {
  const { drive, error } = getDriveClient();
  if (error || !drive) {
    return res.status(500).json({ error: error || 'DRIVE_CLIENT_INIT_FAILED' });
  }

  try {
    // List first 3 files in the parent folder to test read access
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const listRes = await drive.files.list({
      q: parentId ? `'${parentId}' in parents and trashed = false` : 'trashed = false',
      pageSize: 3,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    res.json({ 
      success: true, 
      message: 'Successfully listed files from Drive',
      count: listRes.data.files?.length || 0,
      sample_files: listRes.data.files?.slice(0, 3)
    });
  } catch (err: any) {
    lastDriveError = err.message;
    console.error('Connection test failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Recursive folder creation
async function createFolder(drive: any, name: string, parentId?: string) {
  console.log(`Creating folder: "${name}" (Parent: ${parentId || 'ROOT'})`);
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : [],
  };
  const res = await drive.files.create(
    {
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    },
    { timeout: 10000 }
  );
  return res.data.id;
}

async function createFolderTree(drive: any, tree: any, parentId?: string): Promise<Record<string, string>> {
  const folderMap: Record<string, string> = {};
  
  if (Array.isArray(tree)) {
    // For arrays, we can parallelize creation of items
    const promises = tree.map(async (item) => {
      if (typeof item === 'string') {
        const id = await createFolder(drive, item, parentId);
        return { [item]: id };
      } else {
        return await createFolderTree(drive, item, parentId);
      }
    });
    const results = await Promise.all(promises);
    results.forEach(res => Object.assign(folderMap, res));
  } else if (typeof tree === 'object') {
    // For objects, we parallelize the creation of each entry
    const entries = Object.entries(tree);
    const promises = entries.map(async ([folderName, subfolders]) => {
      const currentFolderId = await createFolder(drive, folderName, parentId);
      const localMap: Record<string, string> = { [folderName]: currentFolderId };
      
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

function generateProjectCharterPDF(projectName: string, projectCode: string, charterData: any) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.text('PROJECT CHARTER', 105, 20, { align: 'center' });
  
  // Project Info
  doc.setFontSize(16);
  doc.text(`${projectCode} - ${projectName}`, 105, 30, { align: 'center' });
  
  // Content
  doc.setFontSize(12);
  let y = 50;
  
  if (charterData && Object.keys(charterData).length > 0) {
    Object.entries(charterData).forEach(([key, value]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${key}:`, 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(value), 170);
      doc.text(lines, 20, y);
      y += (lines.length * 7) + 5;
    });
  } else {
    doc.text('No charter data available.', 20, y);
  }
  
  // Footer
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

async function findOrCreateFolderByPath(drive: any, rootFolderId: string, pathParts: string[]): Promise<string | null> {
  const fullPathKey = `${rootFolderId}/${pathParts.join('/')}`;
  
  if (FOLDER_CREATE_PROMISES.has(fullPathKey)) {
    return FOLDER_CREATE_PROMISES.get(fullPathKey)!;
  }

  const creationPromise = (async () => {
    let currentParentId = rootFolderId;
    
    for (const part of pathParts) {
      const response = await drive.files.list({
        // @ts-ignore
        q: `name = '${part.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files;
      if (files && files.length > 0) {
        currentParentId = files[0].id!;
      } else {
        const newFolder = await drive.files.create({
          requestBody: {
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [currentParentId],
          },
          supportsAllDrives: true,
        });
        currentParentId = newFolder.data.id!;
      }
    }
    return currentParentId;
  })();

  FOLDER_CREATE_PROMISES.set(fullPathKey, creationPromise);
  return creationPromise;
}

async function archiveExistingFile(drive: any, folderId: string, fileName: string) {
  try {
    // 1. Find existing file with same name (escape single quotes)
    const escapedName = fileName.replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: `name = '${escapedName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const files = response.data.files;
    if (files && files.length > 0) {
      // 2. Ensure Archive folder exists
      const archiveResponse = await drive.files.list({
        q: `name = 'Archive' and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      
      let archiveFolderId;
      if (archiveResponse.data.files && archiveResponse.data.files.length > 0) {
        archiveFolderId = archiveResponse.data.files[0].id;
      } else {
        archiveFolderId = await createFolder(drive, 'Archive', folderId);
      }
      
      // 3. Move existing files to Archive and rename them with timestamp
      for (const file of files) {
        const timestamp = new Date().getTime();
        const newName = `${file.name.split('.').slice(0, -1).join('.')}_v${timestamp}.${file.name.split('.').pop()}`;
        
        await drive.files.update({
          fileId: file.id,
          addParents: archiveFolderId,
          removeParents: folderId,
          requestBody: {
            name: newName
          },
          fields: 'id, parents',
          supportsAllDrives: true,
        });
      }
    }
  } catch (error) {
    console.error('Archive failed:', error);
  }
}

// API Routes
app.post('/api/drive/upload-by-path', upload.single('file'), async (req: any, res: any) => {
  const { projectRootId, path } = req.body;
  const file = req.file;
  
  console.log('--- DRIVE UPLOAD START ---');
  console.log(`File: ${file?.originalname}, ProjectRoot: ${projectRootId}, Path: ${path}`);
  
  const { drive, error } = getDriveClient();
  
  if (error || !drive) {
    console.error('❌ Drive Client Error:', error);
    return res.status(500).json({ error: error || 'Google Drive client not initialized' });
  }

  if (!file) {
    console.error('❌ No file received by Multer');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!projectRootId || !path) {
    console.error('❌ Missing projectRootId or path');
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const pathParts = path.split('/').filter((p: string) => p.length > 0);
    console.log(`Resolving path chain: ${pathParts.join(' > ')}`);
    
    const targetFolderId = await findOrCreateFolderByPath(drive, projectRootId, pathParts);
    
    if (!targetFolderId) {
      console.error(`❌ Folder path creation failed: ${path}`);
      return res.status(500).json({ error: `Could not navigate or create the folder path "${path}". Please check parent folder permissions and API quota.` });
    }

    console.log(`✅ Target folder resolved: ${targetFolderId}. Archiving existing version (if any)...`);
    // Attempt archive but don't let it block indefinitely
    try {
      await Promise.race([
        archiveExistingFile(drive, targetFolderId, file.originalname),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Archive timeout')), 15000))
      ]);
    } catch (archiveErr) {
      console.warn('⚠️ Archive operation skipped or timed out:', archiveErr instanceof Error ? archiveErr.message : archiveErr);
    }

    console.log(`🚀 Sending file stream to Google Drive...`);
    const resDrive = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
      supportsAllDrives: true,
      fields: 'id, name, webViewLink',
    });
    
    console.log('✨ Drive Upload Successful. File ID:', resDrive.data.id);
    
    if (fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    
    res.json({ 
      success: true, 
      fileId: resDrive.data.id, 
      folderId: targetFolderId 
    });
  } catch (err: any) {
    console.error('❌ Upload by path failed:', err);
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    
    const errorMessage = err.response?.data?.error?.message || err.message || 'Upload failed';
    
    if (errorMessage.includes('storage quota')) {
      return res.status(403).json({ 
        error: "Google Drive Storage Error: Please ensure you have space and the OAuth app has writing permissions to the target folder.",
        details: err.response?.data?.error?.errors || null
      });
    }
    
    res.status(err.response?.status || 500).json({ 
      error: errorMessage,
      details: err.response?.data?.error?.errors || null
    });
  }
});

app.post('/api/drive/create-metadata', async (req: any, res: any) => {
  const { name, parents, description } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const resDrive = await drive.files.create({
      requestBody: {
        name,
        parents,
        description,
        mimeType: 'text/plain', 
      },
      media: {
        mimeType: 'text/plain',
        body: `ZARYA CLOUD STORAGE FILE\n\nThis file is stored in Firebase Cloud Storage for performance and reliability.\n\nDirect Download Link:\n${description.replace('FIREBASE_URL:', '')}\n\nUploaded at: ${new Date().toISOString()}`,
      },
      supportsAllDrives: true,
    } as any);
    res.json({ fileId: resDrive.data.id });
  } catch (error: any) {
    console.error('Create metadata failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/drive-upload-test', async (req: any, res: any) => {
  console.log('--- RUNNING DRIVE UPLOAD TEST ---');
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const testFileName = `Zarya_Upload_Test_${new Date().getTime()}.txt`;
    const testContent = `This is a test file to verify write permissions.\nTimestamp: ${new Date().toISOString()}`;
    
    console.log(`Testing upload to parent: ${parentFolderId || 'ROOT'}`);
    
    const resDrive = await drive.files.create({
      requestBody: {
        name: testFileName,
        parents: parentFolderId ? [parentFolderId] : [],
      },
      media: {
        mimeType: 'text/plain',
        body: Readable.from(testContent),
      },
      supportsAllDrives: true,
      fields: 'id, name, webViewLink',
      // @ts-ignore
      uploadType: 'multipart',
    });

    console.log(`✅ Upload Test Successful! File ID: ${resDrive.data.id}`);
    
    // Clean up: delete the test file immediately
    try {
      await drive.files.delete({ fileId: resDrive.data.id, supportsAllDrives: true });
      console.log('✅ Clean-up: Test file deleted.');
    } catch (cleanErr: any) {
      console.warn('⚠️ Clean-up failed (delete):', cleanErr.message);
    }

    res.json({ 
      success: true, 
      fileId: resDrive.data.id, 
      name: resDrive.data.name,
      link: resDrive.data.webViewLink
    });
  } catch (err: any) {
    console.error('❌ Upload Test Failed:', err);
    res.status(500).json({ 
      error: err.message, 
      details: err.response?.data?.error || null,
      parentFolder: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
    });
  }
});

app.post('/api/projects/init-drive', async (req: any, res: any) => {
  const { projectName, projectCode, charterData, userEmail } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const rootFolderName = `[${projectCode}]_${projectName}_Project`;
    
    console.log(`--- INITIALIZING DRIVE FOR PROJECT: ${projectName} ---`);
    console.log(`Target Parent ID: ${parentFolderId || 'ROOT (My Drive)'}`);
    
    if (parentFolderId === '1veRtpHqs_f8nCDtRMpMa9NqCy1oiBRE0') {
      console.warn('⚠️ WARNING: You are using the My Drive ID. This will likely fail with a Storage Quota error.');
    }

    // Create the project root folder inside the parent folder if provided
    const rootFolderId = await createFolder(drive, rootFolderName, parentFolderId);

    // Share root folder with user if userEmail is provided
    if (userEmail) {
      try {
        await drive.permissions.create({
          fileId: rootFolderId,
          requestBody: { role: 'writer', type: 'user', emailAddress: userEmail },
          supportsAllDrives: true,
        });
        console.log(`Shared root folder with ${userEmail}`);
      } catch (permErr: any) {
        console.warn(`Could not share folder with ${userEmail}:`, permErr.message);
        // Do not stop the process - error is non-fatal
      }
    }

    const folderTree = {
      "0_Transmittals_and_Audit_Trail": [
        { "0.1_Incoming_Transmittals": ["0.1.1_Emails", "0.1.2_Letters"] },
        { "0.2_Outgoing_Transmittals": ["0.2.1_RFIs", "0.2.2_Submittals", "0.2.3_Proposals"] },
        "0.3_Internal_Memos",
        "0.4_Email_Archive",
        "0.5_Archive_Transmittals_Log"
      ],
      "1_Business_Initiation_and_Governance": [
        "1.1_Business_Case_and_Feasibility",
        "1.2_Project_Charter",
        "1.3_Benefits_Management_Plan",
        "1.4_Legal_Agreements_and_MoUs",
        "1.5_Team_Charter",
        "1.6_Policies_and_Procedures",
        "1.7_Archive_Governance_Versions"
      ],
      "2_Project_Management_Plan_and_Baselines": [
        "2.1_Integrated_Project_Management_Plan",
        { "2.2_Scope_Management": ["2.2.1_Scope_Statement", "2.2.2_WBS_and_Dictionary", "2.2.3_Requirements_Documentation"] },
        { "2.3_Project_Baselines": ["2.3.1_Scope_Baseline", "2.3.2_Schedule_Baseline", "2.3.3_Cost_Baseline"] },
        { "2.4_Subsidiary_Management_Plans": ["2.4.1_Quality_Management_Plan", "2.4.2_Resource_Management_Plan", "2.4.3_Communications_Management_Plan", "2.4.4_Risk_Management_Plan", "2.4.5_Procurement_Management_Plan", "2.4.6_Stakeholder_Engagement_Plan"] },
        "2.5_Archive_Management_Plans"
      ],
      "3_Dynamic_Project_Registers_and_Logs": [
        "3.1_Assumption_Log",
        "3.2_Stakeholder_Register",
        "3.3_Risk_Register",
        "3.4_Issue_Log",
        "3.5_Change_Log",
        "3.6_Lessons_Learned_Register",
        "3.7_Requirements_Traceability_Matrix",
        "3.8_Archive_Registers_Versions"
      ],
      "4_Technical_Engineering_and_Drawings": [
        { "4.1_Architectural": ["4.1.1_Site_Plans", "4.1.2_Floor_Plans", "4.1.3_Sections", "4.1.4_Elevations", "4.1.5_RCP", "4.1.6_Floor_Patterns", "4.1.7_Schedules", "4.1.8_Architectural_Details", "4.1.9_Landscape_Plans", "4.1.10_3D_Renders"] },
        { "4.2_Structural": ["4.2.1_General_Notes", "4.2.2_Foundations_and_Slabs", "4.2.3_Vertical_Elements", "4.2.4_Beams_Reinforcement", "4.2.5_Staircase_Details", "4.2.6_Misc_Structures"] },
        { "4.3_Mechanical": ["4.3.1_HVAC", "4.3.2_Plumbing_and_Drainage", "4.3.3_Fire_Fighting", "4.3.4_Vertical_Transportation", "4.3.5_Kitchen_and_Cold_Storage", "4.3.6_Specialized_Machinery_Bowling", "4.3.7_Pool_and_Water_Features", "4.3.8_Gas_Systems"] },
        { "4.4_Electrical": ["4.4.1_Lighting", "4.4.2_Power", "4.4.3_Low_Current"] },
        "4.5_Archive_Superseded_Drawings"
      ],
      "5_Schedule_and_Resources": [
        "5.1_Project_Schedule_Native",
        "5.2_Milestone_List",
        "5.3_Project_Network_Diagrams",
        "5.4_Resource_Breakdown_Structure",
        "5.5_Resource_Requirements",
        "5.6_Project_Calendars",
        "5.7_Archive_Schedule_Versions"
      ],
      "6_Financials_and_Procurements": [
        { "6.1_General_Requirements": ["6.1.1_RFQ_Quotations", "6.1.2_PO", "6.1.3_Business_Partners_Contracts"] },
        { "6.2_Site_Work": ["6.2.1_RFQ_Quotations", "6.2.2_PO", "6.2.3_Business_Partners_Contracts"] },
        { "6.3_Concrete": ["6.3.1_RFQ_Quotations", "6.3.2_PO", "6.3.3_Business_Partners_Contracts"] },
        { "6.4_Masonry": ["6.4.1_RFQ_Quotations", "6.4.2_PO", "6.4.3_Business_Partners_Contracts"] },
        "6.5_Metals",
        "6.6_Wood_and_Plastics",
        "6.7_Thermal_Moisture_Protection",
        "6.8_Doors_and_Windows",
        "6.9_Finishes",
        "6.10_Specialties",
        "6.11_Equipment",
        "6.12_Furnishings",
        "6.13_Special_Construction",
        "6.14_Conveying_Systems",
        "6.15_Mechanical",
        "6.16_Electrical",
        { "6.17_BOQ_Baselines_and_Versions": ["6.17.1_Original_BOQ", "6.17.2_Revised_BOQ_Versions", "6.17.3_Comparison_Sheets"] },
        "6.18_Cost_Estimates_and_Basis",
        "6.19_Project_Funding_Requirements",
        "6.20_Cost_Control_Reports",
        "6.21_Archive_Financial_Records"
      ],
      "7_Performance_Reports_Quality_and_Communications": [
        { "7.1_Work_Performance_Reports": ["7.1.1_Daily_Reports", "7.1.2_Weekly_Reports", "7.1.3_Monthly_Reports", "7.1.4_Dashboards_and_KPIs"] },
        { "7.2_Quality_Control_and_Reports": ["7.2.1_Quality_Metrics", "7.2.2_Quality_Control_Measurements"] },
        "7.3_Risk_Reports",
        "7.4_HSE_Safety_Reports",
        { "7.5_Meeting_Minutes": ["7.5.1_Periodic_Meetings", "7.5.2_Contractors_Meetings"] },
        "7.6_Archive_Old_Reports_and_Minutes"
      ],
      "8_Deliverables_and_Project_Closure": [
        "8.1_Verified_and_Accepted_Deliverables",
        "8.2_As_Built_Drawings",
        "8.3_Final_Product_Transition",
        "8.4_Final_Project_Report",
        "8.5_Archive_Closure_Drafts"
      ]
    };

    const folderMap = await createFolderTree(drive, folderTree, rootFolderId);
    console.log('Successfully created folder tree for project:', projectName);
    console.log('Folder Map Keys:', Object.keys(folderMap));

    // Generate and upload Project Charter PDF
    const adminFolderId = folderMap["1_Business_Initiation_and_Governance"];
    if (adminFolderId) {
      console.log('Governance folder found:', adminFolderId);
      try {
        console.log('Generating Project Charter PDF...');
        const pdfBuffer = generateProjectCharterPDF(projectName, projectCode, charterData);
        console.log('PDF Buffer generated, size:', pdfBuffer.length);
        const fileName = `Project_Charter_${projectCode}.pdf`;
        
        console.log(`Uploading PDF "${fileName}" to folder ${adminFolderId}...`);
        const uploadRes = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [adminFolderId],
          },
          media: {
            mimeType: 'application/pdf',
            body: Readable.from(pdfBuffer),
          },
          supportsAllDrives: true,
          // @ts-ignore
          uploadType: 'multipart',
        });
        console.log('Project Charter PDF uploaded successfully, file ID:', uploadRes.data.id);
      } catch (pdfError: any) {
        console.error('Error during PDF generation/upload:', pdfError.message);
        // We don't fail the whole process if PDF fails, but we log it
      }
    } else {
      console.warn('1_Business_Initiation_and_Governance folder not found in folderMap');
    }

    res.json({ rootFolderId });
  } catch (error: any) {
    console.error('Failed to create folder tree:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to create folder tree';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/admin/backup-code', async (req: any, res: any) => {
  console.log('Starting codebase backup process...');
  const { drive, error } = getDriveClient();
  if (error || !drive) {
    console.error('Backup failed:', error);
    return res.status(500).json({ error: error || 'Google Drive client not initialized.' });
  }

  const backupFolderId = process.env.GOOGLE_DRIVE_CODE_BACKUP_FOLDER_ID;
  if (!backupFolderId) {
    console.error('Backup failed: GOOGLE_DRIVE_CODE_BACKUP_FOLDER_ID is missing.');
    return res.status(400).json({ error: 'Backup folder ID is missing in environment variables.' });
  }

  try {
    const zip = new AdmZip();
    const filesToInclude = [
      'server.ts', 
      'package.json', 
      'tsconfig.json', 
      'vite.config.ts', 
      'index.html', 
      '.env.example',
      'metadata.json',
      'firebase-blueprint.json',
      'firestore.rules'
    ];

    console.log('Zipping files...');
    filesToInclude.forEach(file => {
      if (fs.existsSync(file)) {
        zip.addLocalFile(file);
        console.log(`Added to zip: ${file}`);
      }
    });
    
    if (fs.existsSync('src')) {
      zip.addLocalFolder('src', 'src');
      console.log('Added src folder to zip');
    }

    const zipBuffer = zip.toBuffer();
    const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'UTC' }).replace(/[/, :]/g, '-');
    const fileName = `PMIS_Source_Backup_${timestamp}.zip`;

    console.log(`Uploading ${fileName} to Drive folder: ${backupFolderId}`);
    
    // Use a temporary file for the upload stream
    const tempPath = path.join(process.cwd(), 'temp_backup.zip');
    fs.writeFileSync(tempPath, zipBuffer);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [backupFolderId],
      },
      media: {
        mimeType: 'application/zip',
        body: fs.createReadStream(tempPath),
      },
      fields: 'id, name',
      supportsAllDrives: true,
      // @ts-ignore
      uploadType: 'multipart',
    });

    fs.unlinkSync(tempPath);
    console.log('Backup successful! File ID:', response.data.id);
    res.json({ 
      success: true, 
      fileId: response.data.id, 
      fileName: response.data.name 
    });
  } catch (error: any) {
    console.error('Backup process crashed:', error);
    const message = error.response?.data?.error?.message || error.message || 'Unknown backup error';
    res.status(500).json({ error: `Backup failed: ${message}` });
  }
});

app.post('/api/admin/test-drive', async (req: any, res: any) => {
  const { drive, error } = getDriveClient();
  if (error || !drive) {
    return res.status(500).json({ error: error || 'Google Drive client not initialized.' });
  }

  try {
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    if (!parentId) {
      return res.status(400).json({ error: 'GOOGLE_DRIVE_PARENT_FOLDER_ID is missing in environment variables.' });
    }

    // Force a token refresh to catch auth errors early
    const auth: any = drive.context._options.auth;
    console.log('Testing Drive connection and refreshing tokens...');
    
    try {
      const tokenResponse = await auth.getAccessToken();
      console.log('Access token refreshed successfully');
    } catch (tokenErr: any) {
      console.error('Token refresh failed:', tokenErr.message);
      return res.status(401).json({ 
        error: `Authentication Failed: ${tokenErr.message}`,
        details: 'This usually indicates that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN are incorrect or have been revoked.'
      });
    }

    const folder = await drive.files.get(
      { 
        fileId: parentId,
        supportsAllDrives: true,
      },
      { timeout: 10000 }
    );
    
    res.json({ 
      success: true, 
      folderName: folder.data.name,
      clientEmail: 'OAuth2 Integration (Token Verified)'
    });
  } catch (error: any) {
    console.error('Test Drive Connection failed:', error);
    const message = error.response?.data?.error?.message || error.message || 'Unknown connection error';
    res.status(500).json({ error: `Connection failed: ${message}` });
  }
});

app.post('/api/upload', upload.single('file'), async (req: any, res: any) => {
  const { folderId } = req.body;
  const file = req.file;
  const { drive, error } = getDriveClient();
  if (error || !drive || !file) return res.status(500).json({ error: error || 'Drive client or file missing' });

  try {
    const resDrive = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
      supportsAllDrives: true,
      // @ts-ignore
      uploadType: 'multipart',
    });
    fs.unlinkSync(file.path); // Delete temp file
    res.json({ fileId: resDrive.data.id });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/drive/folders-recursive/:folderId', async (req: any, res: any) => {
  const { folderId } = req.params;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const folders: any[] = [];
    
    async function collectFolders(currentId: string, currentPath: string = '', parentId: string | null = null) {
      const response = await drive.files.list({
        // Optimization: only get specific fields
        q: `'${currentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        // Optimization: larger page size if many folders
        pageSize: 1000
      });

      if (response.data.files) {
        for (const f of response.data.files) {
          const folderPath = currentPath ? `${currentPath}/${f.name}` : f.name;
          folders.push({ id: f.id, name: f.name, path: folderPath, parentId: currentId });
          // Limit recursion depth if needed or parallelize top levels
          await collectFolders(f.id, folderPath, currentId);
        }
      }
    }

    // Parallelize first level if root has many folders
    const initialResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (initialResponse.data.files) {
      const initialFolders = initialResponse.data.files;
      const promises = initialFolders.map(f => {
        const folderPath = f.name;
        folders.push({ id: f.id, name: f.name, path: folderPath, parentId: folderId });
        return collectFolders(f.id, folderPath, folderId);
      });
      await Promise.all(promises);
    }
    res.json({ folders });
  } catch (error) {
    console.error('Failed to list folders recursively:', error);
    res.status(500).json({ error: 'Failed to list folders recursively' });
  }
});

app.get('/api/drive/files/:folderId', async (req: any, res: any) => {
  const { folderId } = req.params;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, iconLink, modifiedTime, createdTime, version, description, lastModifyingUser(displayName, photoLink))',
      orderBy: 'folder,name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    res.json({ files: response.data.files });
  } catch (error) {
    console.error('Failed to list files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.get('/api/drive/list', async (req: any, res: any) => {
  const { folderId, recursive } = req.query;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const files: any[] = [];
    
    async function collectFiles(currentFolderId: string, currentPath: string = '') {
      const response = await drive.files.list({
        q: `'${currentFolderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (response.data.files) {
        for (const file of response.data.files) {
          const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
          if (file.mimeType === 'application/vnd.google-apps.folder' && recursive === 'true') {
            await collectFiles(file.id, filePath);
          } else if (file.mimeType !== 'application/vnd.google-apps.folder') {
            files.push({ ...file, path: filePath });
          }
        }
      }
    }

    await collectFiles(folderId as string);
    res.json({ files });
  } catch (error: any) {
    console.error('Drive list failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/drive-status', (req: any, res: any) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  
  res.json({
    isConfigured: !!clientId && !!refreshToken,
    hasParentFolder: !!parentId,
    parentFolderId: parentId
  });
});





// Global Error Handler for API routes to ensure JSON responses
app.use('/api', (err: any, req: any, res: any, next: any) => {
  console.error(`💥 [API ERROR] ${req.method} ${req.path}:`, err);
  res.status(err.status || err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    type: 'GlobalErrorHandler'
  });
});

// Catch-all for undefined API routes to prevent falling through to SPA fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

async function startServer() {
  console.log('--- ZARYA SERVER STARTING ---');
  
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    
    // Test Drive Connection asynchronously after server is up
    (async () => {
      try {
        console.log('Running background connection test...');
        const { drive, error } = getDriveClient();
        if (drive) {
          const oauth2Client: any = drive.context._options.auth;
          const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
          
          try {
            console.log('Attempting to refresh access token...');
            await oauth2Client.getAccessToken();
            console.log('✅ Access token refreshed successfully.');
            
            if (parentId) {
              const folder = await drive.files.get(
                { 
                  fileId: parentId,
                  supportsAllDrives: true,
                },
                { timeout: 10000 }
              );
              console.log('✅ Background connection test successful. Parent folder:', folder.data.name);
            } else {
              console.warn('⚠️ GOOGLE_DRIVE_PARENT_FOLDER_ID not set.');
            }
          } catch (atErr: any) {
             const msg = atErr.message || '';
             console.error('❌ Token refresh failed during startup:', msg);
             
             if (msg.includes('unauthorized_client')) {
               console.error('   -> Check if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET match the ones used to generate GOOGLE_REFRESH_TOKEN.');
             } else if (msg.includes('access_denied') || msg.includes('invalid_grant')) {
               console.error('   -> The Refresh Token might be invalid or expired. Please generate a new one.');
             } else if (msg.includes('has not been used in project') || msg.includes('disabled')) {
               console.error('   -> CRITICAL: Google Drive API is DISABLED.');
               console.error('   -> ACTION REQUIRED: Open this link to enable it:');
               console.error('      https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=1039729742728');
             }
          }
        } else {
          console.warn('⚠️ Google Drive client not initialized:', error);
        }
      } catch (e: any) {
        console.error('❌ Background connection test failed:', e.message);
      }
    })();
  });
}

startServer();
