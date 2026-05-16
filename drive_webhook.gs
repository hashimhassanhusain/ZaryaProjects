/**
 * PMIS Google Drive Webhook Handler
 * 
 * يستقبل هذا السكريبت إشعارات التغييرات (Push Notifications) من مجلد Google Drive
 * ويقوم بمزامنتها مباشرة إلى قاعدة بيانات Firebase (عبر واجهة REST API).
 *
 * المتطلبات:
 * 1. نشر هذا السكريبت كتطبيق ويب (Web App) بصلوحيات "أي شخص لديه الرابط".
 * 2. التسجيل في إشعارات Google Drive عبر طلب POST إلى `https://www.googleapis.com/drive/v3/changes/watch`
 *    مع تزويد رابط (Web App URL) الخاص بهذا السكريبت كـ `address` مع الـ Channel ID.
 */

// إعدادات Firebase الخاصة بنظامك (قم بتعديلها لتطابق مشروعك)
const FIREBASE_PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID"; 
const FIREBASE_COLLECTION = "project_designs"; // اسم مجموعة الملفات كمثال
const DRIVE_FOLDER_ID = "YOUR_SHARED_DRIVE_FOLDER_ID"; // المجلد المراقب

/**
 * دالة استقبال الـ WebHooks من Google Drive
 */
function doPost(e) {
  try {
    // 1. التحقق من الترويسات للحصول على Channel ID ومعلومات الإشعار
    const headers = e.postData && e.postData.headers ? e.postData.headers : {};
    const resourceState = e.parameter['X-Goog-Resource-State'] || e.parameter['x-goog-resource-state'];
    const resourceId = e.parameter['X-Goog-Resource-ID'] || e.parameter['x-goog-resource-id'];

    if (resourceState === 'sync') {
      // رسالة التأكيد أثناء عملية التسجيل الأولية
      return ContentService.createTextOutput("Sync confirmed").setMimeType(ContentService.MimeType.TEXT);
    }

    // بمجرد حدوث تعديل في المجلد (إضافة/حذف/تعديل)
    if (resourceState === 'add' || resourceState === 'update' || resourceState === 'trash') {
      
      // ملاحظة: إشعارات Drive لا ترسل تفاصيل الملف في جسد الطلب دائماً، بل تخبرنا بأن هناك تغييراً
      // للحصول على التغييرات بدقة، يجب استدعاء Changes API باستخدام PageToken، 
      // أو كحل بسيط وداعم للبيئة يمكننا قراءة أحدث الملفات في المجلد وتحديث Firebase بها.
      
      syncFilesToFirebase();
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    console.error("Webhook Error: " + error.message);
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * دالة مزامنة صامتة في الخلفية 
 * تجلب أحدث الملفات من المجلد وترسلها إلى Firebase
 */
function syncFilesToFirebase() {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const files = folder.getFiles();
  let syncData = [];
  
  while (files.hasNext()) {
    const file = files.next();
    syncData.push({
      driveFileId: file.getId(),
      fullName: file.getName(),
      uploadedAt: file.getDateCreated().toISOString(),
      updatedAt: file.getLastUpdated().toISOString(),
      size: (file.getSize() / (1024 * 1024)).toFixed(2) + " MB",
      mimeType: file.getMimeType(),
      fileUrl: file.getUrl()
    });
  }

  // هنا نقوم بتحديث Firebase عبر REST API للوثائق
  // لأن البيانات يمكن أن تكون كثيرة، نفضل في بيئة الإنتاج استخدام حلقة وتحديث السجلات المرتبطة
  // باستخدام URL: https://firestore.googleapis.com/v1/projects/[YOUR_PROJECT_ID]/databases/(default)/documents/[COLLECTION_NAME]D
  
  syncData.forEach(function(fileData) {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${FIREBASE_COLLECTION}?documentId=${fileData.driveFileId}`;
    
    // بناء هيكل حقول Firestore REST
    const payload = {
      fields: {
        driveFileId: { stringValue: fileData.driveFileId },
        fullName: { stringValue: fileData.fullName },
        uploadedAt: { stringValue: fileData.uploadedAt },
        updatedAt: { stringValue: fileData.updatedAt },
        size: { stringValue: String(fileData.size) },
        mimeType: { stringValue: fileData.mimeType },
        fileUrl: { stringValue: fileData.fileUrl }
      }
    };

    const options = {
      method: "patch", // لضمان تحديث أو إنشاء
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch(firestoreUrl, options);
  });
}

function doGet(e) {
  return ContentService.createTextOutput("PMIS Webhook Endpoint Active");
}
