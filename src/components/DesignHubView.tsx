import React, { useState, useEffect } from "react";
import {
  DraftingCompass,
  Box,
  Upload,
  FileText,
  MoreVertical,
  Trash2,
  ExternalLink,
  Eye,
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
import { cn, stripNumericPrefix } from "../lib/utils";
import { BreadcrumbHeader } from "./BreadcrumbHeader";
import { motion, AnimatePresence } from "motion/react";
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
  { code: "02.1", label: "Architectural", div: "02.1_Architectural" },
  { code: "02.2", label: "Structural", div: "02.2_Structural" },
  { code: "02.3", label: "Mechanical", div: "02.3_Mechanical" },
  { code: "02.4", label: "Electrical", div: "02.4_Electrical" },
  { code: "02.5", label: "Infra & Site", div: "02.5_Infrastructure_and_SiteWork" },
] as const;

const FILE_TYPES = [
  { code: "DWG", label: "Technical Drawing", type: "dwg" },
  { code: "IMG", label: "Visual Render", type: "3d" },
  { code: "SPE", label: "Specification", type: "specs" },
] as const;

import { FileViewerModal } from "./FileViewerModal";

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

  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DesignFile | null>(null);

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

  const generateFileName = () => {
    const projectCode = selectedProject?.code || "PROJECT";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const cleanDesc = formData.description.trim().replace(/\s+/g, "_");
    const discCode =
      formData.type === "DWG"
        ? `-${formData.discipline.substring(0, 4).toUpperCase()}`
        : "";
    return `${projectCode}-${formData.originator}${discCode}-D${formData.division}-${formData.type}-${formData.refNo}-${cleanDesc}-${formData.version}-${dateStr}`;
  };

  const [isScanning, setIsScanning] = useState(false);

  const scanDriveFolders = async () => {
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
          f.path?.includes('TECHNICAL_DIVISIONS_02') || 
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
          const nameParts = file.name.split('-');
          const isDwg = file.name.toLowerCase().includes('.dwg');
          
          // Improved division detection from path
          let detectedDivision = "02.1_Architectural";
          if (file.path?.includes('Structural')) detectedDivision = "02.2_Structural";
          if (file.path?.includes('Mechanical')) detectedDivision = "02.3_Mechanical";
          if (file.path?.includes('Electrical')) detectedDivision = "02.4_Electrical";
          if (file.path?.includes('Infrastructure')) detectedDivision = "02.5_Infrastructure_and_SiteWork";

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
          await addDoc(collection(db, "project_designs"), newDesign);
        }
        toast.success(`Registry synchronized with Drive (${uncataloged.length} new files).`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to scan: Check permissions", { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

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
      // Parallelize both uploads for efficiency
      const driveUploadPromise = (async () => {
        if (!selectedProject.driveFolderId) return "";
        try {
          const driveData = new FormData();
          driveData.append("file", currentPendingFile);
          driveData.append("projectRootId", selectedProject.driveFolderId);
          
          let subFolder = "01_Drawings";
          if (currentFormData.type === "SPE") subFolder = "02_Specifications_and_DataSheets";
          
          const drivePath = `TECHNICAL_DIVISIONS_02/${divisionObj?.div || "02.1_Architectural"}/${subFolder}`;
          driveData.append("path", drivePath);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3m timeout for slow connections

          const driveRes = await fetch("/api/drive/upload-by-path", {
            method: "POST",
            body: driveData,
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));

          const contentType = driveRes.headers.get("content-type");
          if (driveRes.ok && contentType && contentType.includes("application/json")) {
            const driveOutcome = await driveRes.json();
            return driveOutcome.fileId;
          } else {
            const text = await driveRes.text();
            console.error(`Drive upload failed with status ${driveRes.status}. Body: ${text.substring(0, 200)}`);
            return "";
          }
        } catch (err) {
          console.error("Drive upload background failed:", err);
          return "";
        }
      })();

      const firebaseUploadPromise = (async () => {
        try {
          const storageRef = ref(storage, `designs/${selectedProject.id}/${fullName}${extension}`);
          const uploadResult = await uploadBytes(storageRef, currentPendingFile);
          return await getDownloadURL(uploadResult.ref);
        } catch (err) {
          console.error("Firebase upload background failed:", err);
          return "";
        }
      })();

      const [driveFileId, fileUrl] = await Promise.all([driveUploadPromise, firebaseUploadPromise]);

      if (!driveFileId && !fileUrl) {
        throw new Error("Both upload paths failed.");
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

    // Auto-sync from Drive on mount if project changes
    if (selectedProject?.driveFolderId) {
      scanDriveFolders();
    }

    return () => {
      unsubDesigns();
      unsubDisc();
    };
  }, [selectedProject]);

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
    if (!window.confirm("Are you sure you want to delete this design file?"))
      return;
    try {
      await deleteDoc(doc(db, "project_designs", id));
      toast.success("File deleted successfully");
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
      {/* Header */}
      <BreadcrumbHeader 
        page={page} 
        className="rounded-[2.5rem] border border-slate-200"
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={scanDriveFolders}
              disabled={isScanning}
              className="flex items-center gap-3 px-5 py-4 bg-white border border-slate-200 text-slate-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
              ) : (
                <HardDrive className="w-4 h-4 text-slate-400" strokeWidth={3} />
              )}
              Sync from Drive
            </button>
            <button
              onClick={() => {
                setFormData((prev) => ({ ...prev, type: "DWG" }));
                triggerUpload();
              }}
              className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              {t("upload_digital_asset")}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-4 bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-200 transition-all active:scale-95"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Smart Upload Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />

              <div className="flex-shrink-0 mb-8 relative z-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                  {t("smart_asset_cataloging") || "Smart Asset Cataloging"}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6 relative z-10 pb-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("originator") || "Originator"}
                    </label>
                    <select
                      value={formData.originator}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          originator: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                    >
                      {ORIGINATORS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("asset_type") || "Asset Type"}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, type: val });
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                    >
                      {FILE_TYPES.map((f) => (
                        <option key={f.code} value={f.code}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.type === "DWG" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Discipline
                        </label>
                        <select
                          value={formData.discipline}
                          onChange={(e) => {
                            const disc = disciplines.find(
                              (d) => d.label === e.target.value,
                            );
                            setFormData({
                              ...formData,
                              discipline: e.target.value,
                              subType: disc?.categories[0] || "",
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                        >
                          {disciplines.map((d) => (
                            <option key={d.id} value={d.label}>
                              {isRtl ? d.labelAr : d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Drawing Classification
                        </label>
                        <select
                          value={formData.subType}
                          onChange={(e) =>
                            setFormData({ ...formData, subType: e.target.value })
                          }
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                        >
                          {disciplines
                            .find((d) => d.label === formData.discipline)
                            ?.categories.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div
                    className={cn(
                      "space-y-2",
                      formData.type !== "DWG" && "col-span-2",
                    )}
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("division") || "Division (MasterFormat)"}
                    </label>
                    <select
                      value={formData.division}
                      onChange={(e) =>
                        setFormData({ ...formData, division: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                    >
                      {DIVISIONS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.div} - {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.type !== "DWG" && <div className="hidden" />}

                  <div className="col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("ref_no") || "Reference No."}
                    </label>
                    <input
                      type="number"
                      value={formData.refNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refNo: e.target.value.padStart(3, "0"),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("description") || "Description"}
                    </label>
                    <input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="e.g. GroundFloor_Layout"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("version") || "Version"}
                    </label>
                    <select
                      value={formData.version}
                      onChange={(e) =>
                        setFormData({ ...formData, version: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                    >
                      {Array.from(
                        { length: 10 },
                        (_, i) => `V${(i + 1).toString().padStart(2, "0")}`,
                      ).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t("naming_preview") || "Naming Preview"}
                    </label>
                    <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl px-5 py-4 text-[10px] font-mono font-bold text-blue-600 break-all leading-relaxed p-4">
                      {generateFileName()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 mt-8 flex gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleSaveUpload}
                  className="flex-[2] py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                >
                  {t("confirm_catalog") || "Confirm & Catalog"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden p-6 space-y-6">
        <div
          className={cn(
            "flex flex-col lg:flex-row lg:items-center justify-between gap-6",
            isRtl && "lg:flex-row-reverse",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-full lg:w-fit",
              isRtl && "flex-row-reverse",
            )}
          >
            {[
              {
                id: "all",
                label: isRtl ? "السجل العام" : "Registry",
                icon: FileText,
              },
              {
                id: "dwg",
                label: isRtl ? "المخططات" : "Drawings",
                icon: DraftingCompass,
              },
              {
                id: "3d",
                label: isRtl ? "ريندرات" : "Renders",
                icon: ImageIcon,
              },
              {
                id: "specs",
                label: isRtl ? "مواصفات" : "Specs",
                icon: FileText,
              },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setActiveType(filter.id as any);
                  setActiveDiscipline("all");
                  setActiveSubFilter("all");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeType === filter.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <filter.icon className="w-3.5 h-3.5" />
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative group w-full lg:w-72">
            <Search
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400",
                isRtl && "left-auto right-4",
              )}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? "بحث..." : "Search..."}
              className={cn(
                "w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all",
                isRtl && "text-right pr-10 pl-4",
              )}
            />
          </div>
        </div>

        {/* File Viewer Modal */}
        {selectedFile && (
          <FileViewerModal
            isOpen={viewerOpen}
            onClose={() => setViewerOpen(false)}
            fileUrl={selectedFile.fileUrl || ""}
            fileType={
              selectedFile.extension?.replace(".", "") || selectedFile.type
            }
            fileName={selectedFile.fullName}
            details={selectedFile}
          />
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".rvt,.dwg,.pdf,.ifc,.jpg,.jpeg,.png"
        />

        <AnimatePresence>
          {activeType === "dwg" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-slate-100 overflow-hidden"
            >
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2",
                  isRtl && "flex-row-reverse",
                )}
              >
                <button
                  onClick={() => {
                    setActiveDiscipline("all");
                    setActiveSubFilter("all");
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    activeDiscipline === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                  )}
                >
                  {isRtl ? "الكل" : "All"}
                </button>
                {disciplines.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setActiveDiscipline(d.label);
                      setActiveSubFilter("all");
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      activeDiscipline === d.label
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                  >
                    {isRtl ? d.labelAr : d.label}
                  </button>
                ))}
              </div>

              {activeDiscipline !== "all" && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-2 pl-4 border-l-2 border-blue-500/20",
                    isRtl && "flex-row-reverse border-l-0 border-r-2",
                  )}
                >
                  <button
                    onClick={() => setActiveSubFilter("all")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                      activeSubFilter === "all"
                        ? "bg-amber-100 text-amber-700 font-bold"
                        : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    {isRtl ? "جميع التصنيفات" : "All Categories"}
                  </button>
                  {disciplines
                    .find((d) => d.label === activeDiscipline)
                    ?.categories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubFilter(sub)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                          activeSubFilter === sub
                            ? "bg-amber-100 text-amber-700 font-bold"
                            : "text-slate-400 hover:text-slate-600",
                        )}
                      >
                        {sub}
                      </button>
                    ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
            <div
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex-shrink-0 flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Manage Classifications
                </h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                >
                  <Box className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-4">
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Add New Discipline
                    </h3>
                    <div className="space-y-4">
                      <input
                        placeholder="Label (e.g. Interior Design)"
                        value={newDisc.label}
                        onChange={(e) =>
                          setNewDisc((p) => ({ ...p, label: e.target.value }))
                        }
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        placeholder="Label Arabic (e.g. تصميم داخلي)"
                        value={newDisc.labelAr}
                        onChange={(e) =>
                          setNewDisc((p) => ({ ...p, labelAr: e.target.value }))
                        }
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        onClick={handleAddDiscipline}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
                      >
                        Add Discipline
                      </button>
                    </div>

                    <div className="pt-8 space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Active Disciplines
                      </h3>
                      <div className="space-y-2">
                        {disciplines.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900">
                                {d.label}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {d.labelAr}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteDiscipline(d.id)}
                              className="text-slate-300 p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Add Category to Discipline
                    </h3>
                    <div className="space-y-4">
                      <select
                        value={newCat.discId}
                        onChange={(e) =>
                          setNewCat((p) => ({ ...p, discId: e.target.value }))
                        }
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select Discipline...</option>
                        {disciplines.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Category Name (e.g. Moodboards)"
                        value={newCat.label}
                        onChange={(e) =>
                          setNewCat((p) => ({ ...p, label: e.target.value }))
                        }
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                      >
                        Add Category
                      </button>
                    </div>

                    <div className="pt-8 space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Discipline Categories
                      </h3>
                      <div className="space-y-3">
                        {disciplines.map((d) => (
                          <div
                            key={d.id}
                            className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group hover:bg-white transition-all"
                          >
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest opacity-60">
                              {d.label}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {d.categories.map((cat) => (
                                <span
                                  key={cat}
                                  className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[9px] font-black text-slate-600 flex items-center gap-2 hover:border-blue-200 transition-all"
                                >
                                  {cat}
                                  <button
                                    onClick={async () => {
                                      const filtered = d.categories.filter(
                                        (c) => c !== cat,
                                      );
                                      await updateDoc(
                                        doc(db, "design_disciplines", d.id),
                                        { categories: filtered },
                                      );
                                    }}
                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {d.categories.length === 0 && (
                                <span className="text-[9px] font-medium text-slate-400 italic">No categories defined</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compact Registry List View */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th
                  className={cn(
                    "px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                    isRtl && "text-right",
                  )}
                >
                  Type
                </th>
                <th
                  className={cn(
                    "px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                    isRtl && "text-right",
                  )}
                >
                  Revision Code / Description
                </th>
                <th
                  className={cn(
                    "px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                    isRtl && "text-right",
                  )}
                >
                  Originator
                </th>
                <th
                  className={cn(
                    "px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                    isRtl && "text-right",
                  )}
                >
                  Classification
                </th>
                <th
                  className={cn(
                    "px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                    isRtl && "text-right",
                  )}
                >
                  Status
                </th>
                <th
                  className={cn(
                    "px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right",
                    isRtl && "text-left",
                  )}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredDesigns.map((design) => (
                  <motion.tr
                    key={design.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-blue-50/50 transition-all text-left cursor-pointer"
                  >
                    <td
                      className="px-6 py-5"
                      onClick={() => {
                        setSelectedFile(design);
                        setViewerOpen(true);
                      }}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110",
                          design.type === "3d"
                            ? "bg-indigo-500"
                            : design.type === "dwg"
                              ? "bg-slate-900"
                              : "bg-blue-500",
                        )}
                      >
                        {design.type === "3d" ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <DraftingCompass className="w-5 h-5" />
                        )}
                      </div>
                    </td>
                    <td
                      className="px-6 py-5"
                      onClick={() => {
                        setSelectedFile(design);
                        setViewerOpen(true);
                      }}
                    >
                      <div className="flex flex-col gap-1 min-w-[300px]">
                        <span className="text-[11px] font-mono font-black text-slate-900 break-all group-hover:text-blue-600 transition-colors">
                          {design.fullName}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 italic uppercase tracking-wider">
                          {design.description}
                        </span>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">
                            <History className="w-3 h-3" />
                            {design.version}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(design.uploadedAt).toLocaleDateString()}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">
                            {design.size}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                          {design.uploadedBy.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            {design.originator}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400">
                            {design.uploadedBy}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          {design.division}
                        </span>
                        {design.subType && (
                          <span className="text-[9px] font-bold text-blue-500/70">
                            {design.discipline} - {design.subType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit",
                          design.status === "Approved"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : design.status === "Work in Progress"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100",
                        )}
                      >
                        {design.status === "Approved" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {design.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        {design.status !== "Approved" && (
                          <button
                            onClick={() => handleApprove(design.id)}
                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(design);
                            setViewerOpen(true);
                          }}
                          className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          title="View/Inspect"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(design);
                          }}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Download Asset"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(design.id)}
                          className="p-2.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredDesigns.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {t("no_designs_found") ||
                  "No Assets found in this classification"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
