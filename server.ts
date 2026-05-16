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

// Ensure uploads directory exists for multer
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

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
    return { drive, docs, auth: oauth2Client, clientEmail: 'OAuth2 Integration' };
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
  let cleanRootId = (rootFolderId || '').trim();
  if (!cleanRootId || cleanRootId === '.' || cleanRootId === 'undefined' || cleanRootId.toLowerCase().includes('efit1rp')) {
    console.log(`⚠️ [Root ID Protocol] Invalid or legacy Root ID: "${rootFolderId}". Returning error.`);
    return null; // Don't fall back, error out to make it obvious
  }

  const fullPathKey = `${cleanRootId}/${pathParts.join('/')}`;
  console.log(`🔍 [Root ID Protocol] Path search: ${fullPathKey}`);
  
  if (FOLDER_CREATE_PROMISES.has(fullPathKey)) {
    return FOLDER_CREATE_PROMISES.get(fullPathKey)!;
  }

  const creationPromise = (async () => {
    let currentParentId = cleanRootId;
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      console.log(`   📂 Step ${i+1}: Searching "${part}" in parent "${currentParentId}"`);
      let query = `name = '${part.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      
      // Dynamic Path Discovery: If the part has a suffix or prefix like _6 or 6_, we should be flexible
      const suffixMatch = part.match(/[._\s](\d+)$/);
      const prefixMatch = part.match(/^(\d+)[._\s]/);
      const categoryNum = suffixMatch ? suffixMatch[1] : (prefixMatch ? prefixMatch[1] : null);
      
      let response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      let files = response.data.files;

      // If not found and has a numeric identifier, try fuzzy searching
      if ((!files || files.length === 0) && categoryNum) {
         console.log(`🔍 [Root ID Protocol] Literal folder "${part}" not found. Searching for category match "${categoryNum}"...`);
         
         const fuzzyQuery = `name contains '${categoryNum}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
         const fuzzyResponse = await drive.files.list({
           q: fuzzyQuery,
           fields: 'files(id, name)',
           spaces: 'drive',
           supportsAllDrives: true,
           includeItemsFromAllDrives: true,
         });

         const fuzzyFiles = fuzzyResponse.data.files;
         const matched = fuzzyFiles?.find((f: any) => {
           const n = categoryNum;
           return f.name === n || 
                  f.name.startsWith(`${n}_`) || f.name.startsWith(`${n}.`) || f.name.startsWith(`${n} `) ||
                  f.name.endsWith(`_${n}`) || f.name.endsWith(`.${n}`) || f.name.endsWith(` ${n}`);
         });
         
         if (matched) {
           console.log(`🎯 [Root ID Protocol] Dynamic match found: "${matched.name}" (ID: ${matched.id})`);
           files = [matched];
         }
      }

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

app.post('/api/drive/create-resumable-upload', async (req: any, res: any) => {
  const { projectRootId, path: drivePath, fileName, mimeType, projectCode, fileSize } = req.body;
  
  if (!projectRootId || !fileName || !mimeType || !fileSize) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { drive, auth, error } = getDriveClient();
    if (error || !drive || !auth) throw new Error(error || 'Drive client not initialized');

    let cleanRootId = (projectRootId || '').trim();
    const finalPath = drivePath || '.';
    const pathParts = finalPath === '.' || finalPath === '/' ? [] : finalPath.split('/').filter((p: string) => p.trim().length > 0);
    const targetFolderId = await findOrCreateFolderByPath(drive, cleanRootId, pathParts);
    if (!targetFolderId) throw new Error('Could not traverse or create folder path in Google Drive.');

    try {
      await archiveExistingFile(drive, targetFolderId, fileName);
    } catch (e) {}

    // Get an access token
    const tokenResponse = await auth.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) throw new Error('Failed to get access token');

    // Initiate resumable upload session
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
      },
      body: JSON.stringify({
        name: fileName,
        parents: [targetFolderId],
        description: `Project: ${projectCode || 'N/A'}`
      })
    });

    if (!response.ok) {
      throw new Error(`Google API returned ${response.status}: ${await response.text()}`);
    }

    const resumableUrl = response.headers.get('location');
    if (!resumableUrl) throw new Error('No location header returned from Google API');

    res.json({ resumableUrl, targetFolderId });
  } catch (e: any) {
    console.error('Error creating resumable upload:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/drive/proxy-resumable-chunk', async (req: any, res: any) => {
  try {
    const { resumableUrl, contentRange, base64Data } = req.body;
    
    if (!resumableUrl || !contentRange || !base64Data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { auth, error } = getDriveClient();
    if (error || !auth) throw new Error('Drive client not initialized');

    const tokenResponse = await auth.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) throw new Error('Failed to get access token');

    const buffer = Buffer.from(base64Data, 'base64');

    const googleRes = await fetch(resumableUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenResponse.token}`,
        'Content-Range': contentRange,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer
    });

    const isSuccess = googleRes.status === 200 || googleRes.status === 201;
    const isResume = googleRes.status === 308;

    if (!isSuccess && !isResume) {
       throw new Error(`Google Drive API chunk error: ${googleRes.status} - ${await googleRes.text()}`);
    }

    let data = {};
    if (isSuccess) {
       const text = await googleRes.text();
       data = text ? JSON.parse(text) : {};
    }

    res.status(googleRes.status).json(data);
  } catch (e: any) {
    console.error('Proxy chunk error:', e);
    res.status(500).json({ error: e.message });
  }
});

// API Routes
app.post('/api/drive/upload-by-url', async (req: any, res: any) => {
  const { projectRootId, path, projectCode, fileName, mimeType } = req.body;
  const fileUrl = req.body.url || req.body.fileUrl;
  const executionLog: string[] = [];
  const log = (msg: string) => { console.log(msg); executionLog.push(msg); };
  
  if (!projectRootId || projectRootId.trim() === '.' || projectRootId === 'undefined') {
    return res.status(400).json({ error: 'Invalid Project Root ID' });
  }

  if (!fileUrl || !fileName) {
    return res.status(400).json({ error: 'Missing url/fileUrl or fileName' });
  }
  
  const finalPath = path || '.';

  log('--- DRIVE UPLOAD BY URL START ---');
  log(`File: ${fileName}, ProjectRoot: ${projectRootId}, Path: ${finalPath}`);
  
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: `Google Drive client not initialized: ${error}` });

  // Root ID Repair Logic: Standardize common project root IDs if they are using the default shared one
  let cleanRootId = (projectRootId || '').trim();
  if (!cleanRootId || cleanRootId === '.' || cleanRootId === 'undefined' || cleanRootId.toLowerCase().includes('efit1rp')) {
    log(`❌ Invalid Root ID: "${cleanRootId}". Must provide a valid project-specific Drive Folder ID.`);
    return res.status(400).json({ error: 'Invalid or missing project Drive Folder ID. Files must be saved to the project directory.'});
  }

  let drivePath = path || '.';
  try {
    const pathParts = drivePath === '.' || drivePath === '/' ? [] : drivePath.split('/').filter((p: string) => p.trim().length > 0);
    
    // Capture sub-logs for better debugging in the response
    const oldLog = console.log;
    console.log = (...args) => {
      oldLog(...args);
      executionLog.push(args.join(' '));
    };

    try {
      log(`🔍 Resolving path hierarchy...`);
      const targetFolderId = await findOrCreateFolderByPath(drive, cleanRootId, pathParts);
      console.log = oldLog;

      if (!targetFolderId) {
        throw new Error(`Failed to resolve or create folder path: ${path}`);
      }

      log(`✅ Target Folder ID: ${targetFolderId}`);

      try {
        log(`📂 Checking for existing version to archive...`);
        await Promise.race([
          archiveExistingFile(drive, targetFolderId, fileName),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Archive timeout')), 8000))
        ]);
      } catch (archiveErr) {
        log(`⚠️ Archive phase skipped: ${archiveErr instanceof Error ? archiveErr.message : 'Timeout'}`);
      }

      log(`📡 Fetching asset from buffer: ${fileUrl.substring(0, 50)}...`);
      
      let response;
      try {
        response = await fetch(fileUrl, { signal: AbortSignal.timeout(15000) });
      } catch (fetchErr: any) {
        log(`❌ Fetch failed (Maybe Timeout): ${fetchErr.message}`);
        throw new Error(`Failed to fetch file from buffer URL (Network Error: ${fetchErr.message})`);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file from buffer URL (Status: ${response.status} ${response.statusText})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      log(`📄 Buffer received (${buffer.length} bytes). Processing stream...`);

      log(`📤 Transmitting to Google Drive API...`);
      const resDrive = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId],
          description: `Archived via Zarya PMIS | Project: ${projectCode || 'N/A'} | Path: ${path}`,
        },
        media: {
          mimeType: mimeType || 'application/octet-stream',
          body: Readable.from(buffer),
        },
        supportsAllDrives: true,
        fields: 'id, name, webViewLink',
      });
      
      log(`✨ DRIVE CLOUD SYNC SUCCESSFUL. File ID: ${resDrive.data.id}`);
      
      res.json({ 
        success: true, 
        fileId: resDrive.data.id, 
        folderId: targetFolderId,
        log: executionLog 
      });
    } finally {
      console.log = oldLog;
    }
  } catch (err: any) {
    log(`❌ CRITICAL UPLOAD FAILURE: ${err.message}`);
    res.status(500).json({ 
      error: err.message || 'Internal Server Error during Drive Sync',
      log: executionLog
    });
  }
});

app.post('/api/drive/upload-by-path', upload.single('file'), async (req: any, res: any) => {
  const { projectRootId, path, projectCode, fileName } = req.body;
  const file = req.file;
  
  let cleanRootId = (projectRootId || '').trim();
  if (!cleanRootId || cleanRootId === '.' || cleanRootId === 'undefined' || cleanRootId.toLowerCase().includes('efit1rp')) {
    return res.status(400).json({ error: 'Invalid or missing project Drive Folder ID. Files must be saved to the project directory.'});
  }

  let drivePath = path || '.';
  if (!path) {
     drivePath = '.';
  }
  
  const finalFileName = fileName || file?.originalname;
  
  console.log('--- DRIVE UPLOAD START ---');
  console.log(`File: ${finalFileName}, ProjectRoot: ${projectRootId}, Path: ${drivePath}`);
  
  const { drive, error } = getDriveClient();
  
  if (error || !drive) {
    return res.status(500).json({ error: error || 'Google Drive client not initialized' });
  }

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const pathParts = drivePath === '.' || drivePath === '/' ? [] : drivePath.split('/').filter((p: string) => p.trim().length > 0);
    const targetFolderId = await findOrCreateFolderByPath(drive, cleanRootId, pathParts);
    
    if (!targetFolderId) {
      return res.status(500).json({ error: `Could not navigate or create the folder path "${path}".` });
    }

    try {
      await archiveExistingFile(drive, targetFolderId, finalFileName);
    } catch (archiveErr) {}

    const resDrive = await drive.files.create({
      requestBody: {
        name: finalFileName,
        parents: [targetFolderId],
        description: `Project: ${projectCode || 'N/A'} | Uploaded via PMIS`,
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
      supportsAllDrives: true,
      fields: 'id, name, webViewLink',
    });
    
    if (fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    
    res.json({ success: true, fileId: resDrive.data.id, folderId: targetFolderId });
  } catch (err: any) {
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    res.status(500).json({ error: err.message });
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
      "00_Communications_Transmittals": [
        "Incoming Transmittals",
        "Outgoing Transmittals",
        "Correspondence Register",
        "RFIs",
        "Submittal Logs"
      ],
      "01_Project_Governance": [
        "Project Charter",
        "Contract Administration",
        "Change Control",
        "Governance Workflows"
      ],
      "02_Engineering_Design_Delivery": [
        "Technical Specifications",
        "Shop Drawings",
        "BIM Coordination",
        "Material Submittals",
        "QA_QC"
      ],
      "03_Stakeholder_Engagement": [
        "Stakeholder Register",
        "Meetings Management",
        "MOM Tracking"
      ],
      "04_Resources_Procurement_Logistics": {
        "04.1_Human_Resources": ["Staff Attendance", "Timesheets"],
        "04.2_Procurement_Supply_Chain": [
          "04.2.1_Material_Request_MR",
          "04.2.2_Purchase_Requisition_PR",
          "04.2.3_Request_For_Quotation_RFQ",
          "04.2.8_Purchase_Order_PO",
          "04.2.10_Material_Receiving_Inspection_MIR"
        ]
      },
      "05_Project_Controls": [
        "Planning_and_Scheduling",
        "Progress_Reports",
        "Daily_Reports"
      ],
      "06_Commercial_Finance_Cost": [
        "BOQ_Management",
        "Budget_Control",
        "Invoicing",
        "Payment_Certificates",
        "Variations_and_Claims"
      ],
      "07_Risk_HSE_Compliance": [
        "Risk_Register",
        "HSE_Management",
        "Incident_Reports"
      ],
      "08_Handover_Closeout_Knowledge": [
        "Testing_and_Commissioning",
        "Snag_List",
        "As_Built_Documents",
        "Lessons_Learned"
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

app.post('/api/drive/rename', async (req: any, res: any) => {
  const { fileId, newName } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  if (!fileId || !newName) {
    return res.status(400).json({ error: 'fileId and newName are required' });
  }

  try {
    const response = await drive.files.update({
      fileId: fileId,
      requestBody: {
        name: newName
      },
      supportsAllDrives: true,
      fields: 'id, name'
    });
    res.json({ success: true, file: response.data });
  } catch (error: any) {
    console.error('Failed to rename file:', error);
    res.status(500).json({ error: error.message || 'Failed to rename file' });
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
  
  // Verify fetch availability (Node 18+)
  if (typeof fetch === 'undefined') {
    console.warn('⚠️ [Node Env] Global fetch is missing. This project requires Node 18+. Attempting fallback...');
  } else {
    console.log('✅ [Node Env] Global fetch detected.');
  }
  
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
