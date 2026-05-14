import React, { useState, useEffect, useCallback } from "react";
import {
  DraftingCompass,
  Box,
  Upload,
  FileText,
  MoreVertical,
  Trash2,
  ExternalLink,
  History,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  HardDrive,
  Loader2,
  X
} from "lucide-react";
import { Page } from "../types";
import { useProject } from "../context/ProjectContext";
import { useLanguage } from "../context/LanguageContext";
import {
  db,
  auth,
  storage,
  OperationType,
  handleFirestoreError,
} from "../firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { UniversalDataTable } from "./common/UniversalDataTable";
import toast from "react-hot-toast";

interface DesignFile {
  id: string;
  projectId: string;
  originator: "ARCH" | "STR" | "MECH" | "ELEC" | "SUB" | "CLT";
  division: string;
  type: "dwg" | "3d" | "specs";
  discipline?: string;
  subType?: string;
  refNo: string;
  description: string;
  version: string;
  date: string;
  fullName: string;
  status: "Pending" | "Approved" | "Work in Progress";
  uploadedAt: string;
  uploadedBy: string;
  approvedBy?: string;
  fileUrl?: string;
  previewUrl?: string;
  driveFileId?: string;
  size?: string;
  extension?: string;
}

interface Discipline {
  id: string;
  label: string;
  labelAr: string;
  categories: string[];
}

interface DesignHubViewProps {
  page: Page;
}

const ORIGINATORS = ["ARCH", "STR", "MECH", "ELEC", "SUB", "CLT"] as const;

const DIVISIONS = [
  { code: "4.1", label: "Architectural", div: "4.1_Architectural" },
  { code: "4.2", label: "Structural", div: "4.2_Structural" },
  { code: "4.3", label: "Mechanical", div: "4.3_Mechanical" },
  { code: "4.4", label: "Electrical", div: "4.4_Electrical" },
] as const;

const FILE_TYPES = [
  { code: "DWG", label: "Technical Drawing", type: "dwg" },
  { code: "IMG", label: "Visual Render", type: "3d" },
  { code: "SPE", label: "Specification", type: "specs" },
] as const;

export const DesignHubView: React.FC<DesignHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [designs, setDesigns] = useState<DesignFile[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"all" | "dwg" | "3d" | "specs">(
    "dwg",
  );
  const [activeDiscipline, setActiveDiscipline] = useState<string | "all">(
    "all",
  );
  const [activeSubFilter, setActiveSubFilter] = useState<string | "all">("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Deletion Confirmation State
  const [fileToDelete, setFileToDelete] = useState<DesignFile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Settings Management State
  const [newDisc, setNewDisc] = useState({ label: "", labelAr: "" });
  const [newCat, setNewCat] = useState({ discId: "", label: "" });

  // Modal Form State
  const [formData, setFormData] = useState({
    originator: "ARCH" as (typeof ORIGINATORS)[number],
    division: "02.1" as string,
    type: "DWG" as string,
    discipline: "" as string,
    subType: "" as string,
    refNo: "001",
    description: "",
    version: "V01",
  });

  const generateFileName = useCallback(() => {
    const companyCode = selectedProject?.companyCode || "ZARYA";
    const projectCode = selectedProject?.code || "PROJECT";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const cleanDesc = formData.description.trim().replace(/\s+/g, "_");
    const discCode =
      formData.type === "DWG"
        ? `-${formData.discipline.substring(0, 4).toUpperCase()}`
        : "";
    return `${companyCode}-${projectCode}-${formData.originator}${discCode}-D${formData.division}-${formData.type}-${formData.refNo}-${cleanDesc}-${formData.version}-${dateStr}`;
  }, [selectedProject?.code, selectedProject?.companyCode, formData]);

  const [isScanning, setIsScanning] = useState(false);

  const scanDriveFolders = useCallback(async () => {
    if (!selectedProject?.driveFolderId) {
      toast.error("Project Drive Link not found");
      return;
    }
    
    setIsScanning(true);
    const toastId = toast.loading("Scanning Technical Folders in Google Drive...");
    
    try {
      const response = await fetch(`/api/drive/list?folderId=${selectedProject.driveFolderId}&recursive=true`);
      if (!response.ok) throw new Error("Failed to scan Drive");
      
      const data = await response.json();
      const driveFiles = data.files || [];
      
      // Filter for files in technical path
      const technicalFiles = driveFiles.filter((f: any) => 
        f.mimeType !== 'application/vnd.google-apps.folder' && 
        (
          f.path?.includes('4_Technical_Engineering_and_Drawings') || 
          f.name.toLowerCase().includes('.dwg') ||
          f.name.toLowerCase().includes('.pdf')
        )
      );

    // Find which ones are NOT in Firestore yet
      const existingDriveIds = designs.map(d => d.driveFileId).filter(Boolean);
      const uncataloged = technicalFiles.filter((f: any) => !existingDriveIds.includes(f.id));

      if (uncataloged.length === 0) {
        toast.success("No new uncataloged files found.", { id: toastId });
      } else {
        toast.success(`Found ${uncataloged.length} uncataloged files in Drive. Cataloging...`, { id: toastId });
        
        // Auto-catalog identified files
        for (const file of uncataloged) {
          // Double check Firestore one more time to avoid duplicates if state was stale or raced
          const q = query(
            collection(db, "project_designs"),
            where("projectId", "==", selectedProject.id),
            where("driveFileId", "==", file.id)
          );
          const snap = await getDocs(q);
          if (!snap.empty) continue; 

          const nameParts = file.name.split('-');
          const isDwg = file.name.toLowerCase().includes('.dwg');
          
          // Improved division detection from path
          let detectedDivision = "4.1_Architectural";
          if (file.path?.includes('Structural')) detectedDivision = "4.2_Structural";
          if (file.path?.includes('Mechanical')) detectedDivision = "4.3_Mechanical";
          if (file.path?.includes('Electrical')) detectedDivision = "4.4_Electrical";

          const newDesign: Omit<DesignFile, "id"> = {
            projectId: selectedProject.id,
            fullName: file.name,
            description: "Sync from Google Drive",
            type: isDwg ? 'dwg' : (file.name.toLowerCase().includes('.pdf') ? 'specs' : 'dwg'),
            division: detectedDivision,
            originator: (nameParts[1] as any) || "ARCH",
            status: "Pending",
            refNo: nameParts[4] || "000",
            version: nameParts[6] || "V01",
            date: new Date().toISOString().split('T')[0],
            driveFileId: file.id,
            size: file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + " MB" : "Unknown",
            extension: "." + file.name.split('.').pop(),
            uploadedAt: file.createdTime || new Date().toISOString(),
            uploadedBy: "Admin Sync"
          };
          
          // Use fixed ID based on driveFileId to strictly prevent duplicates
          await setDoc(doc(db, "project_designs", `drive_${file.id}`), newDesign);
        }
        toast.success(`Registry synchronized with Drive (${uncataloged.length} new files).`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to scan: Check permissions", { id: toastId });
    } finally {
      setIsScanning(false);
    }
  }, [selectedProject?.id, selectedProject?.driveFolderId, designs]);

  const handleSaveUpload = async () => {
    if (!pendingFile || !selectedProject) {
      toast.error("No file or project selected");
      return;
    }
    if (!formData.description) {
      toast.error("Description is required");
      return;
    }

    if (pendingFile.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }

    // 1. CAPTURE FORM DATA & CLOSE MODAL IMMEDIATELY
    const currentFormData = { ...formData };
    const currentPendingFile = pendingFile;
    const extension = "." + currentPendingFile.name.split(".").pop()?.toLowerCase();
    const fullName = generateFileName();
    const divisionObj = DIVISIONS.find((d) => d.code === currentFormData.division);
    const typeObj = FILE_TYPES.find((t) => t.code === currentFormData.type);
    
    setIsAddOpen(false);
    setPendingFile(null);
    setFormData((prev) => ({
      ...prev,
      refNo: (parseInt(prev.refNo) + 1).toString().padStart(3, "0"),
      description: "",
    }));

    // 2. START BACKGROUND UPLOAD WITH NON-BLOCKING TOAST
    const backgroundToastId = toast.loading(`Uploading: ${fullName}...`, {
      style: { minWidth: '300px' }
    });

    try {
      // 1. Firebase Storage Upload (Reliable Middleman)
      let fileUrl = "";
      try {
        const storagePath = `designs/${selectedProject.id}/${fullName}${extension}`;
        console.log('📡 [Project Sync] Uploading to Firebase Asset Buffer:', storagePath);
        
        const storageRef = ref(storage, storagePath);
        const uploadResult = await Promise.race([
          uploadBytes(storageRef, currentPendingFile),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Storage Upload Timeout')), 15000))
        ]) as any;
        
        fileUrl = await getDownloadURL(uploadResult.ref);
        console.log('✅ [Project Sync] Firebase Buffer Ready:', fileUrl);
      } catch (err) {
        console.error("❌ Firebase upload failed:", err);
        throw new Error("Failed to upload to technical buffer. Please check your connection.");
      }

        // 2. Google Drive Sync (via Buffer URL to bypass 10MB limit)
      let driveFileId = "";
      try {
        const ROOT_FOLDER_ID = selectedProject.driveFolderId || process.env.VITE_GOOGLE_DRIVE_PARENT_FOLDER_ID || '1-eFit1RPNDMZ3kQ5SgGYv9IN7VV65Jt6';
        
        const drivePath = "."; // Export to root since trees are ignored
        console.log(`📡 [Project Sync] Initiating Drive Upload-by-URL protocol: ${drivePath}`);

        const driveRes = await fetch("/api/drive/upload-by-url", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectRootId: ROOT_FOLDER_ID,
            path: drivePath,
            projectCode: selectedProject.code || '16314',
            fileUrl: fileUrl,
            fileName: fullName + extension,
            mimeType: currentPendingFile.type || 'application/octet-stream'
          })
        });

        if (driveRes.ok) {
          const driveData = await driveRes.json();
          driveFileId = driveData.fileId;
          console.log('✅ [Project Sync] Google Drive Sync Successful:', driveFileId);
        } else {
          const errorText = await driveRes.text();
          console.error("❌ Drive sync failed:", errorText);
          // Don't throw here, we still have the Firebase link which is better than nothing
        }
      } catch (err) {
        console.error("❌ Google Drive sync protocol error:", err);
      }


      // 3. Save to Registry
      const newDesign: Omit<DesignFile, "id"> = {
        projectId: selectedProject.id,
        originator: currentFormData.originator,
        division: divisionObj?.div || "02.1_Architectural",
        type: (typeObj?.type || "dwg") as any,
        discipline: currentFormData.type === "DWG" ? currentFormData.discipline : undefined,
        subType: currentFormData.type === "DWG" ? currentFormData.subType : undefined,
        refNo: currentFormData.refNo,
        description: currentFormData.description,
        version: currentFormData.version,
        date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
        fullName,
        status: "Work in Progress",
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.currentUser?.displayName || auth.currentUser?.email || "System",
        size: (currentPendingFile.size / (1024 * 1024)).toFixed(2) + " MB",
        extension,
        fileUrl,
        driveFileId,
      };

      await addDoc(collection(db, "project_designs"), newDesign);
      toast.success(`${fullName} uploaded successfully`, { id: backgroundToastId });
    } catch (err) {
      console.error("Background Upload error:", err);
      toast.error(`Upload failed for ${fullName}`, { id: backgroundToastId });
    }
  };

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);

    const qDesigns = query(
      collection(db, "project_designs"),
      where("projectId", "==", selectedProject.id),
      orderBy("uploadedAt", "desc"),
    );

    const unsubDesigns = onSnapshot(qDesigns, (snapshot) => {
      setDesigns(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DesignFile[],
      );
      setLoading(false);
    });

    const qDisc = query(
      collection(db, "design_disciplines"),
      orderBy("label", "asc"),
    );
    const unsubDisc = onSnapshot(qDisc, (snap) => {
      if (snap.empty) {
        const defaults = [
          {
            label: "Architectural",
            labelAr: "معماري",
            categories: ["Plans", "Sections", "Elevations", "Details"],
          },
          {
            label: "Structural",
            labelAr: "إنشائي",
            categories: ["Foundations", "Columns", "Slabs"],
          },
          {
            label: "Mechanical",
            labelAr: "ميكانيك",
            categories: ["HVAC", "Plumbing", "Drainage"],
          },
          {
            label: "Electrical",
            labelAr: "كهرباء",
            categories: ["Lighting", "Power", "Low Current"],
          },
        ];
        defaults.forEach((d) =>
          addDoc(collection(db, "design_disciplines"), d),
        );
      } else {
        const discData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Discipline[];
        setDisciplines(discData);
        if (discData.length > 0 && !formData.discipline) {
          setFormData((f) => ({
            ...f,
            discipline: discData[0].label,
            subType: discData[0].categories[0] || "",
          }));
        }
      }
    });

    return () => {
      unsubDesigns();
      unsubDisc();
    };
  }, [selectedProject?.id]);

  // Separate useEffect for Auto-sync to ensure designs state is loaded
  const [hasSynced, setHasSynced] = useState(false);
  useEffect(() => {
    setHasSynced(false);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!loading && selectedProject?.driveFolderId && !hasSynced) {
      scanDriveFolders();
      setHasSynced(true);
    }
  }, [loading, selectedProject?.id, selectedProject?.driveFolderId, hasSynced, scanDriveFolders]);

  const handleAddDiscipline = async () => {
    if (!newDisc.label) return;
    try {
      await addDoc(collection(db, "design_disciplines"), {
        label: newDisc.label,
        labelAr: newDisc.labelAr,
        categories: [],
      });
      setNewDisc({ label: "", labelAr: "" });
      toast.success("Discipline added");
    } catch (err) {
      toast.error("Failed to add discipline");
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.label || !newCat.discId) return;
    try {
      const disc = disciplines.find((d) => d.id === newCat.discId);
      if (disc) {
        await updateDoc(doc(db, "design_disciplines", newCat.discId), {
          categories: [...disc.categories, newCat.label],
        });
        setNewCat({ discId: "", label: "" });
        toast.success("Category added");
      }
    } catch (err) {
      toast.error("Failed to add category");
    }
  };

  const handleDeleteDiscipline = async (id: string) => {
    if (!window.confirm("Delete this discipline?")) return;
    try {
      await deleteDoc(doc(db, "design_disciplines", id));
      toast.success("Discipline deleted");
    } catch (err) {
      toast.error("Failed delete");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "project_designs", id));
      toast.success("File deleted successfully");
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "project_designs", id), {
        status: "Approved",
        approvedBy:
          auth.currentUser?.displayName || auth.currentUser?.email || "System",
        updatedAt: new Date().toISOString(),
      });
      toast.success("Blueprint approved successfully");
    } catch (err) {
      toast.error("Failed to approve blueprint");
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [
      ".rvt",
      ".dwg",
      ".pdf",
      ".ifc",
      ".jpg",
      ".jpeg",
      ".png",
    ];
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      toast.error(
        `${t("invalid_file_type") || "Invalid file type"}. Allowed: .rvt, .dwg, .pdf, .ifc, .jpg, .png`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPendingFile(file);
    setIsAddOpen(true);
  };

  const filteredDesigns = designs.filter((d) => {
    const matchesType = activeType === "all" || d.type === activeType;
    const matchesDisc =
      activeType === "dwg"
        ? activeDiscipline === "all" || d.discipline === activeDiscipline
        : true;
    const matchesSub =
      activeType === "dwg" && activeDiscipline !== "all"
        ? activeSubFilter === "all" || d.subType === activeSubFilter
        : true;

    const matchesSearch =
      d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesDisc && matchesSub && matchesSearch;
  });

  const handleDownload = (file: DesignFile) => {
    if (file.fileUrl) {
      window.open(file.fileUrl, "_blank");
    } else if (file.driveFileId) {
      // Use standard Google Drive View/Download link
      window.open(`https://drive.google.com/file/d/${file.driveFileId}/view`, "_blank");
    } else {
      toast.error("File source not found");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div
      className={cn(
        "max-w-7xl mx-auto space-y-6 pb-32 px-4 pt-6",
        isRtl && "rtl",
      )}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".rvt,.dwg,.pdf,.ifc,.jpg,.jpeg,.png" 
      />
      
      <div className="flex-1 min-h-0 bg-white dark:bg-surface rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-200 dark:border-white/10">
        <UniversalDataTable
          config={{
            id: 'project_designs',
            label: t(page.id) === page.id ? page.title : t(page.id),
            icon: DraftingCompass,
            collection: 'project_designs',
            columns: [
              { 
                key: 'fullName', 
                label: 'Asset Reference', 
                type: 'string',
                render: (val, record) => (
                  <div className="flex flex-col gap-1 min-w-[250px]">
                    <span className="text-[11px] font-mono font-black text-slate-900 dark:text-white break-all group-hover:text-blue-600 transition-colors flex items-center gap-2">
                       {record.type === "dwg" ? <DraftingCompass className="w-3.5 h-3.5 text-slate-900" /> : <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />}
                       {val}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 italic uppercase tracking-wider line-clamp-1">{record.description}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded text-[9px] font-black border border-blue-100 dark:border-blue-500/20">
                        <History className="w-3 h-3" />
                        {record.version}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(record.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              },
              { key: 'originator', label: 'Originator', type: 'string' },
              { key: 'division', label: 'Classification', type: 'string' },
              { key: 'status', label: 'Status', type: 'status' },
              { key: 'size', label: 'Size', type: 'string' }
            ]
          }}
          data={filteredDesigns}
          onRowClick={handleDownload}
          onNewClick={() => {
            setFormData(prev => ({ ...prev, type: "DWG" }));
            triggerUpload();
          }}
          onDeleteRecord={(id) => {
            const file = designs.find(d => d.id === id);
            if (file) {
              setFileToDelete(file);
              setShowDeleteConfirm(true);
            }
          }}
          primaryAction={{
            label: t('upload_asset') || 'UPLOAD ASSET',
            icon: Upload,
            onClick: () => {
              setFormData(prev => ({ ...prev, type: "DWG" }));
              triggerUpload();
            }
          }}
          extraActions={
            <button 
              onClick={scanDriveFolders}
              disabled={isScanning}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              {isScanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              {isScanning ? 'Scanning...' : 'Sync Drive'}
            </button>
          }
          title={t(page.id) === page.id ? page.title : t(page.id)}
          description="Digital Asset Registry & Technical Drawings"
        />
      </div>

      {/* Hidden File Input */}
    </div>
  );
};
