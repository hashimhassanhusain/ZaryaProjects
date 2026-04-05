import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import AdmZip from 'adm-zip';

const app = express();
const PORT = 3000;
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(cors());

// Google Drive Auth
const getDriveClient = () => {
  const envCreds = process.env.GOOGLE_DRIVE_CREDENTIALS;
  
  if (!envCreds) {
    return { error: 'Secret GOOGLE_DRIVE_CREDENTIALS is missing or empty in the Secrets panel.' };
  }

  try {
    console.log('Attempting to parse GOOGLE_DRIVE_CREDENTIALS...');
    let rawInput = envCreds.trim();
    
    // Detection for common placeholder mistake
    if (rawInput.startsWith('{') && rawInput.endsWith('}') && !rawInput.includes('"')) {
      return { error: `Placeholder Detected! You pasted "${rawInput}" instead of the actual JSON content. Please replace it with the FULL content of your Service Account JSON file.` };
    }

    // 1. Aggressive cleaning: If the user pasted "KEY=VALUE", extract only VALUE
    if (rawInput.includes('=')) {
      const parts = rawInput.split('=');
      // Take everything after the first '='
      rawInput = parts.slice(1).join('=').trim();
    }

    // 2. Extract anything between the first '{' and the last '}'
    const start = rawInput.indexOf('{');
    const end = rawInput.lastIndexOf('}');
    
    if (start === -1 || end === -1) {
      const preview = rawInput.substring(0, 30).replace(/\n/g, ' ');
      return { error: `Invalid Format! Your secret starts with: "${preview}...". It MUST start with "{" and end with "}". Please copy the FULL content of the JSON file you downloaded from Google Cloud.` };
    }
    
    let jsonStr = rawInput.substring(start, end + 1);

    // 3. Parse the JSON
    let credentials;
    try {
      credentials = JSON.parse(jsonStr);
    } catch (parseError) {
      // If it fails, it might be double-escaped (common in some environments)
      try {
        const unescaped = jsonStr.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        credentials = JSON.parse(unescaped);
      } catch (e) {
        throw new Error('The content is not a valid JSON. Please check for missing braces or extra characters.');
      }
    }
    
    if (!credentials.private_key || !credentials.client_email) {
      return { error: 'JSON parsed but missing "private_key" or "client_email".' };
    }

    // 4. Clean the private_key
    let pk = credentials.private_key;
    pk = pk.replace(/\\n/g, '\n').trim().replace(/^['"]+|['"]+$/g, '');
    
    if (!pk.includes('-----BEGIN PRIVATE KEY-----')) {
      const cleanBase64 = pk.replace(/\s+/g, '');
      const wrapped = cleanBase64.match(/.{1,64}/g)?.join('\n') || cleanBase64;
      pk = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
    }
    credentials.private_key = pk;

    console.log('Initializing GoogleAuth for:', credentials.client_email);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    return { drive, clientEmail: credentials.client_email };
  } catch (e: any) {
    console.error('CRITICAL Drive Init Error:', e.message);
    return { error: `Configuration Error: ${e.message}` };
  }
};

// Recursive folder creation
async function createFolder(drive: any, name: string, parentId?: string) {
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : [],
  };
  const res = await drive.files.create(
    {
      requestBody: fileMetadata,
      fields: 'id',
    },
    { timeout: 10000 }
  );
  return res.data.id;
}

async function createFolderTree(drive: any, tree: any, parentId?: string) {
  for (const folderName of Object.keys(tree)) {
    const currentFolderId = await createFolder(drive, folderName, parentId);
    const subfolders = tree[folderName];
    if (Array.isArray(subfolders)) {
      for (const sub of subfolders) {
        if (typeof sub === 'string') {
          await createFolder(drive, sub, currentFolderId);
        } else {
          await createFolderTree(drive, sub, currentFolderId);
        }
      }
    } else if (typeof subfolders === 'object') {
      await createFolderTree(drive, subfolders, currentFolderId);
    }
  }
}

async function findFolderByPath(drive: any, rootFolderId: string, pathParts: string[]): Promise<string | null> {
  let currentParentId = rootFolderId;
  console.log(`Searching for path: ${pathParts.join('/')} starting from root: ${rootFolderId}`);
  
  for (const part of pathParts) {
    const response = await drive.files.list({
      q: `name = '${part}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.data.files;
    if (!files || files.length === 0) {
      console.warn(`Folder part not found: "${part}" in parent: ${currentParentId}`);
      return null;
    }
    currentParentId = files[0].id;
    console.log(`Found folder: "${part}" with ID: ${currentParentId}`);
  }
  return currentParentId;
}

async function archiveExistingFile(drive: any, folderId: string, fileName: string) {
  try {
    // 1. Find existing file with same name (escape single quotes)
    const escapedName = fileName.replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: `name = '${escapedName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
    });
    
    const files = response.data.files;
    if (files && files.length > 0) {
      // 2. Ensure Archive folder exists
      const archiveResponse = await drive.files.list({
        q: `name = 'Archive' and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
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
  const { drive, error } = getDriveClient();
  
  if (error || !drive || !file || !projectRootId || !path) {
    return res.status(500).json({ error: error || 'Missing required parameters' });
  }

  try {
    const pathParts = path.split('/').filter((p: string) => p.length > 0);
    const targetFolderId = await findFolderByPath(drive, projectRootId, pathParts);
    
    if (!targetFolderId) {
      console.error(`Folder path not found: ${path} in project: ${projectRootId}`);
      return res.status(404).json({ error: `The folder path "${path}" was not found in your Google Drive workspace. Please ensure the project was initialized correctly.` });
    }

    // Archive existing file if it exists
    await archiveExistingFile(drive, targetFolderId, file.originalname);

    const resDrive = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
    });
    
    fs.unlinkSync(file.path);
    res.json({ fileId: resDrive.data.id, folderId: targetFolderId });
  } catch (error: any) {
    console.error('Upload by path failed:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Upload failed';
    const errorDetails = error.response?.data?.error?.errors || null;
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
});

app.post('/api/projects/init-drive', async (req: any, res: any) => {
  const { projectName, projectCode } = req.body;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    console.log('Using parent folder ID:', parentFolderId || 'ROOT');
    const rootFolderName = `[${projectCode}]_${projectName}_Project`;
    
    // Create the project root folder inside the parent folder if provided
    const rootFolderId = await createFolder(drive, rootFolderName, parentFolderId);

    const folderTree = {
      "00_ADMIN_AND_CORRESPONDENCE": [
        { "00.1_Incoming_Correspondence": ["Emails", "Letters"] },
        { "00.2_Outgoing_Correspondence": ["Transmittals", "RFIs", "Letters_Sent"] },
        { "00.3_Legal_and_Contracts": ["Client_Main_Contract"] }
      ],
      "01_PROJECT_MANAGEMENT_FORMS": [
        { "1.0_Initiating": ["1.1_Governance_Domain", "1.2_Stakeholders_Domain"] },
        { "2.0_Planning": ["2.1_Governance_Domain", "2.2_Scope_Domain", "2.3_Schedule_Domain", "2.4_Finance_Domain", "2.5_Stakeholders_Domain", "2.6_Resources_Domain", "2.7_Risk_Domain"] },
        { "3.0_Executing": ["3.1_Governance_Domain", "3.2_Stakeholders_Domain", "3.3_Resources_Domain"] },
        { "4.0_Monitoring_and_Controlling": ["4.1_Governance_Domain", "4.2_Stakeholders_Domain", "4.3_Finance_Domain", "4.4_Risk_Domain"] },
        { "5.0_Closing": ["5.1_Governance_Domain", "5.2_Finance_Domain"] }
      ],
      "02_TECHNICAL_DIVISIONS_MASTERFORMAT": [
        { "Division_03_Concrete": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_04_Masonry": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_22_Plumbing": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_23_HVAC": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_26_Electrical": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_27_Communications": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] },
        { "Division_31_Earthwork": ["01_Drawings", "02_Specifications_and_DataSheets", "03_Material_Submittals", "04_Inspection_Requests_IR"] }
      ],
      "03_PROCUREMENT_AND_SUBCONTRACTORS": [
        "03.1_Vendors_and_Suppliers_Database", 
        "03.2_Purchase_Orders_PO", 
        "03.3_Subcontractors_Hub"
      ],
      "04_SITE_OPERATIONS": [
        "04.1_Daily_Site_Reports", 
        "04.2_Progress_Photos_and_Videos", 
        { "04.3_HSE_and_Safety": ["Safety_Reports", "Incident_Logs"] }
      ],
      "05_MEETINGS_LOG": [
        "05.1_Client_Meetings", 
        "05.2_Internal_Technical_Meetings", 
        "05.3_Subcontractor_Meetings"
      ]
    };

    await createFolderTree(drive, folderTree, rootFolderId);
    console.log('Successfully created folder tree for project:', projectName);
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
    const fileName = `Zarya_Source_Backup_${timestamp}.zip`;

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
  const { drive, clientEmail, error } = getDriveClient();
  if (error || !drive) {
    return res.status(500).json({ error: error || 'Google Drive client not initialized.' });
  }

  try {
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    if (!parentId) {
      return res.status(400).json({ error: 'GOOGLE_DRIVE_PARENT_FOLDER_ID is missing in environment variables.' });
    }

    const folder = await drive.files.get(
      { fileId: parentId },
      { timeout: 10000 }
    );
    
    // Get the service account email from the drive client auth
    const auth: any = drive.context._options.auth;
    const clientEmail = auth?.credentials?.client_email || 'Unknown';

    res.json({ 
      success: true, 
      folderName: folder.data.name,
      clientEmail: clientEmail
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
    });
    fs.unlinkSync(file.path); // Delete temp file
    res.json({ fileId: resDrive.data.id });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/drive/files/:folderId', async (req: any, res: any) => {
  const { folderId } = req.params;
  const { drive, error } = getDriveClient();
  if (error || !drive) return res.status(500).json({ error: error || 'Drive client not initialized' });

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, webViewLink, iconLink, modifiedTime, createdTime, version, lastModifyingUser(displayName, photoLink))',
      orderBy: 'folder,name',
    });
    res.json({ files: response.data.files });
  } catch (error) {
    console.error('Failed to list files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.get('/api/admin/drive-status', (req: any, res: any) => {
  const envCreds = process.env.GOOGLE_DRIVE_CREDENTIALS;
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  
  res.json({
    isConfigured: !!envCreds && envCreds.length > 50, // Simple check for JSON content
    hasParentFolder: !!parentId,
    parentFolderId: parentId
  });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    
    // Test Drive Connection asynchronously after server is up
    (async () => {
      try {
        console.log('Running background connection test...');
        const { drive, error } = getDriveClient();
        if (drive) {
          const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
          if (parentId) {
            // Add a timeout to the request
            const folder = await drive.files.get(
              { fileId: parentId },
              { timeout: 10000 }
            );
            console.log('✅ Background connection test successful. Parent folder:', folder.data.name);
          } else {
            console.warn('⚠️ GOOGLE_DRIVE_PARENT_FOLDER_ID not set.');
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
