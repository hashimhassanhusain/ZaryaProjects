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
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/zip'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Google Drive Auth
const getDriveClient = () => {
  let envCreds = process.env.GOOGLE_DRIVE_CREDENTIALS;
  
  // Fallback: Check for a local service-account.json if env var is missing
  if (!envCreds) {
    const credsPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(credsPath)) {
      console.log('Using local service-account.json file...');
      envCreds = fs.readFileSync(credsPath, 'utf8');
    }
  }

  if (!envCreds) {
    return { error: 'Google Drive Credentials Missing: Please set the GOOGLE_DRIVE_CREDENTIALS environment variable OR upload "service-account.json" to the server root.' };
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

    if (process.env.NODE_ENV !== 'production') console.log('Initializing GoogleAuth for:', credentials.client_email);
    
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
  let currentParentId = rootFolderId;
  console.log(`Ensuring path: ${pathParts.join('/')} starting from root: ${rootFolderId}`);
  
  for (const part of pathParts) {
    const response = await drive.files.list({
      q: `name = '${part.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const files = response.data.files;
    if (!files || files.length === 0) {
      console.log(`Folder part not found: "${part}". Creating in parent: ${currentParentId}`);
      try {
        const newFolder = await drive.files.create({
          requestBody: {
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [currentParentId],
          },
          supportsAllDrives: true,
        });
        currentParentId = newFolder.data.id || '';
        if (!currentParentId) return null;
        console.log(`Created folder: "${part}" with ID: ${currentParentId}`);
      } catch (err: any) {
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
  const { drive, error } = getDriveClient();
  
  if (error || !drive || !file || !projectRootId || !path) {
    return res.status(400).json({ error: error || 'Missing required parameters' });
  }

  try {
    const pathParts = path.split('/').filter((p: string) => p.length > 0);
    const targetFolderId = await findOrCreateFolderByPath(drive, projectRootId, pathParts);
    
    if (!targetFolderId) {
      console.error(`Folder path creation failed: ${path} in project: ${projectRootId}`);
      return res.status(500).json({ error: `Could not navigate or create the folder path "${path}". Please check Google Drive permissions.` });
    }

    // Archive existing file if it exists
    await archiveExistingFile(drive, targetFolderId, file.originalname);

    let resDrive;
    try {
      resDrive = await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [targetFolderId],
        },
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        },
        supportsAllDrives: true,
        // @ts-ignore
        uploadType: 'multipart',
      } as any);
    } finally {
      fs.unlinkSync(file.path);
    }
    res.json({ fileId: resDrive.data.id, folderId: targetFolderId });
  } catch (error: any) {
    console.error('Upload by path failed:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Upload failed';

    // Check for storage quota error specifically
    if (errorMessage.includes('storage quota')) {
      return res.status(403).json({
        error: "System Storage Permission Error: Please ensure the Service Account is added to the Shared Drive as a Manager.",
        details: error.response?.data?.error?.errors || null
      });
    }

    const errorDetails = error.response?.data?.error?.errors || null;
    res.status(500).json({
      error: errorMessage,
      details: errorDetails
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
      "ADMIN_AND_CORRESPONDENCE_00": [
        { "00.1_Incoming_Correspondence": ["Emails", "Letters"] },
        { "00.2_Outgoing_Correspondence": ["Transmittals", "RFIs", "Letters_Sent"] },
        { "00.3_Legal_and_Contracts": ["Client_Main_Contract"] }
      ],
      "01_PROJECT_MANAGEMENT_FORMS": [
        { "1.0_Initiating": ["1.1_Governance_Domain", "1.2_Scope_Domain", "1.3_Schedule_Domain", "1.4_Finance_Domain", "1.5_Stakeholders_Domain", "1.6_Resources_Domain", "1.7_Risk_Domain"] },
        { "2.0_Planning": [
          { "2.1_Governance_Domain": ["2.1.1_CHANGE_MANAGEMENT_PLAN", "2.1.2_PROJECT_MANAGEMENT_PLAN", "2.1.3_QUALITY_MANAGEMENT_PLAN"] },
          "2.2_Scope_Domain", "2.3_Schedule_Domain", "2.4_Finance_Domain", "2.5_Stakeholders_Domain", "2.6_Resources_Domain", "2.7_Risk_Domain"
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
        ]}
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
    console.log('Successfully created folder tree for project:', projectName);
    console.log('Folder Map Keys:', Object.keys(folderMap));

    // Generate and upload Project Charter PDF
    const adminFolderId = folderMap["ADMIN_AND_CORRESPONDENCE_00"];
    if (adminFolderId) {
      console.log('Admin folder found:', adminFolderId);
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
      console.warn('ADMIN_AND_CORRESPONDENCE_00 folder not found in folderMap');
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Zarya_Source_Backup_${timestamp}.zip`;

    console.log(`Uploading ${fileName} to Drive folder: ${backupFolderId}`);
    
    // Use a temporary file for the upload stream
    const tempPath = path.join(process.cwd(), 'temp_backup.zip');
    fs.writeFileSync(tempPath, zipBuffer);

    let response;
    try {
      response = await drive.files.create({
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
    } finally {
      fs.unlinkSync(tempPath);
    }

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
      { 
        fileId: parentId,
        supportsAllDrives: true,
      },
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

  let resDrive;
  try {
    try {
      resDrive = await drive.files.create({
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
    } finally {
      fs.unlinkSync(file.path); // Delete temp file
    }
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
      fields: 'files(id, name, mimeType, size, webViewLink, iconLink, modifiedTime, createdTime, version, description, lastModifyingUser(displayName, photoLink))',
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

app.get('/api/admin/drive-status', (req: any, res: any) => {
  const envCreds = process.env.GOOGLE_DRIVE_CREDENTIALS;
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  
  res.json({
    isConfigured: !!envCreds && envCreds.length > 50,
    hasParentFolder: !!parentId,
  });
});

app.post('/api/ai/generate', async (req: any, res: any) => {
  const { prompt, model = 'gemini-2.0-flash', responseType } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(responseType === 'json' ? { generationConfig: { responseMimeType: 'application/json' } } : {})
        }),
      }
    );
    const data = await response.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: 'AI generation failed' });
  }
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
          const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
          if (parentId) {
            // Add a timeout to the request
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
