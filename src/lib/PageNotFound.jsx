export const translations = {
  ar: {
    // Layout
    dashboard: "لوحة التحكم",
    brandSetup: "إعداد البراند",
    aiPowered: "مدعوم بالذكاء الاصطناعي",
    smartContent: "محتوى احترافي بضغطة زر",
    smartContentManagement: "إدارة المحتوى الذكية",
    
    // Dashboard
    welcome: "مرحبًا بك 👋",
    manageContent: "إدارة محتوى السوشيال ميديا بالذكاء الاصطناعي",
    addBrand: "إضافة براند",
    generateContent: "توليد محتوى",
    brands: "البراندات",
    totalContent: "إجمالي المحتوى",
    published: "منشور",
    drafts: "مسودات",
    recentContent: "آخر المحتوى",
    viewAll: "عرض الكل",
    noBrands: "لا توجد براندات",
    addFirstBrand: "أضف أول براند",
    
    // BrandSetup
    defineBrand: "عرّف البراند والذكاء الاصطناعي بيحلله ويفهمه",
    addNewBrand: "إضافة براند جديد",
    editBrand: "تعديل البراند",
    newBrand: "براند جديد",
    analyzing: "يحلل...",
    description: "الوصف",
    targetAudience: "الجمهور المستهدف",
    competitors: "المنافسين",
    strengths: "نقاط القوة",
    aiAnalysis: "تحليل الذكاء الاصطناعي",
    noBrandsYet: "ما عندك براندات بعد",
    addBrandToStart: "أضف أول براند عشان تبدأ توليد محتوى",
    addBrandBtn: "إضافة براند",
    
    // Content Settings
    contentSettings: "إعدادات المحتوى",
    selectBrandYearMonth: "اختر البراند والسنة والشهر",
    selectPlatforms: "اختر المنصات",
    uploadImages: "رفع الصور",
    uploadCaption: "رفع الكابشن",
    skipCaption: "تخطي الكابشن",
    saveContent: "حفظ الآن",
    year: "السنة",
    month: "الشهر",
    brand: "البراند",
    images: "الصور",
    caption: "الكابشن",
    platforms: "المنصات",
    contentSaved: "تم حفظ المحتوى بنجاح",
    selectAtLeastOnePlatform: "اختر منصة واحدة على الأقل",
    uploadAtLeastOneImage: "رفع صورة واحدة على الأقل",
  },
  en: {
    // Layout
    dashboard: "Dashboard",
    brandSetup: "Brand Setup",
    aiPowered: "AI Powered",
    smartContent: "Professional content with one click",
    smartContentManagement: "Smart Content Management",
    
    // Dashboard
    welcome: "Welcome 👋",
    manageContent: "Manage social media content with AI",
    addBrand: "Add Brand",
    generateContent: "Generate Content",
    brands: "Brands",
    totalContent: "Total Content",
    published: "Published",
    drafts: "Drafts",
    recentContent: "Recent Content",
    viewAll: "View All",
    noBrands: "No brands",
    addFirstBrand: "Add your first brand",
    
    // BrandSetup
    defineBrand: "Define your brand and let AI analyze it",
    addNewBrand: "Add New Brand",
    editBrand: "Edit Brand",
    newBrand: "New Brand",
    analyzing: "Analyzing...",
    description: "Description",
    targetAudience: "Target Audience",
    competitors: "Competitors",
    strengths: "Strengths",
    aiAnalysis: "AI Analysis",
    noBrandsYet: "No brands yet",
    addBrandToStart: "Add your first brand to start generating content",
    addBrandBtn: "Add Brand",
    
    // Content Settings
    contentSettings: "Content Settings",
    selectBrandYearMonth: "Select Brand, Year & Month",
    selectPlatforms: "Select Platforms",
    uploadImages: "Upload Images",
    uploadCaption: "Upload Caption",
    skipCaption: "Skip Caption",
    saveContent: "Save Now",
    year: "Year",
    month: "Month",
    brand: "Brand",
    images: "Images",
    caption: "Caption",
    platforms: "Platforms",
    contentSaved: "Content saved successfully",
    selectAtLeastOnePlatform: "Select at least one platform",
    uploadAtLeastOneImage: "Upload at least one image",
  },
};

export default function PageNotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-400">Page not found</p>
      </div>
    </div>
  );
}