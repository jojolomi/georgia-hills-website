
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ── Configuration ─────────────────────────────────────────────────────────────
const defaultFirebaseConfig = {
    apiKey: "AIzaSyApLm0zacQiM1VbSQ5INRlQ28ev3QoTw2o",
    authDomain: "georgiahills-15d19.firebaseapp.com",
    projectId: "georgiahills-15d19",
    storageBucket: "georgiahills-15d19.firebasestorage.app",
    messagingSenderId: "447700508040",
    appId: "1:447700508040:web:379c32079d09523a14ae3d",
    measurementId: "G-PTEM4FPQR1",
    functionsRegion: "europe-west1",
    bookingEndpoint: "https://europe-west1-georgiahills-15d19.cloudfunctions.net/createBookingLead",
    adminApiEndpoint: "https://europe-west1-georgiahills-15d19.cloudfunctions.net/adminApi"
};

const firebaseConfig = window.__GH_FIREBASE_CONFIG || window.firebaseConfig || defaultFirebaseConfig;
if (!firebaseConfig || !firebaseConfig.apiKey) {
    document.getElementById('app').innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0e16;padding:24px">
            <div style="background:#141720;border:1px solid #1e2133;border-radius:16px;padding:32px;max-width:420px;text-align:center">
                <div style="font-size:32px;margin-bottom:12px">⚠️</div>
                <h2 style="color:#ef4444;font-size:18px;margin-bottom:8px;font-family:sans-serif">Configuration Error</h2>
                <p style="color:#8892b0;font-size:13px;font-family:sans-serif">Firebase configuration is missing. Ensure <code>firebase-config.js</code> is present or the default config is valid.</p>
            </div>
        </div>`;
    throw new Error("Firebase configuration missing");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functionsRegion = firebaseConfig.functionsRegion || "europe-west1";
const adminApiEndpoint = firebaseConfig.adminApiEndpoint
    || `https://${functionsRegion}-${firebaseConfig.projectId}.cloudfunctions.net/adminApi`;

// ── State ─────────────────────────────────────────────────────────────────────
const State = {
    user: null,
    userRole: 'viewer',
    currentTab: 'dashboard',
    destinations: [],
    articles: [],
    pages: { home: {}, about: {}, contact: {}, shared: {}, services: {} },
    pageMeta: {},
    settings: { navbar: [], contact: {}, social: {} },
    conversionStats: null,
    mediaAssets: [],
    mediaFilters: { query: '', tag: '' },
    unsavedChanges: false,
    currentEditorPage: null,
    autosaveTimers: {},
    loaded: false
};

const Security = {
    isAdmin() { return State.userRole === 'admin'; },
    canEdit() { return State.userRole === 'admin' || State.userRole === 'editor'; }
};

window.addEventListener('beforeunload', (e) => {
    if (!State.unsavedChanges) return;
    e.preventDefault();
    e.returnValue = '';
});

// ── Default Content ──────────────────────────────────────────────────────────
const DefaultContent = {
    home: {
        hero: {
            title_en: 'Discover Georgia <br><span class="text-accent-light italic font-serif">Without Limits</span>',
            title_ar: 'اكتشف جورجيا <br><span class="text-accent-light italic font-serif">مع سائق خاص</span>',
            subtitle_en: 'Premium chauffeured services and self-drive rentals. From Tbilisi to Kazbegi, experience the journey in absolute comfort.',
            subtitle_ar: 'سائقون محترفون وأسطول فاخر. من الاستقبال في المطار إلى الرحلات الجبلية.',
            bg_image: 'image-1600.webp',
            steps_title_en: 'Your Journey in 3 Steps',
            steps_title_ar: 'رحلتك في 3 خطوات',
            step1_title_en: 'Choose Your Trip', step1_title_ar: 'اختر رحلتك',
            step1_desc_en: 'Select a destination or customizing your own daily itinerary.',
            step1_desc_ar: 'اختر وجهة أو صمم مسار رحلتك اليومي الخاص.',
            step2_title_en: 'Get WhatsApp Quote', step2_title_ar: 'احصل على عرض واتساب',
            step2_desc_en: 'Receive an instant, all-inclusive price directly on your phone.',
            step2_desc_ar: 'احصل على سعر فوري شامل كلياً مباشرة على هاتفك.',
            step3_title_en: 'Meet Your Driver', step3_title_ar: 'قابل سائقك',
            step3_desc_en: 'Your professional driver will pick you up from your hotel or airport.',
            step3_desc_ar: 'سائقك المحترف سيستقبلك من فندقك أو المطار.'
        },
        about: {
            title_en: 'More Than Just A Ride, <br>It\'s Your Journey.',
            title_ar: 'أكثر من مجرد رحلة، <br>إنها مغامرتك.',
            text_en: 'Navigating Georgia\'s mountain passes requires skill and local knowledge. We provide professional, English-speaking drivers who act as your personal guide.',
            text_ar: 'تتطلب القيادة في جبال جورجيا مهارة عالية. نوفر سائقين محترفين يتحدثون الإنجليزية ويعملون كمرشدين لك.',
            image: 'Tbilisi_old_Town.webp'
        }
    },
    about: {
        hero: {
            title_en: 'Your Family\'s<br><span class="text-gradient-gold">Trusted Guide.</span>',
            title_ar: 'دليلك العائلي<br><span class="text-gradient-gold">الموثوق في جورجيا.</span>',
            subtitle_en: 'We founded Georgia Hills with one goal: to bring the warmth of Georgian hospitality to private family travel. <span class="highlight-text">Safe, professional, and personal.</span>',
            subtitle_ar: 'أسسنا جورجيا هيلز بهدف واحد: تقديم ضيافة جورجية أصيلة مع معايير نقل عائلية خاصة. <span class="highlight-text">آمن، محترف، وشخصي.</span>'
        },
        story: {
            title_en: 'More than drivers.<br>We are your Georgian hosts.',
            title_ar: 'أكثر من سائقين.<br>نحن مضيفوك في جورجيا.',
            intro_en: 'At Georgia Hills, we believe that the best way to see a country is through the eyes of a local friend.',
            intro_ar: 'في جورجيا هيلز، نؤمن بأن أفضل طريقة لرؤية البلد هي من خلال عيون صديق محلي.'
        }
    },
    services: {
        hero: {
            title_en: 'Transparent Pricing.<br><span class="text-gradient-gold">Unmatched Comfort.</span>',
            title_ar: 'الأسعار شفافة.<br><span class="text-gradient-gold">راحة لا تضاهى.</span>',
            subtitle_en: 'Professional private transport with <span class="highlight-text">no hidden fees.</span>',
            subtitle_ar: 'نقل خاص محترف بلا <span class="highlight-text">رسوم مخفية.</span>'
        },
        intro: {
            title_en: 'Everything You Need For A Perfect Trip',
            title_ar: 'كل ما تحتاجه لرحلة مثالية',
            desc_en: 'Whether you need a simple airport transfer or a full 10-day tour, we have a plan for you.',
            desc_ar: 'سواء كنت بحاجة إلى نقل بسيط من المطار أو جولة كاملة لمدة 10 أيام، لدينا خطة لك.'
        }
    },
    contact: {
        hero: {
            title_en: 'Let\'s Plan Your<br><span class="text-gradient-gold">Perfect Trip.</span>',
            title_ar: 'لنخطط لرحلتك<br><span class="text-gradient-gold">المثالية.</span>',
            subtitle_en: 'Need a custom itinerary or have a question? <span class="highlight-text">We are here to help, 24/7.</span>',
            subtitle_ar: 'هل تحتاج إلى مسار مخصص أو لديك سؤال؟ <span class="highlight-text">نحن هنا للمساعدة، 24/7.</span>'
        },
        intro: {
            title_en: 'We\'d love to hear from you',
            title_ar: 'نود أن نسمع منك',
            desc_en: 'Have a question about our fleet, pricing, or custom itineraries? Reach out to us directly.',
            desc_ar: 'هل لديك سؤال حول أسطولنا أو أسعارنا؟ تواصل معنا مباشرة.'
        }
    },
    shared: {
        footer: {
            desc_en: 'Premium transport solutions in Georgia. Safety, comfort, and local expertise.',
            desc_ar: 'حلول نقل فاخرة في جورجيا. أمان وراحة وخبرة محلية.'
        },
        trust: {
            item1_en: 'Trusted Service', item1_ar: 'خدمة موثوقة',
            item2_en: '24/7 WhatsApp Support', item2_ar: 'دعم واتساب 24/7',
            item3_en: 'Transparent Pricing', item3_ar: 'أسعار واضحة'
        },
        booking_flow: {
            title_en: 'Professional Booking Flow', title_ar: 'الحجز بطريقة احترافية',
            step1_title_en: 'Share trip details', step1_title_ar: 'أرسل تفاصيل الرحلة',
            step1_desc_en: 'Route, dates, and passenger count.', step1_desc_ar: 'المسار والتواريخ وعدد المسافرين.',
            step2_title_en: 'Get clear quote', step2_title_ar: 'استلم عرض واضح',
            step2_desc_en: 'Transparent price and service scope.', step2_desc_ar: 'سعر وخطة خدمة بدون رسوم مخفية.',
            step3_title_en: 'Confirm quickly', step3_title_ar: 'تأكيد سريع',
            step3_desc_en: 'WhatsApp confirmation with ready schedule.', step3_desc_ar: 'تأكيد واتساب وتجهيز الجدول قبل الوصول.'
        }
    },
    settings_global: {
        phone: '+995 579 08 85 37', whatsapp: '995579088537',
        email: 'info@georgiahills.com', address: 'Tbilisi, Georgia',
        social: { facebook: 'https://facebook.com/georgiahills', instagram: 'https://instagram.com/georgiahills' }
    },
    settings_navbar: [
        { label_en: 'Home', label_ar: 'الرئيسية', link: 'index.html' },
        { label_en: 'Services', label_ar: 'الخدمات', link: 'services.html' },
        { label_en: 'Guide', label_ar: 'الدليل', link: 'guide.html' },
        { label_en: 'About', label_ar: 'من نحن', link: 'about.html' },
        { label_en: 'Blog', label_ar: 'المدونة', link: 'blog.html' },
        { label_en: 'Contact', label_ar: 'اتصل بنا', link: 'contact.html' }
    ]
};

// ── Page Schemas ─────────────────────────────────────────────────────────────
const PageSchemas = {
    home: [
        { section: "Hero Section", description: "Main banner at the top of the home page.", icon: "fa-image" },
        { type: "image", key: "hero.bg_image", label: "Background Image" },
        { type: "text", key: "hero.title_en", label: "Title (English)" },
        { type: "text", key: "hero.title_ar", label: "Title (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.subtitle_en", label: "Subtitle (English)" },
        { type: "text", key: "hero.subtitle_ar", label: "Subtitle (Arabic)", dir: "rtl" },

        { section: "About Section", description: "Introduction text below the hero.", icon: "fa-circle-info" },
        { type: "image", key: "about.image", label: "About Image" },
        { type: "text", key: "about.title_en", label: "Title (English)" },
        { type: "text", key: "about.title_ar", label: "Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "about.text_en", label: "Description (English)" },
        { type: "textarea", key: "about.text_ar", label: "Description (Arabic)", dir: "rtl" },

        { section: "How It Works", description: "The 3-step process section.", icon: "fa-list-ol" },
        { type: "text", key: "hero.steps_title_en", label: "Section Title (English)" },
        { type: "text", key: "hero.steps_title_ar", label: "Section Title (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.step1_title_en", label: "Step 1 Title (English)" },
        { type: "text", key: "hero.step1_title_ar", label: "Step 1 Title (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.step1_desc_en", label: "Step 1 Desc (English)" },
        { type: "text", key: "hero.step1_desc_ar", label: "Step 1 Desc (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.step2_title_en", label: "Step 2 Title (English)" },
        { type: "text", key: "hero.step2_title_ar", label: "Step 2 Title (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.step2_desc_en", label: "Step 2 Desc (English)" },
        { type: "text", key: "hero.step2_desc_ar", label: "Step 2 Desc (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.step3_title_en", label: "Step 3 Title (English)" },
        { type: "text", key: "hero.step3_title_ar", label: "Step 3 Title (Arabic)", dir: "rtl" },
        { type: "text", key: "hero.step3_desc_en", label: "Step 3 Desc (English)" },
        { type: "text", key: "hero.step3_desc_ar", label: "Step 3 Desc (Arabic)", dir: "rtl" },

        { section: "SEO Settings", description: "Search Engine Optimization meta tags.", icon: "fa-magnifying-glass" },
        { type: "text", key: "seo.meta_title", label: "Meta Title (Browser Tab)", hint: "Max 60 chars", maxLen: 60 },
        { type: "textarea", key: "seo.meta_description", label: "Meta Description (Google Snippet)", hint: "Max 160 chars", maxLen: 160 }
    ],
    about: [
        { section: "Hero Section", description: "Top banner of the About Us page.", icon: "fa-image" },
        { type: "text", key: "hero.title_en", label: "Hero Title (English)" },
        { type: "text", key: "hero.title_ar", label: "Hero Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "hero.subtitle_en", label: "Hero Subtitle (English)" },
        { type: "textarea", key: "hero.subtitle_ar", label: "Hero Subtitle (Arabic)", dir: "rtl" },
        { section: "Our Story", description: "Main narrative text.", icon: "fa-book-open" },
        { type: "text", key: "story.title_en", label: "Story Title (English)" },
        { type: "text", key: "story.title_ar", label: "Story Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "story.intro_en", label: "Intro Paragraph (English)" },
        { type: "textarea", key: "story.intro_ar", label: "Intro Paragraph (Arabic)", dir: "rtl" },
        { section: "SEO Settings", description: "Search Engine Optimization meta tags.", icon: "fa-magnifying-glass" },
        { type: "text", key: "seo.meta_title", label: "Meta Title", maxLen: 60 },
        { type: "textarea", key: "seo.meta_description", label: "Meta Description", maxLen: 160 }
    ],
    services: [
        { section: "Hero Section", description: "Top banner of Services page.", icon: "fa-image" },
        { type: "text", key: "hero.title_en", label: "Hero Title (English)" },
        { type: "text", key: "hero.title_ar", label: "Hero Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "hero.subtitle_en", label: "Hero Subtitle (English)" },
        { type: "textarea", key: "hero.subtitle_ar", label: "Hero Subtitle (Arabic)", dir: "rtl" },
        { section: "Intro", description: "Text below the hero.", icon: "fa-align-left" },
        { type: "text", key: "intro.title_en", label: "Main Title (English)" },
        { type: "text", key: "intro.title_ar", label: "Main Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "intro.desc_en", label: "Description (English)" },
        { type: "textarea", key: "intro.desc_ar", label: "Description (Arabic)", dir: "rtl" },
        { section: "SEO Settings", description: "Search Engine Optimization meta tags.", icon: "fa-magnifying-glass" },
        { type: "text", key: "seo.meta_title", label: "Meta Title", maxLen: 60 },
        { type: "textarea", key: "seo.meta_description", label: "Meta Description", maxLen: 160 }
    ],
    contact: [
        { section: "Hero Section", description: "Top banner of Contact page.", icon: "fa-image" },
        { type: "text", key: "hero.title_en", label: "Hero Title (English)" },
        { type: "text", key: "hero.title_ar", label: "Hero Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "hero.subtitle_en", label: "Hero Subtitle (English)" },
        { type: "textarea", key: "hero.subtitle_ar", label: "Hero Subtitle (Arabic)", dir: "rtl" },
        { section: "Intro", description: "Text below the hero.", icon: "fa-align-left" },
        { type: "text", key: "intro.title_en", label: "Main Title (English)" },
        { type: "text", key: "intro.title_ar", label: "Main Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "intro.desc_en", label: "Description (English)" },
        { type: "textarea", key: "intro.desc_ar", label: "Description (Arabic)", dir: "rtl" },
        { section: "SEO Settings", description: "Search Engine Optimization meta tags.", icon: "fa-magnifying-glass" },
        { type: "text", key: "seo.meta_title", label: "Meta Title", maxLen: 60 },
        { type: "textarea", key: "seo.meta_description", label: "Meta Description", maxLen: 160 }
    ],
    shared: [
        { section: "Footer", description: "Content appearing in the site footer.", icon: "fa-layer-group" },
        { type: "textarea", key: "footer.desc_en", label: "Footer Description (English)" },
        { type: "textarea", key: "footer.desc_ar", label: "Footer Description (Arabic)", dir: "rtl" },
        { section: "Trust Strip", description: "Icons and text above the footer on secondary pages.", icon: "fa-shield-halved" },
        { type: "text", key: "trust.item1_en", label: "Item 1 (English)" },
        { type: "text", key: "trust.item1_ar", label: "Item 1 (Arabic)", dir: "rtl" },
        { type: "text", key: "trust.item2_en", label: "Item 2 (English)" },
        { type: "text", key: "trust.item2_ar", label: "Item 2 (Arabic)", dir: "rtl" },
        { type: "text", key: "trust.item3_en", label: "Item 3 (English)" },
        { type: "text", key: "trust.item3_ar", label: "Item 3 (Arabic)", dir: "rtl" },
        { section: "Booking Flow", description: "The 3-step booking section on secondary pages.", icon: "fa-list-ol" },
        { type: "text", key: "booking_flow.title_en", label: "Section Title (English)" },
        { type: "text", key: "booking_flow.title_ar", label: "Section Title (Arabic)", dir: "rtl" },
        { type: "text", key: "booking_flow.step1_title_en", label: "Step 1 Title (English)" },
        { type: "text", key: "booking_flow.step1_title_ar", label: "Step 1 Title (Arabic)", dir: "rtl" },
        { type: "text", key: "booking_flow.step1_desc_en", label: "Step 1 Desc (English)" },
        { type: "text", key: "booking_flow.step1_desc_ar", label: "Step 1 Desc (Arabic)", dir: "rtl" },
        { type: "text", key: "booking_flow.step2_title_en", label: "Step 2 Title (English)" },
        { type: "text", key: "booking_flow.step2_title_ar", label: "Step 2 Title (Arabic)", dir: "rtl" },
        { type: "text", key: "booking_flow.step2_desc_en", label: "Step 2 Desc (English)" },
        { type: "text", key: "booking_flow.step2_desc_ar", label: "Step 2 Desc (Arabic)", dir: "rtl" },
        { type: "text", key: "booking_flow.step3_title_en", label: "Step 3 Title (English)" },
        { type: "text", key: "booking_flow.step3_title_ar", label: "Step 3 Title (Arabic)", dir: "rtl" },
        { type: "text", key: "booking_flow.step3_desc_en", label: "Step 3 Desc (English)" },
        { type: "text", key: "booking_flow.step3_desc_ar", label: "Step 3 Desc (Arabic)", dir: "rtl" }
    ]
};

// ── Data Layer (unchanged) ───────────────────────────────────────────────────
const Data = {
    adminApiHealthy: true,

    async callAdminApi(action, payload = {}) {
        const user = auth.currentUser;
        if (!user) throw new Error("Authentication required");
        const token = await user.getIdToken();
        const response = await fetch(adminApiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ action, payload })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
            this.adminApiHealthy = false;
            throw new Error(result.message || result.error || "Admin API request failed");
        }
        this.adminApiHealthy = true;
        return result;
    },

    async loadAll() {
        const tasks = [
            this.fetchDestinations(), this.fetchArticles(), this.fetchSettings(),
            this.fetchPage('home'), this.fetchPage('about'), this.fetchPage('services'),
            this.fetchPage('contact'), this.fetchPage('shared'),
            this.fetchConversionStats(), this.fetchMediaLibrary()
        ];
        const results = await Promise.allSettled(tasks);
        const failed = results.filter(r => r.status === "rejected");
        if (failed.length > 0) console.warn(`[Admin] Partial load: ${failed.length} task(s) failed`);
        State.loaded = true;
    },

    async fetchDestinations() {
        const snap = await getDocs(collection(db, "destinations"));
        State.destinations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async fetchArticles() {
        const q = query(collection(db, "articles"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        State.articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async fetchSettings() {
        try {
            const navSnap = await getDoc(doc(db, "settings", "navbar"));
            if (navSnap.exists()) State.settings.navbar = navSnap.data().items || [];
        } catch (e) { console.warn("Navbar settings not found", e); }
        try {
            const contactSnap = await getDoc(doc(db, "settings", "contact"));
            if (contactSnap.exists()) {
                const data = contactSnap.data();
                State.settings.contact = data || {};
                State.settings.social = data.social || {};
            }
        } catch (e) { console.warn("Contact settings not found", e); }
    },

    async fetchPage(pageId) {
        try {
            const pageRes = await this.callAdminApi("getPageEditor", { pageId });
            const fallback = DefaultContent[pageId] ? JSON.parse(JSON.stringify(DefaultContent[pageId])) : {};
            State.pages[pageId] = pageRes.draft && Object.keys(pageRes.draft).length ? pageRes.draft : (pageRes.published || fallback);
            State.pageMeta[pageId] = {
                published: pageRes.published || {}, status: pageRes.status || "draft",
                updatedAt: pageRes.updatedAt || null, publishedAt: pageRes.publishedAt || null,
                lastPublishNote: pageRes.lastPublishNote || '', lastChangeSummary: pageRes.lastChangeSummary || '',
                revisions: pageRes.revisions || []
            };
        } catch (e) {
            try {
                const fallbackSnap = await getDoc(doc(db, "settings", `page_${pageId}`));
                State.pages[pageId] = fallbackSnap.exists() ? fallbackSnap.data() : (DefaultContent[pageId] ? JSON.parse(JSON.stringify(DefaultContent[pageId])) : {});
            } catch (_e2) {
                State.pages[pageId] = DefaultContent[pageId] ? JSON.parse(JSON.stringify(DefaultContent[pageId])) : {};
            }
            State.pageMeta[pageId] = { revisions: [], status: "draft" };
        }
    },

    async saveDestination(destId, data) {
        const result = await this.callAdminApi("upsertDestination", { id: destId || null, data });
        await this.fetchDestinations();
        return result.id;
    },
    async saveArticle(id, data) {
        const result = await this.callAdminApi("upsertArticle", { id: id || null, data });
        await this.fetchArticles();
        return result.id;
    },
    async deleteDestination(destId) {
        await this.callAdminApi("deleteDestination", { id: destId });
        await this.fetchDestinations();
    },
    async deleteArticle(id) {
        await this.callAdminApi("deleteArticle", { id });
        await this.fetchArticles();
    },
    async saveSettings(type, data) {
        await this.callAdminApi("saveSettings", { type, data });
        if (type === 'navbar') State.settings.navbar = data.items;
        if (type === 'contact') { State.settings.contact = data; State.settings.social = data.social; }
    },
    async savePage(pageId, data) {
        await this.callAdminApi("savePageDraft", { pageId, data });
        State.pages[pageId] = data;
        await this.fetchPage(pageId);
    },
    async publishPage(pageId, options = {}) {
        await this.callAdminApi("publishPage", { pageId, note: options.note || "", changeSummary: options.changeSummary || "" });
        await this.fetchPage(pageId);
    },
    async rollbackPage(pageId, revisionId, publishNow = false) {
        await this.callAdminApi("rollbackPage", { pageId, revisionId, publishNow });
        await this.fetchPage(pageId);
    },
    async uploadImage(file, path) {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        try { await this.saveMediaMeta(url, [], ''); } catch (_e) {}
        return url;
    },
    async fetchLogs() {
        try { const r = await this.callAdminApi("getAuditLogs", { limit: 8 }); return r.logs || []; }
        catch (e) { console.warn("[Admin] Audit logs unavailable", e.message); return []; }
    },
    async fetchConversionStats() {
        try { const r = await this.callAdminApi("getConversionDashboard", { days: 30 }); State.conversionStats = r; }
        catch (e) { State.conversionStats = null; }
    },
    async fetchMediaLibrary() {
        try {
            const r = await this.callAdminApi("getMediaLibrary", { query: State.mediaFilters.query || "", tag: State.mediaFilters.tag || "" });
            State.mediaAssets = r.assets || [];
        } catch (e) { State.mediaAssets = []; }
    },
    async saveMediaMeta(url, tags = [], alt = "") { await this.callAdminApi("saveMediaMeta", { url, tags, alt }); },
    async replaceMediaAsset(oldUrl, newUrl) { return this.callAdminApi("replaceMediaAsset", { oldUrl, newUrl }); },
    async schedulePublish(pageId, scheduledAt, note = "", changeSummary = "") {
        return this.callAdminApi("schedulePublish", { pageId, scheduledAt, note, changeSummary });
    },
    async runScheduledPublishes() { return this.callAdminApi("runScheduledPublishes", {}); }
};

// ═════════════════════════════════════════════════════════════════════════════
// UI LAYER — Premium Reconstruction
// ═════════════════════════════════════════════════════════════════════════════
const UI = {

    // ── Toast ───────────────────────────────────────────────────────────────
    toast(msg, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icons = { success: 'fa-circle-check', error: 'fa-triangle-exclamation', warning: 'fa-circle-exclamation', info: 'fa-circle-info' };
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
        const el = document.createElement('div');
        el.className = `toast-item ${type}`;
        el.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info} toast-icon" style="color:${colors[type]}"></i>
            <span class="toast-msg">${Admin.escapeHtml(msg)}</span>
            <button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="fa-solid fa-xmark"></i></button>
            <div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
        container.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 280); }, duration);
    },

    // ── Modal ───────────────────────────────────────────────────────────────
    openModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const panel = document.getElementById('modal-panel');
        if (!backdrop || !panel) return;
        backdrop.classList.add('visible');
        requestAnimationFrame(() => panel.classList.add('visible'));
        document.addEventListener('keydown', this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); }, { once: true });
    },
    closeModal() {
        const backdrop = document.getElementById('modal-backdrop');
        const panel = document.getElementById('modal-panel');
        if (!backdrop || !panel) return;
        panel.classList.remove('visible');
        backdrop.classList.remove('visible');
        setTimeout(() => { if (panel) panel.innerHTML = ''; }, 350);
    },

    // ── Loading ─────────────────────────────────────────────────────────────
    showLoading() {
        document.getElementById('app').innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span class="spinner-text">Authenticating…</span>
            </div>`;
    },

    // ── Login ───────────────────────────────────────────────────────────────
    renderLogin() {
        document.getElementById('app').innerHTML = `
            <div class="login-page">
                <div class="login-bg-orb login-bg-orb-1"></div>
                <div class="login-bg-orb login-bg-orb-2"></div>
                <div class="login-card">
                    <div class="login-logo-wrap">
                        <div class="login-logo-icon">GH</div>
                        <div class="login-title">Georgia Hills</div>
                        <div class="login-sub">Admin Control Panel</div>
                    </div>
                    <form id="login-form" autocomplete="on">
                        <div class="login-field">
                            <label class="login-label" for="login-email">Email Address</label>
                            <input id="login-email" type="email" name="email" required
                                class="login-input" placeholder="admin@georgiahills.com" autocomplete="username">
                        </div>
                        <div class="login-field">
                            <label class="login-label" for="login-password">Password</label>
                            <input id="login-password" type="password" name="password" required
                                class="login-input" placeholder="••••••••••" autocomplete="current-password">
                        </div>
                        <button type="submit" class="login-btn" id="login-submit">
                            <i class="fa-solid fa-arrow-right-to-bracket"></i>
                            Sign In to Admin
                        </button>
                        <div id="login-error" style="display:none"></div>
                    </form>
                    <div style="margin-top:24px;text-align:center;font-size:11px;color:#3a3f55">
                        Protected access. Unauthorized access prohibited.
                    </div>
                </div>
            </div>`;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-submit');
            const errEl = document.getElementById('login-error');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';
            btn.disabled = true;
            errEl.style.display = 'none';
            try {
                await signInWithEmailAndPassword(auth,
                    document.getElementById('login-email').value,
                    document.getElementById('login-password').value
                );
            } catch (err) {
                errEl.className = 'login-error';
                errEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${err.message}`;
                errEl.style.display = 'flex';
                btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Admin';
                btn.disabled = false;
            }
        });
    },

    // ── Sidebar item ─────────────────────────────────────────────────────────
    renderSidebarItem(tab, icon, label, active = false) {
        return `
            <button class="sb-item${active ? ' active' : ''}" onclick="window.Admin.switchTab('${tab}')" data-tab="${tab}">
                <span class="sb-item-icon"><i class="fa-solid ${icon}"></i></span>
                <span class="sb-item-label">${label}</span>
            </button>`;
    },

    // ── Layout ───────────────────────────────────────────────────────────────
    renderLayout() {
        const t = State.currentTab;
        const userInitial = (State.user?.email || 'A')[0].toUpperCase();

        document.getElementById('app').innerHTML = `
        <div class="admin-shell">
            <!-- Sidebar -->
            <aside class="admin-sidebar" id="sidebar">
                <div class="sb-logo">
                    <div class="sb-logo-mark">GH</div>
                    <div class="sb-logo-text">
                        <span class="sb-logo-title">Georgia Hills</span>
                        <span class="sb-logo-sub">Admin Panel</span>
                    </div>
                </div>

                <nav class="sb-nav sb-scroll">
                    ${this.renderSidebarItem('dashboard', 'fa-chart-pie', 'Overview', t === 'dashboard')}

                    <div class="sb-section-label">Content</div>
                    ${this.renderSidebarItem('page-home', 'fa-house', 'Home Page', t === 'page-home')}
                    ${this.renderSidebarItem('destinations', 'fa-map-location-dot', 'Destinations', t === 'destinations')}
                    ${this.renderSidebarItem('articles', 'fa-newspaper', 'Blog & Articles', t === 'articles')}
                    ${this.renderSidebarItem('page-about', 'fa-circle-info', 'About Page', t === 'page-about')}
                    ${this.renderSidebarItem('page-services', 'fa-briefcase', 'Services Page', t === 'page-services')}
                    ${this.renderSidebarItem('page-contact', 'fa-envelope', 'Contact Page', t === 'page-contact')}
                    ${this.renderSidebarItem('page-shared', 'fa-layer-group', 'Shared Content', t === 'page-shared')}
                    ${this.renderSidebarItem('media-library', 'fa-photo-film', 'Media Library', t === 'media-library')}

                    ${Security.isAdmin() ? `
                    <div class="sb-section-label">Configuration</div>
                    ${this.renderSidebarItem('settings-global', 'fa-globe', 'Global Settings', t === 'settings-global')}
                    ${this.renderSidebarItem('settings-navbar', 'fa-bars', 'Navigation Menu', t === 'settings-navbar')}
                    ` : ''}
                </nav>

                <div class="sb-footer">
                    <div class="sb-user">
                        <div class="sb-avatar">${userInitial}</div>
                        <div class="sb-user-info">
                            <div class="sb-user-name">${Admin.escapeHtml(State.user?.email || 'Admin User')}</div>
                            <div class="sb-user-role">${State.userRole}</div>
                        </div>
                    </div>
                    <button class="sb-logout" onclick="window.Admin.logout()">
                        <i class="fa-solid fa-arrow-right-from-bracket" style="width:18px;text-align:center"></i>
                        <span class="sb-logout-label">Sign Out</span>
                    </button>
                </div>
            </aside>

            <!-- Main -->
            <div class="admin-main">
                <header class="admin-header">
                    <div class="admin-header-left">
                        <button class="mobile-menu-btn" onclick="window.Admin.openMobileSidebar()">
                            <i class="fa-solid fa-bars"></i>
                        </button>
                        <button onclick="window.Admin.toggleSidebar()" class="header-btn header-btn-ghost" title="Toggle sidebar" style="display:flex">
                            <i class="fa-solid fa-sidebar" style="font-size:15px"></i>
                        </button>
                        <span class="header-title" id="header-title">${this._tabLabel(t)}</span>
                    </div>
                    <div class="admin-header-right">
                        <div class="header-status">
                            <div class="header-status-dot"></div>
                            <span>Live</span>
                        </div>
                        <a href="/" target="_blank" class="header-btn header-btn-ghost">
                            <i class="fa-solid fa-external-link-alt"></i>
                            View Site
                        </a>
                    </div>
                </header>
                <main class="admin-content fade-in" id="main-content"></main>
            </div>
        </div>`;

        this.loadTab(State.currentTab);
    },

    _tabLabel(tab) {
        const labels = {
            'dashboard': 'Overview', 'destinations': 'Destinations', 'articles': 'Blog & Articles',
            'page-home': 'Home Page', 'page-about': 'About Page', 'page-services': 'Services Page',
            'page-contact': 'Contact Page', 'page-shared': 'Shared Content', 'media-library': 'Media Library',
            'settings-global': 'Global Settings', 'settings-navbar': 'Navigation Menu'
        };
        return labels[tab] || tab;
    },

    async loadTab(tab) {
        if (tab !== State.currentTab && State.unsavedChanges) {
            if (!confirm('You have unsaved changes. Leave this page?')) return;
            State.unsavedChanges = false;
        }
        if (!Security.isAdmin() && (tab === 'settings-global' || tab === 'settings-navbar')) {
            UI.toast("Only admins can access configuration.", "error");
            tab = 'dashboard';
        }

        State.currentTab = tab;
        const content = document.getElementById('main-content');
        const headerTitle = document.getElementById('header-title');
        if (headerTitle) headerTitle.textContent = this._tabLabel(tab);

        // Update active sidebar items
        document.querySelectorAll('.sb-item[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        if (content) {
            content.classList.remove('fade-in');
            void content.offsetWidth;
            content.classList.add('fade-in');
        }

        switch (tab) {
            case 'dashboard': await this.renderDashboard(content); break;
            case 'destinations': this.renderDestinations(content); break;
            case 'articles': this.renderArticles(content); break;
            case 'page-home': Admin.renderPageEditor(content, 'home'); break;
            case 'page-about': Admin.renderPageEditor(content, 'about'); break;
            case 'page-services': Admin.renderPageEditor(content, 'services'); break;
            case 'page-contact': Admin.renderPageEditor(content, 'contact'); break;
            case 'page-shared': Admin.renderPageEditor(content, 'shared'); break;
            case 'media-library': await this.renderMediaLibrary(content); break;
            case 'settings-global': this.renderGlobalSettings(content); break;
            case 'settings-navbar': this.renderNavbarSettings(content); break;
            default: content.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Page Not Found</div><div class="empty-desc">Tab "${tab}" doesn't exist.</div></div>`;
        }
    },

    // ── Dashboard ────────────────────────────────────────────────────────────
    async renderDashboard(container) {
        const destCount = State.destinations.length;
        const activeDestCount = State.destinations.filter(d => d.active !== false).length;
        const articleCount = State.articles.length;
        const conv = State.conversionStats?.totals || { bookings: 0, en: 0, ar: 0 };
        const contactConfigured = State.settings.contact?.phone ? true : false;

        container.innerHTML = `
        <div class="space-y">
            <!-- KPI Row -->
            <div class="grid-4">
                <div class="kpi-card" style="--kpi-color:#3b82f6" id="kpi-dest">
                    <div class="kpi-info">
                        <div class="kpi-label">Destinations</div>
                        <div class="kpi-value">${destCount}</div>
                        <div class="kpi-sub">
                            <span class="kpi-badge green"><i class="fa-solid fa-circle" style="font-size:6px"></i> ${activeDestCount} active</span>
                        </div>
                    </div>
                    <div class="kpi-icon" style="background:#eff6ff;color:#3b82f6">
                        <i class="fa-solid fa-map-location-dot"></i>
                    </div>
                </div>
                <div class="kpi-card" style="--kpi-color:#8b5cf6">
                    <div class="kpi-info">
                        <div class="kpi-label">Blog Articles</div>
                        <div class="kpi-value">${articleCount}</div>
                        <div class="kpi-sub">Published posts</div>
                    </div>
                    <div class="kpi-icon" style="background:#f5f3ff;color:#8b5cf6">
                        <i class="fa-solid fa-newspaper"></i>
                    </div>
                </div>
                <div class="kpi-card" style="--kpi-color:#10b981">
                    <div class="kpi-info">
                        <div class="kpi-label">30d Booking Leads</div>
                        <div class="kpi-value">${conv.bookings}</div>
                        <div class="kpi-sub">EN: ${conv.en} &nbsp;|&nbsp; AR: ${conv.ar}</div>
                    </div>
                    <div class="kpi-icon" style="background:#ecfdf5;color:#10b981">
                        <i class="fa-solid fa-bullseye"></i>
                    </div>
                </div>
                <div class="kpi-card" style="--kpi-color:${contactConfigured ? '#10b981' : '#f59e0b'}">
                    <div class="kpi-info">
                        <div class="kpi-label">Contact Info</div>
                        <div class="kpi-value" style="font-size:16px;line-height:1.4;padding-top:4px">${contactConfigured ? 'Configured' : 'Needs Setup'}</div>
                        <div class="kpi-sub"><span class="kpi-badge ${contactConfigured ? 'green' : 'amber'}">${contactConfigured ? '✓ Ready' : '⚠ Action needed'}</span></div>
                    </div>
                    <div class="kpi-icon" style="background:${contactConfigured ? '#ecfdf5' : '#fffbeb'};color:${contactConfigured ? '#10b981' : '#f59e0b'}">
                        <i class="fa-solid fa-address-card"></i>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
                <!-- Quick Actions -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon" style="background:#fef9ec;color:#c9a227"><i class="fa-solid fa-bolt"></i></div>
                            Quick Actions
                        </div>
                    </div>
                    <div class="card-p">
                        <div class="quick-grid">
                            <button class="quick-btn" onclick="window.Admin.openDestinationModal()">
                                <div class="quick-btn-icon" style="background:#eff6ff;color:#3b82f6"><i class="fa-solid fa-plus"></i></div>
                                <span class="quick-btn-label">Add Destination</span>
                            </button>
                            <button class="quick-btn" onclick="window.Admin.switchTab('page-home')">
                                <div class="quick-btn-icon" style="background:#f5f3ff;color:#8b5cf6"><i class="fa-solid fa-house"></i></div>
                                <span class="quick-btn-label">Edit Home</span>
                            </button>
                            <button class="quick-btn" onclick="window.Admin.openArticleModal()">
                                <div class="quick-btn-icon" style="background:#fff7ed;color:#ea580c"><i class="fa-solid fa-pen-nib"></i></div>
                                <span class="quick-btn-label">Write Article</span>
                            </button>
                            <button class="quick-btn" onclick="window.Admin.switchTab('media-library')">
                                <div class="quick-btn-icon" style="background:#ecfdf5;color:#10b981"><i class="fa-solid fa-photo-film"></i></div>
                                <span class="quick-btn-label">Media Library</span>
                            </button>
                            <button class="quick-btn" ${Security.isAdmin() ? '' : 'disabled'} onclick="window.Admin.switchTab('settings-global')">
                                <div class="quick-btn-icon" style="background:#fef2f2;color:#ef4444"><i class="fa-solid fa-phone"></i></div>
                                <span class="quick-btn-label">Contact Info</span>
                            </button>
                            <button class="quick-btn" onclick="window.open('/','_blank')">
                                <div class="quick-btn-icon" style="background:#f8fafc;color:#64748b"><i class="fa-solid fa-external-link-alt"></i></div>
                                <span class="quick-btn-label">View Live Site</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- System Health -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon" style="background:#ecfdf5;color:#10b981"><i class="fa-solid fa-heart-pulse"></i></div>
                            System Health
                        </div>
                    </div>
                    <div class="card-p" style="display:flex;flex-direction:column;gap:10px">
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px">
                            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#065f46">
                                <div style="width:7px;height:7px;background:#10b981;border-radius:50%;animation:pulse-green 2s infinite"></div>
                                Firestore Connected
                            </div>
                            <i class="fa-solid fa-database" style="color:#10b981;font-size:12px"></i>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">
                            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#1d4ed8">
                                <div style="width:7px;height:7px;background:#3b82f6;border-radius:50%"></div>
                                Auth Active
                            </div>
                            <i class="fa-solid fa-shield-halved" style="color:#3b82f6;font-size:12px"></i>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:${Data.adminApiHealthy ? '#ecfdf5' : '#fef2f2'};border:1px solid ${Data.adminApiHealthy ? '#a7f3d0' : '#fecaca'};border-radius:8px">
                            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:${Data.adminApiHealthy ? '#065f46' : '#991b1b'}">
                                <div style="width:7px;height:7px;background:${Data.adminApiHealthy ? '#10b981' : '#ef4444'};border-radius:50%"></div>
                                Admin API
                            </div>
                            <i class="fa-solid fa-server" style="color:${Data.adminApiHealthy ? '#10b981' : '#ef4444'};font-size:12px"></i>
                        </div>
                        <div style="margin-top:8px;padding-top:12px;border-top:1px solid #e2e8f0">
                            <div style="font-size:11px;color:#64748b;margin-bottom:6px;font-weight:500">Storage usage (est.)</div>
                            <div style="background:#e2e8f0;border-radius:99px;height:5px;overflow:hidden">
                                <div style="width:15%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);height:100%;border-radius:99px"></div>
                            </div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:4px;text-align:right">~15% used</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="card" id="activity-card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon" style="background:#fef9ec;color:#c9a227"><i class="fa-solid fa-clock-rotate-left"></i></div>
                        Recent Activity
                    </div>
                    <button onclick="window.Admin.switchTab('dashboard')" class="btn btn-ghost btn-sm">
                        <i class="fa-solid fa-rotate"></i> Refresh
                    </button>
                </div>
                <div class="card-p" id="activity-body">
                    <div style="display:flex;gap:12px;align-items:center;padding:8px 0">
                        <div class="skeleton" style="width:28px;height:28px;border-radius:7px;flex-shrink:0"></div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                            <div class="skeleton" style="height:12px;width:60%;border-radius:4px"></div>
                            <div class="skeleton" style="height:10px;width:40%;border-radius:4px"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // Animate KPI cards
        setTimeout(() => {
            document.querySelectorAll('.kpi-card').forEach((c, i) => {
                setTimeout(() => c.classList.add('loaded'), i * 80);
            });
        }, 100);

        // Load activity asynchronously
        const logs = await Data.fetchLogs();
        const actBody = document.getElementById('activity-body');
        if (actBody) {
            if (logs.length === 0) {
                actBody.innerHTML = `<div class="empty-state" style="padding:32px"><div class="empty-icon" style="width:48px;height:48px;font-size:20px">📋</div><div class="empty-title" style="font-size:14px">No recent activity</div><div class="empty-desc">Actions will appear here as you make changes.</div></div>`;
            } else {
                const actColors = { publish: ['#ecfdf5','#10b981','fa-cloud-arrow-up'], save: ['#eff6ff','#3b82f6','fa-floppy-disk'], delete: ['#fef2f2','#ef4444','fa-trash'], default: ['#f8fafc','#64748b','fa-circle-dot'] };
                actBody.innerHTML = logs.map(log => {
                    const action = (log.action || '').toLowerCase();
                    const [bg, color, icon] = actColors[Object.keys(actColors).find(k => action.includes(k))] || actColors.default;
                    const time = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';
                    return `
                        <div class="activity-item">
                            <div class="activity-icon" style="background:${bg};color:${color}"><i class="fa-solid ${icon}"></i></div>
                            <div class="activity-body">
                                <div class="activity-action">${Admin.escapeHtml(log.action || '').replace(/_/g, ' ')}</div>
                                <div class="activity-detail">${Admin.escapeHtml(log.details || log.userEmail || '')}</div>
                            </div>
                            <div class="activity-time">${time}</div>
                        </div>`;
                }).join('');
            }
        }
    },

    // ── Destinations ─────────────────────────────────────────────────────────
    renderDestinations(container) {
        container.innerHTML = `
        <div class="space-y">
            <div class="page-section-header">
                <div>
                    <div class="page-section-title">Destinations</div>
                    <div class="page-section-sub">Manage tour packages and locations shown on the website</div>
                </div>
                <button class="btn btn-primary" onclick="window.Admin.openDestinationModal()">
                    <i class="fa-solid fa-plus"></i> Add Destination
                </button>
            </div>

            ${State.destinations.length === 0 ? `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-icon">📍</div>
                    <div class="empty-title">No Destinations Yet</div>
                    <div class="empty-desc">Add your first destination to start building your tour catalogue.</div>
                    <button class="btn btn-primary" onclick="window.Admin.openDestinationModal()" style="margin-top:8px">
                        <i class="fa-solid fa-plus"></i> Add First Destination
                    </button>
                </div>
            </div>` : `
            <div class="dest-grid">
                ${State.destinations.map(dest => {
                    const e = (s) => Admin.escapeHtml(s);
                    const isActive = dest.active !== false;
                    return `
                    <div class="dest-card">
                        <div class="dest-card-img">
                            <img src="${e(dest.thumbnail || '')}" onerror="this.src='https://placehold.co/600x320/1e2133/8892b0?text=No+Image'" loading="lazy" alt="${e(dest.title?.en || '')}">
                            <div class="dest-card-overlay">
                                <button onclick="window.Admin.openDestinationModal('${e(dest.id)}')" class="btn btn-ghost btn-sm" style="background:rgba(255,255,255,0.9)">
                                    <i class="fa-solid fa-pen"></i> Edit
                                </button>
                                ${Security.isAdmin() ? `<button onclick="window.Admin.deleteDestination('${e(dest.id)}')" class="btn btn-danger btn-sm">
                                    <i class="fa-solid fa-trash"></i>
                                </button>` : ''}
                            </div>
                        </div>
                        <div class="dest-card-body">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                                <div class="dest-card-title">${e(dest.title?.en || 'Untitled Destination')}</div>
                                <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? 'Active' : 'Hidden'}</span>
                            </div>
                            <div class="dest-card-desc">${e(dest.desc?.en || 'No description provided.')}</div>
                            ${dest.price || dest.duration ? `
                            <div style="display:flex;gap:8px;flex-wrap:wrap">
                                ${dest.price ? `<span class="badge badge-blue"><i class="fa-solid fa-tag"></i> ${e(dest.price)}</span>` : ''}
                                ${dest.duration ? `<span class="badge badge-violet"><i class="fa-solid fa-clock"></i> ${e(dest.duration)}</span>` : ''}
                            </div>` : ''}
                        </div>
                        <div class="dest-card-footer">
                            <span class="dest-id font-mono">${e(dest.id)}</span>
                            <button onclick="window.Admin.openDestinationModal('${e(dest.id)}')" class="btn btn-ghost btn-sm">
                                Edit Details <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`}
        </div>`;
    },

    // ── Articles ─────────────────────────────────────────────────────────────
    renderArticles(container) {
        container.innerHTML = `
        <div class="space-y">
            <div class="page-section-header">
                <div>
                    <div class="page-section-title">Blog & Articles</div>
                    <div class="page-section-sub">Manage travel guides and news posts</div>
                </div>
                <button class="btn btn-primary" onclick="window.Admin.openArticleModal()">
                    <i class="fa-solid fa-pen-nib"></i> Write New Article
                </button>
            </div>

            ${State.articles.length === 0 ? `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-icon">📰</div>
                    <div class="empty-title">No Articles Yet</div>
                    <div class="empty-desc">Write your first blog post to attract visitors and improve SEO.</div>
                    <button class="btn btn-primary" onclick="window.Admin.openArticleModal()" style="margin-top:8px">
                        <i class="fa-solid fa-pen-nib"></i> Write First Article
                    </button>
                </div>
            </div>` : `
            <div class="card">
                <div style="overflow:hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:60px"></th>
                                <th>Article</th>
                                <th>Date</th>
                                <th>Arabic Title</th>
                                <th style="width:100px">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${State.articles.map(art => `
                            <tr>
                                <td>
                                    <img src="${Admin.escapeHtml(art.image || '')}" onerror="this.src='https://placehold.co/60x60/f0f3f9/64748b?text=?'"
                                        style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0">
                                </td>
                                <td>
                                    <div class="td-strong">${Admin.escapeHtml(art.title?.en || 'Untitled')}</div>
                                    <div style="font-size:11px;color:#64748b;margin-top:2px">${Admin.escapeHtml((art.excerpt?.en || '').substring(0, 80))}${(art.excerpt?.en || '').length > 80 ? '…' : ''}</div>
                                </td>
                                <td style="white-space:nowrap;color:#64748b;font-size:12px">${Admin.escapeHtml(art.date || '—')}</td>
                                <td style="direction:rtl;text-align:right;font-size:12px">${Admin.escapeHtml(art.title?.ar || '—')}</td>
                                <td>
                                    <div style="display:flex;gap:6px">
                                        <button onclick="window.Admin.openArticleModal('${art.id}')" class="btn btn-ghost btn-sm btn-icon" title="Edit">
                                            <i class="fa-solid fa-pen"></i>
                                        </button>
                                        ${Security.isAdmin() ? `<button onclick="window.Admin.deleteArticle('${art.id}')" class="btn btn-danger btn-sm btn-icon" title="Delete">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>` : ''}
                                    </div>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`}
        </div>`;
    },

    // ── Global Settings ───────────────────────────────────────────────────────
    renderGlobalSettings(container) {
        const c = State.settings.contact || {};
        const s = State.settings.social || {};

        container.innerHTML = `
        <div class="space-y" style="max-width:720px">
            <div class="page-section-header">
                <div>
                    <div class="page-section-title">Global Settings</div>
                    <div class="page-section-sub">Contact details and social media links used across the whole site</div>
                </div>
                <button onclick="window.Admin.loadGlobalDefaults()" class="btn btn-amber btn-sm">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Load Defaults
                </button>
            </div>

            <form id="settings-form" class="space-y">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><div class="card-title-icon" style="background:#eff6ff;color:#3b82f6"><i class="fa-solid fa-phone"></i></div>Contact Information</div>
                    </div>
                    <div class="card-p">
                        <div class="grid-2">
                            <div class="field-group">
                                <label class="field-label">Phone Number (Display)</label>
                                <input type="text" name="phone" value="${Admin.escapeHtml(c.phone || '')}" class="field-input" placeholder="+995 XXX XX XX XX">
                            </div>
                            <div class="field-group">
                                <label class="field-label">WhatsApp Number (digits only)</label>
                                <input type="text" name="whatsapp" value="${Admin.escapeHtml(c.whatsapp || '')}" class="field-input mono" placeholder="995XXXXXXXXX">
                            </div>
                            <div class="field-group">
                                <label class="field-label">Email Address</label>
                                <input type="email" name="email" value="${Admin.escapeHtml(c.email || '')}" class="field-input" placeholder="info@georgiahills.com">
                            </div>
                            <div class="field-group">
                                <label class="field-label">Business Address</label>
                                <input type="text" name="address" value="${Admin.escapeHtml(c.address || '')}" class="field-input" placeholder="Tbilisi, Georgia">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><div class="card-title-icon" style="background:#f5f3ff;color:#8b5cf6"><i class="fa-solid fa-share-nodes"></i></div>Social Media Links</div>
                    </div>
                    <div class="card-p">
                        <div class="grid-2">
                            <div class="field-group">
                                <label class="field-label"><i class="fa-brands fa-facebook" style="color:#1877f2"></i>&nbsp; Facebook URL</label>
                                <input type="url" name="social.facebook" value="${Admin.escapeHtml(s.facebook || '')}" class="field-input" placeholder="https://facebook.com/georgiahills">
                            </div>
                            <div class="field-group">
                                <label class="field-label"><i class="fa-brands fa-instagram" style="color:#e1306c"></i>&nbsp; Instagram URL</label>
                                <input type="url" name="social.instagram" value="${Admin.escapeHtml(s.instagram || '')}" class="field-input" placeholder="https://instagram.com/georgiahills">
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex;justify-content:flex-end">
                    <button type="submit" class="btn btn-primary btn-lg">
                        <i class="fa-solid fa-floppy-disk"></i> Save Settings
                    </button>
                </div>
            </form>
        </div>`;

        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = { social: {} };
            for (let [k, v] of fd.entries()) {
                if (k.startsWith('social.')) data.social[k.split('.')[1]] = v;
                else data[k] = v;
            }
            try {
                await Data.saveSettings('contact', data);
                UI.toast("Global settings saved!", "success");
            } catch (err) { UI.toast(err.message, 'error'); }
        });
    },

    // ── Navbar Settings ──────────────────────────────────────────────────────
    renderNavbarSettings(container) {
        container.innerHTML = `
        <div class="space-y" style="max-width:720px">
            <div class="page-section-header">
                <div>
                    <div class="page-section-title">Navigation Menu</div>
                    <div class="page-section-sub">Edit the links shown in the site header navbar</div>
                </div>
                <div style="display:flex;gap:8px">
                    <button onclick="window.Admin.loadNavbarDefaults()" class="btn btn-amber btn-sm">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Reset to Defaults
                    </button>
                    <button onclick="window.Admin.addNavbarItem()" class="btn btn-primary btn-sm">
                        <i class="fa-solid fa-plus"></i> Add Link
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title"><div class="card-title-icon" style="background:#f8fafc;color:#475569"><i class="fa-solid fa-bars"></i></div>Menu Items</div>
                    <span class="badge badge-gray">${State.settings.navbar.length} items</span>
                </div>
                <div id="navbar-list" style="padding:16px;display:flex;flex-direction:column;gap:10px">
                    ${State.settings.navbar.length === 0 ? `<div class="empty-state" style="padding:24px"><div class="empty-title" style="font-size:13px">No menu items</div><div class="empty-desc">Add links using the button above.</div></div>` :
                    State.settings.navbar.map((item, idx) => `
                    <div class="card-p" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px 16px;display:grid;grid-template-columns:28px 1fr 1fr 2fr 32px;gap:10px;align-items:center" data-idx="${idx}">
                        <div style="color:#94a3b8;cursor:grab;text-align:center"><i class="fa-solid fa-grip-vertical"></i></div>
                        <input type="text" placeholder="Label EN" value="${Admin.escapeHtml(item.label_en || '')}" class="field-input nav-input" data-field="label_en" style="font-size:12px">
                        <input type="text" placeholder="الاسم بالعربية" value="${Admin.escapeHtml(item.label_ar || '')}" dir="rtl" class="field-input nav-input" data-field="label_ar" style="font-size:12px">
                        <input type="text" placeholder="URL (e.g. services.html or #section)" value="${Admin.escapeHtml(item.link || '')}" class="field-input nav-input mono" data-field="link" style="font-size:11px">
                        <button onclick="window.Admin.removeNavbarItem(${idx})" class="btn btn-danger btn-sm btn-icon" title="Remove">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>`).join('')}
                </div>
                <div style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end">
                    <button onclick="window.Admin.saveNavbar()" class="btn btn-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Save Menu
                    </button>
                </div>
            </div>
        </div>`;
    },

    // ── Media Library ────────────────────────────────────────────────────────
    async renderMediaLibrary(container) {
        await Data.fetchMediaLibrary();
        const assets = State.mediaAssets || [];

        container.innerHTML = `
        <div class="space-y">
            <div class="page-section-header">
                <div>
                    <div class="page-section-title">Media Library</div>
                    <div class="page-section-sub">Manage uploaded images and assets (${assets.length} files)</div>
                </div>
                <button onclick="window.Admin.refreshMediaLibrary()" class="btn btn-ghost">
                    <i class="fa-solid fa-rotate"></i> Refresh
                </button>
            </div>

            <!-- Search/Filter -->
            <div class="card card-p" style="padding:16px">
                <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end">
                    <div class="field-group">
                        <label class="field-label">Search by filename</label>
                        <input id="media-query" type="text" value="${Admin.escapeHtml(State.mediaFilters.query || '')}" class="field-input" placeholder="Search…">
                    </div>
                    <div class="field-group">
                        <label class="field-label">Filter by tag</label>
                        <input id="media-tag" type="text" value="${Admin.escapeHtml(State.mediaFilters.tag || '')}" class="field-input" placeholder="e.g. hero, destination">
                    </div>
                    <button onclick="window.Admin.applyMediaFilters()" class="btn btn-dark">
                        <i class="fa-solid fa-magnifying-glass"></i> Apply
                    </button>
                </div>
            </div>

            ${assets.length === 0 ? `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-icon">🖼️</div>
                    <div class="empty-title">No Media Found</div>
                    <div class="empty-desc">Upload images via the page editors, or adjust your search filters.</div>
                </div>
            </div>` : `
            <div class="media-grid">
                ${assets.map((a, idx) => `
                <div class="media-card">
                    <div class="media-thumb">
                        <img src="${Admin.escapeHtml(a.url)}" loading="lazy" alt="${Admin.escapeHtml(a.alt || '')}" onerror="this.style.display='none'">
                        <div class="media-thumb-overlay">
                            <a href="${Admin.escapeHtml(a.url)}" target="_blank" class="btn btn-ghost btn-sm" style="background:rgba(255,255,255,0.9)">
                                <i class="fa-solid fa-external-link-alt"></i> Open
                            </a>
                        </div>
                    </div>
                    <div class="media-body">
                        <div class="media-filename" title="${Admin.escapeHtml(a.path || a.url)}">${Admin.escapeHtml((a.path || a.url).split('/').pop())}</div>
                        <div class="media-meta">${Math.round((a.size || 0) / 1024)} KB &nbsp;·&nbsp; ${(a.usages || []).length} usage(s)</div>
                        <input id="media-alt-${idx}" type="text" value="${Admin.escapeHtml(a.alt || '')}" placeholder="Alt text…" class="field-input" style="font-size:11px;padding:5px 8px">
                        <input id="media-tags-${idx}" type="text" value="${Admin.escapeHtml((a.tags || []).join(', '))}" placeholder="tags, comma-separated" class="field-input" style="font-size:11px;padding:5px 8px">
                        <div style="display:flex;gap:6px;flex-wrap:wrap">
                            <button onclick="window.Admin.saveMediaAssetMeta(${idx})" class="btn btn-success btn-sm" style="flex:1">
                                <i class="fa-solid fa-floppy-disk"></i> Save
                            </button>
                            ${Security.isAdmin() ? `<button onclick="window.Admin.replaceMediaAssetPrompt(${idx})" class="btn btn-amber btn-sm">
                                <i class="fa-solid fa-arrows-rotate"></i>
                            </button>` : ''}
                        </div>
                    </div>
                </div>`).join('')}
            </div>`}
        </div>`;
    },

    // ── Helpers ───────────────────────────────────────────────────────────────
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, i) => o ? o[i] : null, obj);
    },
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }
};

// ── App ──────────────────────────────────────────────────────────────────────
const App = {
    init() {
        UI.showLoading();
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                State.user = user;
                try {
                    const tokenResult = await user.getIdTokenResult(true);
                    const claims = tokenResult.claims || {};
                    State.userRole = claims.admin === true ? 'admin' : (claims.role || 'viewer');
                } catch (_e) { State.userRole = 'viewer'; }
                try { await Data.loadAll(); } catch (e) { console.error("Critical load:", e); }
                finally {
                    UI.renderLayout();
                    if (!Security.canEdit()) {
                        UI.toast("Read-only account. Contact admin for edit access.", "warning");
                    }
                }
            } else {
                State.user = null;
                State.userRole = 'viewer';
                UI.renderLogin();
            }
        });
    },
    async logout() {
        try { await signOut(auth); window.location.reload(); } catch (e) { console.error(e); }
    }
};

// ── Admin Exports ────────────────────────────────────────────────────────────
const Admin = {
    init: App.init,
    logout: App.logout,
    switchTab: (tab) => UI.loadTab(tab),
    closeModal: () => UI.closeModal(),
    getNestedValue: UI.getNestedValue,
    setNestedValue: UI.setNestedValue,

    toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('collapsed');
    },
    openMobileSidebar() {
        document.getElementById('sidebar')?.classList.add('mobile-open');
        document.getElementById('sb-overlay')?.classList.add('active');
    },
    closeMobileSidebar() {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('sb-overlay')?.classList.remove('active');
    },

    // ── Defaults loaders ─────────────────────────────────────────────────────
    loadPageDefaults(pageId) {
        if (!confirm('Fill empty fields with original default content? Existing content will NOT be overwritten.')) return;
        const defaults = DefaultContent[pageId];
        if (!defaults) { UI.toast('No defaults found for this page.', 'error'); return; }
        const form = document.getElementById(`page-form-${pageId}`);
        if (!form) return;
        let fills = 0;
        Array.from(form.elements).forEach(el => {
            const key = el.name; if (!key) return;
            const val = UI.getNestedValue(defaults, key);
            if (val && !el.value) { el.value = val; fills++; }
        });
        UI.toast(fills > 0 ? `Filled ${fills} fields with defaults. Save when ready!` : 'All fields already have content.', fills > 0 ? 'success' : 'info');
    },

    loadGlobalDefaults() {
        if (!confirm('Fill empty fields with default contact info?')) return;
        const defaults = DefaultContent.settings_global;
        const form = document.getElementById('settings-form');
        if (!form) return;
        const setIfEmpty = (name, val) => { const el = form.querySelector(`[name="${name}"]`); if (el && !el.value) el.value = val; };
        setIfEmpty('phone', defaults.phone); setIfEmpty('whatsapp', defaults.whatsapp);
        setIfEmpty('email', defaults.email); setIfEmpty('address', defaults.address);
        setIfEmpty('social.facebook', defaults.social.facebook); setIfEmpty('social.instagram', defaults.social.instagram);
        UI.toast('Defaults loaded.', 'success');
    },

    loadNavbarDefaults() {
        if (!confirm('This will REPLACE current menu items with defaults. Continue?')) return;
        State.settings.navbar = JSON.parse(JSON.stringify(DefaultContent.settings_navbar));
        UI.loadTab('settings-navbar');
        UI.toast('Navbar defaults loaded.', 'success');
    },

    // ── Destination actions ──────────────────────────────────────────────────
    async deleteDestination(id) {
        if (!Security.isAdmin()) { UI.toast("Only admins can delete destinations.", "error"); return; }
        if (!confirm("Delete this destination? This cannot be undone.")) return;
        try {
            await Data.deleteDestination(id);
            UI.toast("Destination deleted.", "success");
            UI.loadTab('destinations');
        } catch (e) { UI.toast("Delete failed: " + e.message, "error"); }
    },

    // ── Article actions ──────────────────────────────────────────────────────
    async deleteArticle(id) {
        if (!Security.isAdmin()) { UI.toast("Only admins can delete articles.", "error"); return; }
        if (!confirm("Delete this article?")) return;
        try {
            await Data.deleteArticle(id);
            UI.toast("Article deleted.", "success");
            UI.loadTab('articles');
        } catch (e) { UI.toast("Delete failed: " + e.message, "error"); }
    },

    // ── Image upload ─────────────────────────────────────────────────────────
    async handleImageUpload(input, targetId) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const btn = input.closest('label');
        if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.style.pointerEvents = 'none'; }
        try {
            const url = await Data.uploadImage(file, 'uploads');
            const target = document.getElementById(targetId);
            if (target) target.value = url;
            const preview = document.getElementById('preview-' + targetId) || document.getElementById(targetId.replace('input-', 'preview-'));
            if (preview && preview.tagName === 'IMG') { preview.src = url; preview.style.display = 'block'; }
            UI.toast("Image uploaded!", "success");
        } catch (e) {
            UI.toast("Upload failed: " + e.message, "error");
        } finally {
            if (btn) { btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload'; btn.style.pointerEvents = ''; }
        }
    },

    // ── Navbar actions ───────────────────────────────────────────────────────
    addNavbarItem() {
        State.settings.navbar.push({ label_en: 'New Link', label_ar: 'رابط جديد', link: '#' });
        UI.loadTab('settings-navbar');
    },
    removeNavbarItem(idx) {
        State.settings.navbar.splice(idx, 1);
        UI.loadTab('settings-navbar');
    },
    async saveNavbar() {
        if (!Security.isAdmin()) { UI.toast("Only admins can update the navigation.", "error"); return; }
        const rows = document.querySelectorAll('#navbar-list > div[data-idx]');
        const newItems = [];
        rows.forEach(row => {
            const item = {};
            row.querySelectorAll('.nav-input').forEach(inp => { item[inp.dataset.field] = inp.value; });
            if (item.label_en) newItems.push(item);
        });
        try {
            await Data.saveSettings('navbar', { items: newItems });
            State.settings.navbar = newItems;
            UI.toast("Navigation menu saved!", "success");
        } catch (e) { UI.toast("Failed: " + e.message, "error"); }
    },

    // ── Media actions ─────────────────────────────────────────────────────────
    async refreshMediaLibrary() {
        await Data.fetchMediaLibrary();
        UI.loadTab('media-library');
    },
    async applyMediaFilters() {
        State.mediaFilters = {
            query: (document.getElementById('media-query')?.value || '').trim(),
            tag: (document.getElementById('media-tag')?.value || '').trim()
        };
        await Data.fetchMediaLibrary();
        UI.loadTab('media-library');
    },
    async saveMediaAssetMeta(idx) {
        const asset = (State.mediaAssets || [])[idx];
        if (!asset) return;
        const alt = document.getElementById(`media-alt-${idx}`)?.value || '';
        const tags = (document.getElementById(`media-tags-${idx}`)?.value || '').split(',').map(t => t.trim()).filter(Boolean);
        try {
            await Data.saveMediaMeta(asset.url, tags, alt);
            UI.toast('Metadata saved.', 'success');
        } catch (e) { UI.toast(`Failed: ${e.message}`, 'error'); }
    },
    async replaceMediaAssetPrompt(idx) {
        if (!Security.isAdmin()) { UI.toast("Only admins can replace media.", "error"); return; }
        const asset = (State.mediaAssets || [])[idx];
        if (!asset) return;
        const newUrl = prompt('Replacement URL:', asset.url);
        if (!newUrl || newUrl === asset.url) return;
        try {
            const res = await Data.replaceMediaAsset(asset.url, newUrl.trim());
            UI.toast(`Updated ${res.updatedDocs || 0} references.`, 'success');
            await Data.fetchMediaLibrary();
            UI.loadTab('media-library');
        } catch (e) { UI.toast(`Replace failed: ${e.message}`, 'error'); }
    },

    // ── Publish / version control ─────────────────────────────────────────────
    async publishPage(pageId) {
        const checklist = Admin.runPrePublishChecklist(pageId);
        if (checklist.critical.length > 0) { alert(`Cannot publish:\n• ${checklist.critical.join('\n• ')}`); return; }
        if (checklist.warnings.length > 0) { if (!confirm(`Publish with warnings?\n• ${checklist.warnings.join('\n• ')}`)) return; }
        const note = document.getElementById(`publish-note-${pageId}`)?.value || '';
        const changeSummary = document.getElementById(`change-summary-${pageId}`)?.value || '';
        try {
            await Data.publishPage(pageId, { note, changeSummary });
            UI.toast(`"${pageId}" page published!`, "success");
            State.unsavedChanges = false;
            UI.loadTab(`page-${pageId}`);
        } catch (e) { UI.toast(`Publish failed: ${e.message}`, "error"); }
    },

    async schedulePublish(pageId) {
        const scheduledAt = document.getElementById(`schedule-at-${pageId}`)?.value || '';
        const note = document.getElementById(`publish-note-${pageId}`)?.value || '';
        const changeSummary = document.getElementById(`change-summary-${pageId}`)?.value || '';
        if (!scheduledAt) { UI.toast("Pick a date and time first.", "error"); return; }
        try {
            await Data.schedulePublish(pageId, scheduledAt, note, changeSummary);
            UI.toast(`Scheduled publish for "${pageId}".`, "success");
            UI.loadTab(`page-${pageId}`);
        } catch (e) { UI.toast(`Schedule failed: ${e.message}`, "error"); }
    },

    async rollbackPage(pageId) {
        const select = document.getElementById(`revision-select-${pageId}`);
        if (!select || !select.value) { UI.toast("Select a revision first.", "error"); return; }
        const publishNow = confirm("Rollback and publish immediately?");
        try {
            await Data.rollbackPage(pageId, select.value, publishNow);
            UI.toast(`Rolled back "${pageId}".`, "success");
            UI.loadTab(`page-${pageId}`);
        } catch (e) { UI.toast(`Rollback failed: ${e.message}`, "error"); }
    }
};

window.Admin = Admin;

// ── Utility Methods ───────────────────────────────────────────────────────────
Admin.escapeHtml = function(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};

Admin.flattenObject = function(obj, prefix = '', out = {}) {
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).forEach(key => {
        const path = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) Admin.flattenObject(val, path, out);
        else out[path] = val;
    });
    return out;
};

Admin.getLocalDraftKey = (pageId) => `gh_admin_localdraft_${pageId}`;
Admin.readLocalDraft = function(pageId) {
    try { const r = localStorage.getItem(Admin.getLocalDraftKey(pageId)); return r ? JSON.parse(r) : null; } catch (_e) { return null; }
};
Admin.writeLocalDraft = function(pageId, data) {
    try { localStorage.setItem(Admin.getLocalDraftKey(pageId), JSON.stringify({ savedAt: Date.now(), data })); } catch (_e) {}
};
Admin.clearLocalDraft = function(pageId) {
    try { localStorage.removeItem(Admin.getLocalDraftKey(pageId)); } catch (_e) {}
};

Admin.runPrePublishChecklist = function(pageId) {
    const data = State.pages[pageId] || {};
    const schema = PageSchemas[pageId] || [];
    const critical = [], warnings = [];
    ['seo.meta_title','seo.meta_description'].forEach(k => {
        const v = Admin.getNestedValue(data, k);
        if (!v || !String(v).trim()) critical.push(`${k} is required`);
    });
    schema.filter(f => f.type && f.key).forEach(f => {
        const v = Admin.getNestedValue(data, f.key);
        if ((f.key.endsWith('_en') || f.key.endsWith('_ar')) && (!v || !String(v).trim())) warnings.push(`${f.key} is empty`);
        if ((f.type === 'image' || /url|image|thumbnail|map_url/i.test(f.key)) && v) {
            const s = String(v).trim();
            const valid = /^(https?:\/\/|\/|\.\/|[a-zA-Z0-9._-]+\.(webp|png|jpe?g|gif|svg|avif))/i.test(s);
            if (!valid) critical.push(`${f.key} has invalid URL`);
        }
    });
    return { critical, warnings: warnings.slice(0, 8) };
};

Admin.validateContentData = function(pageId, schema, newData) {
    const errors = [], warnings = [];
    const seoTitle = Admin.getNestedValue(newData, 'seo.meta_title');
    const seoDesc = Admin.getNestedValue(newData, 'seo.meta_description');
    if (!seoTitle || !String(seoTitle).trim()) errors.push('SEO meta title is required');
    if (!seoDesc || !String(seoDesc).trim()) errors.push('SEO meta description is required');
    if (seoTitle && String(seoTitle).length > 70) warnings.push('SEO title > 70 chars (recommended max)');
    if (seoDesc && String(seoDesc).length > 180) warnings.push('SEO description > 180 chars (recommended max)');
    return { errors, warnings };
};

Admin.openDiffModal = function(pageId) {
    const draft = State.pages[pageId] || {};
    const published = State.pageMeta[pageId]?.published || {};
    const dFlat = Admin.flattenObject(draft), pFlat = Admin.flattenObject(published);
    const keys = Array.from(new Set([...Object.keys(dFlat), ...Object.keys(pFlat)])).sort();
    const changedKeys = keys.filter(k => String(dFlat[k] ?? '') !== String(pFlat[k] ?? ''));

    const panel = document.getElementById('modal-panel');
    panel.innerHTML = `
        <div class="modal-header">
            <div>
                <div class="modal-title"><i class="fa-solid fa-code-compare" style="color:#8b5cf6;margin-right:8px"></i>Diff: "${pageId}"</div>
                <div class="modal-subtitle">${changedKeys.length} field(s) changed vs. published version</div>
            </div>
            <button onclick="window.Admin.closeModal()" class="btn btn-ghost btn-sm btn-icon"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
            ${changedKeys.length === 0 ? `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No Differences</div><div class="empty-desc">Draft matches published version.</div></div>` : `
            <table class="data-table">
                <thead><tr><th>Field</th><th style="color:#ef4444">Published</th><th style="color:#10b981">Draft</th></tr></thead>
                <tbody>
                    ${changedKeys.map(k => `
                    <tr>
                        <td class="font-mono" style="font-size:10px;white-space:nowrap;color:#64748b">${Admin.escapeHtml(k)}</td>
                        <td style="font-size:11px;color:#991b1b;max-width:160px;word-break:break-all">${Admin.escapeHtml(String(pFlat[k] ?? ''))}</td>
                        <td style="font-size:11px;color:#065f46;max-width:160px;word-break:break-all">${Admin.escapeHtml(String(dFlat[k] ?? ''))}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`}
        </div>`;
    UI.openModal();
};

// ── Form Container (Page / Destination / Article editor) ─────────────────────
Admin.renderFormContainer = function(container, schema, data, title, onSave, isModal = false, pageId = null) {
    const sections = [];
    let cur = { title: "General Info", fields: [], icon: 'fa-file' };
    schema.forEach(item => {
        if (item.section) {
            if (cur.fields.length > 0) sections.push(cur);
            cur = { title: item.section, description: item.description, icon: item.icon || 'fa-folder', fields: [] };
        } else if (item.type) { cur.fields.push(item); }
    });
    if (cur.fields.length > 0) sections.push(cur);

    const formId = pageId ? `page-form-${pageId}` : `form-${Math.random().toString(36).substr(2, 9)}`;
    const previewUrls = { home: '/', about: '/about.html', services: '/services.html', contact: '/contact.html' };
    const previewUrl = previewUrls[pageId] || '/';

    const wrapClass = isModal ? 'modal-body' : 'page-editor-wrap space-y';

    if (isModal) {
        container.innerHTML = `
            <div class="modal-header">
                <div>
                    <div class="modal-title">${Admin.escapeHtml(title)}</div>
                    <div class="modal-subtitle">Fill in both English and Arabic fields</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button type="button" id="edit-btn-${formId}" class="btn btn-ghost btn-sm"><i class="fa-solid fa-pen"></i> Enable Edit</button>
                    <button type="submit" form="${formId}" id="save-btn-${formId}" disabled class="btn btn-primary btn-sm"><i class="fa-solid fa-floppy-disk"></i> Save</button>
                    <button type="button" onclick="window.Admin.closeModal()" class="btn btn-ghost btn-sm btn-icon"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="${wrapClass}" style="padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1">
                <form id="${formId}" class="space-y">${_renderSections(sections, data, formId)}</form>
            </div>
            <div class="modal-footer">
                <button type="button" onclick="window.Admin.closeModal()" class="btn btn-ghost">Cancel</button>
                <button type="submit" form="${formId}" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="${wrapClass}">
                <div class="editor-toolbar">
                    <div class="editor-toolbar-left">
                        <div class="editor-page-title">${Admin.escapeHtml(title)}</div>
                        <div class="editor-status">
                            <span class="badge ${(State.pageMeta[pageId]?.status || 'draft') === 'published' ? 'badge-green' : 'badge-amber'}">${State.pageMeta[pageId]?.status || 'draft'}</span>
                            ${pageId ? `<span>·</span><span>Last save: ${State.pageMeta[pageId]?.updatedAt ? new Date(State.pageMeta[pageId].updatedAt?.seconds * 1000).toLocaleString() : 'Never'}</span>` : ''}
                        </div>
                    </div>
                    <div class="editor-toolbar-right">
                        ${pageId ? `<button type="button" onclick="window.Admin.loadPageDefaults('${pageId}')" class="btn btn-amber btn-sm"><i class="fa-solid fa-wand-magic-sparkles"></i> Defaults</button>` : ''}
                        ${previewUrl ? `<a href="${previewUrl}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i> Preview</a>` : ''}
                        <button type="button" id="edit-btn-${formId}" class="btn btn-ghost"><i class="fa-solid fa-pen"></i> Enable Editing</button>
                        <button type="submit" form="${formId}" id="save-btn-${formId}" disabled class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Draft</button>
                    </div>
                </div>
                <form id="${formId}" class="space-y">${_renderSections(sections, data, formId)}</form>
            </div>`;

        // CMS workflow panel (publish, diff, rollback)
        if (pageId) {
            const meta = State.pageMeta[pageId] || { revisions: [] };
            const revs = (meta.revisions || []).map(r => {
                const t = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '—';
                return `<option value="${r.id}">${r.type || 'revision'} – ${t}</option>`;
            }).join('');

            const cmsHtml = `
                <div class="cms-panel">
                    <div class="cms-panel-row">
                        <div class="cms-info">
                            <div class="cms-label"><i class="fa-solid fa-code-branch" style="color:#8b5cf6;margin-right:6px"></i>CMS Workflow</div>
                            <div class="cms-detail">Published: ${meta.publishedAt?.seconds ? new Date(meta.publishedAt.seconds * 1000).toLocaleString() : 'Not published yet'}</div>
                        </div>
                        <div class="cms-actions">
                            <button onclick="window.Admin.openDiffModal('${pageId}')" class="btn btn-ghost btn-sm"><i class="fa-solid fa-code-compare"></i> View Diff</button>
                            <button onclick="window.Admin.publishPage('${pageId}')" ${Security.canEdit() ? '' : 'disabled'} class="btn btn-success btn-sm"><i class="fa-solid fa-cloud-arrow-up"></i> Publish</button>
                        </div>
                    </div>
                    <div class="divider" style="margin:12px 0"></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end">
                        <div class="field-group">
                            <label class="field-label">Publish Note (optional)</label>
                            <input id="publish-note-${pageId}" type="text" value="${Admin.escapeHtml(meta.lastPublishNote || '')}" class="field-input" placeholder="What changed?">
                        </div>
                        <div class="field-group">
                            <label class="field-label">Change Summary</label>
                            <input id="change-summary-${pageId}" type="text" value="${Admin.escapeHtml(meta.lastChangeSummary || '')}" class="field-input" placeholder="Brief summary">
                        </div>
                        <div class="field-group">
                            <label class="field-label">Schedule Publish</label>
                            <div style="display:flex;gap:6px">
                                <input id="schedule-at-${pageId}" type="datetime-local" class="field-input" style="flex:1">
                                <button onclick="window.Admin.schedulePublish('${pageId}')" ${Security.canEdit() ? '' : 'disabled'} class="btn btn-violet btn-sm"><i class="fa-solid fa-clock"></i></button>
                            </div>
                        </div>
                    </div>
                    ${revs ? `<div class="divider" style="margin:12px 0"></div><div style="display:flex;gap:8px;align-items:center"><select id="revision-select-${pageId}" class="field-input" style="flex:1"><option value="">Select revision to rollback…</option>${revs}</select><button onclick="window.Admin.rollbackPage('${pageId}')" ${Security.isAdmin() ? '' : 'disabled'} class="btn btn-amber btn-sm"><i class="fa-solid fa-rotate-left"></i> Rollback</button></div>` : ''}
                </div>`;
            container.querySelector('.page-editor-wrap').insertAdjacentHTML('afterbegin', cmsHtml);
        }
    }

    // Toggle edit mode
    const editBtn = document.getElementById(`edit-btn-${formId}`);
    const saveBtn = document.getElementById(`save-btn-${formId}`);
    const form = document.getElementById(formId);
    if (!Security.canEdit() && editBtn) { editBtn.disabled = true; editBtn.style.opacity = '0.4'; }

    const setEditMode = (editing) => {
        const inputs = form.querySelectorAll('input,textarea,select');
        inputs.forEach(el => el.disabled = !editing);
        form.querySelectorAll('.file-upload-btn').forEach(el => el.classList.toggle('disabled-upload', !editing));
        form.querySelectorAll('.trans-btn').forEach(el => el.style.display = editing ? '' : 'none');
        if (saveBtn) saveBtn.disabled = !editing;
        if (editBtn) {
            if (editing) {
                editBtn.className = editBtn.className.replace('btn-ghost', 'btn-danger');
                editBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Cancel Edit';
                editBtn.classList.add('active-edit');
            } else {
                editBtn.className = editBtn.className.replace('btn-danger', 'btn-ghost');
                editBtn.innerHTML = isModal ? '<i class="fa-solid fa-pen"></i> Enable Edit' : '<i class="fa-solid fa-pen"></i> Enable Editing';
                editBtn.classList.remove('active-edit');
            }
        }
    };

    setEditMode(false);

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (!Security.canEdit()) return;
            setEditMode(!editBtn.classList.contains('active-edit'));
        });
    }

    // Restore local draft
    if (pageId) {
        const localDraft = Admin.readLocalDraft(pageId);
        if (localDraft?.data && confirm('Local autosave draft found. Restore it?')) {
            form.querySelectorAll('input[name],textarea[name],select[name]').forEach(el => {
                const v = Admin.getNestedValue(localDraft.data, el.name);
                if (el.type === 'checkbox') el.checked = !!v; else if (v !== null && v !== undefined) el.value = v;
            });
        }
    }

    // Collect form data
    const collectFormData = () => {
        const fd = new FormData(form);
        const newData = JSON.parse(JSON.stringify(data));
        for (let [key, value] of fd.entries()) {
            if (key.includes('.')) Admin.setNestedValue(newData, key, value); else newData[key] = value;
        }
        form.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            if (chk.name.includes('.')) Admin.setNestedValue(newData, chk.name, chk.checked); else newData[chk.name] = chk.checked;
        });
        return newData;
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newData = collectFormData();
        await onSave(newData);
        if (pageId) Admin.clearLocalDraft(pageId);
        State.unsavedChanges = false;
    });

    if (pageId) {
        form.addEventListener('input', () => {
            State.unsavedChanges = true;
            State.currentEditorPage = pageId;
            const snapshot = collectFormData();
            Admin.writeLocalDraft(pageId, snapshot);
            if (State.autosaveTimers[pageId]) clearTimeout(State.autosaveTimers[pageId]);
            State.autosaveTimers[pageId] = setTimeout(async () => {
                if (!editBtn?.classList.contains('active-edit')) return;
                try { await Data.savePage(pageId, snapshot); State.pages[pageId] = snapshot; } catch (_e) {}
            }, 3000);
        });
    }

    // Add char count listeners
    form.querySelectorAll('[data-maxlen]').forEach(el => {
        const maxLen = parseInt(el.dataset.maxlen);
        const countEl = el.parentElement?.querySelector('.char-count');
        if (!countEl) return;
        const update = () => {
            const len = el.value.length;
            countEl.textContent = `${len}/${maxLen}`;
            countEl.className = `char-count${len > maxLen ? ' danger' : len > maxLen * 0.85 ? ' warn' : ''}`;
        };
        el.addEventListener('input', update);
        update();
    });
};

// Section renderer
function _renderSections(sections, data, formId) {
    return sections.map((sec, i) => `
        <div class="editor-section">
            <div class="editor-section-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('hidden');this.querySelector('.section-chevron').classList.toggle('open')">
                <div class="editor-section-left">
                    <div class="section-accent"></div>
                    <div>
                        <div class="section-title">${Admin.escapeHtml(sec.title)}</div>
                        ${sec.description ? `<div class="section-desc">${Admin.escapeHtml(sec.description)}</div>` : ''}
                    </div>
                </div>
                <i class="fa-solid fa-chevron-down section-chevron open"></i>
            </div>
            <div class="editor-section-body">
                ${sec.fields.map(field => _renderField(field, data)).join('')}
            </div>
        </div>`).join('');
}

function _renderField(field, data) {
    const val = Admin.getNestedValue(data, field.key) || '';
    const isAr = field.key.endsWith('_ar') || field.dir === 'rtl';
    const isEn = !isAr;
    const maxLen = field.maxLen;

    if (field.type === 'image') {
        const inputId = `img-${field.key.replace(/\./g, '-')}-${Math.random().toString(36).substr(2, 5)}`;
        return `
            <div class="field-group">
                <label class="field-label">${Admin.escapeHtml(field.label)}</label>
                <div class="img-upload-block">
                    <img src="${Admin.escapeHtml(val) || 'data:image/svg+xml;charset=utf-8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 45%22><rect width=%2260%22 height=%2245%22 fill=%22%23e2e8f0%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2210%22 fill=%22%2394a3b8%22>IMG</text></svg>'}" id="preview-${inputId}" class="img-preview" alt="">
                    <div class="img-upload-controls">
                        <input type="text" name="${field.key}" value="${Admin.escapeHtml(val)}" id="${inputId}" disabled class="field-input mono" placeholder="Image URL or upload below" style="font-size:11px">
                        <div class="img-upload-actions">
                            <label class="btn btn-ghost btn-sm file-upload-btn disabled-upload" style="cursor:pointer">
                                <i class="fa-solid fa-upload"></i> Upload Image
                                <input type="file" class="hidden" accept="image/*" style="display:none" disabled onchange="window.Admin.handleImageUpload(this,'${inputId}')">
                            </label>
                        </div>
                        <div style="font-size:10px;color:#94a3b8">Supports: WebP, JPEG, PNG, AVIF</div>
                    </div>
                </div>
            </div>`;
    }

    if (field.type === 'checkbox') {
        return `
            <div class="toggle-wrap">
                <label class="toggle">
                    <input type="checkbox" name="${field.key}" ${val ? 'checked' : ''} disabled>
                    <div class="toggle-track"></div>
                    <div class="toggle-thumb"></div>
                </label>
                <span class="toggle-label">${Admin.escapeHtml(field.label)}</span>
            </div>`;
    }

    const isTextarea = field.type === 'textarea';
    const fieldId = `field-${field.key.replace(/\./g, '-')}-${Math.random().toString(36).substr(2, 5)}`;
    const safeVal = typeof val === 'string' ? val.replace(/"/g, '&quot;') : val;

    let partnerKey = null;
    if (isEn && field.key.includes('_en')) partnerKey = field.key.replace('_en', '_ar');
    else if (isAr && field.key.includes('_ar')) partnerKey = field.key.replace('_ar', '_en');

    const transBtn = partnerKey ? `
        <button type="button"
            onclick="window.Admin.translateField('${fieldId}', '${isEn ? 'en' : 'ar'}', '${partnerKey}')"
            class="trans-btn btn btn-ghost btn-sm btn-icon" title="Auto-translate"
            style="position:absolute;${isAr ? 'left:6px' : 'right:6px'};top:50%;transform:translateY(-50%);display:none;z-index:1">
            <i class="fa-solid fa-language"></i>
        </button>` : '';

    const inputEl = isTextarea
        ? `<textarea id="${fieldId}" name="${field.key}" rows="3" dir="${field.dir || 'ltr'}" disabled
            class="field-input field-textarea" data-maxlen="${maxLen || ''}"
            ${isAr ? 'style="padding-left:38px"' : transBtn ? 'style="padding-right:38px"' : ''}>${Admin.escapeHtml(val)}</textarea>`
        : `<input type="text" id="${fieldId}" name="${field.key}" value="${safeVal}" dir="${field.dir || 'ltr'}" disabled
            class="field-input" data-maxlen="${maxLen || ''}"
            ${isAr ? 'style="padding-left:38px"' : transBtn ? 'style="padding-right:38px"' : ''}>`;

    return `
        <div class="field-group">
            <label class="field-label">
                ${Admin.escapeHtml(field.label)}
                <span style="display:flex;align-items:center;gap:6px">
                    ${field.hint ? `<span class="field-hint">${Admin.escapeHtml(field.hint)}</span>` : ''}
                    ${maxLen ? `<span class="char-count" data-maxlen="${maxLen}">0/${maxLen}</span>` : ''}
                </span>
            </label>
            <div style="position:relative">
                ${inputEl}
                ${transBtn}
            </div>
        </div>`;
}

// ── Page Editor ───────────────────────────────────────────────────────────────
Admin.renderPageEditor = function(container, pageId) {
    const schema = PageSchemas[pageId];
    const data = State.pages[pageId] || {};
    if (!schema) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">No Schema</div><div class="empty-desc">No editor schema defined for "${pageId}".</div></div>`;
        return;
    }
    Admin.renderFormContainer(container, schema, data, `${pageId.charAt(0).toUpperCase() + pageId.slice(1)} Page Content`, async (newData) => {
        const validation = Admin.validateContentData(pageId, schema, newData);
        if (validation.errors.length > 0) { UI.toast(validation.errors[0], 'error'); return; }
        if (validation.warnings.length > 0 && !confirm(`Save with warnings?\n• ${validation.warnings.join('\n• ')}`)) return;
        await Data.savePage(pageId, newData);
        UI.toast('Draft saved!', 'success');
    }, false, pageId);
};

// ── Destination Modal ─────────────────────────────────────────────────────────
Admin.openDestinationModal = function(id = null) {
    const existing = id ? State.destinations.find(d => d.id === id) : null;
    const dest = existing ? {
        ...existing,
        title_en: existing.title_en || existing.title?.en || '',
        title_ar: existing.title_ar || existing.title?.ar || '',
        desc_en: existing.desc_en || existing.desc?.en || '',
        desc_ar: existing.desc_ar || existing.desc?.ar || ''
    } : { active: true };
    const panel = document.getElementById('modal-panel');

    const schema = [
        { section: "Basic Details", description: "Main card information.", icon: "fa-info-circle" },
        { type: "checkbox", key: "active", label: "Active — visible on website" },
        { type: "image", key: "thumbnail", label: "Thumbnail Image" },
        { type: "text", key: "title_en", label: "Title (English)" },
        { type: "text", key: "title_ar", label: "Title (Arabic)", dir: "rtl" },
        { type: "text", key: "price", label: "Price (e.g. From $500)" },
        { type: "text", key: "duration", label: "Duration (e.g. 5 Days)" },
        { section: "Description", description: "Full text shown on the destination page.", icon: "fa-align-left" },
        { type: "textarea", key: "desc_en", label: "Description (English)" },
        { type: "textarea", key: "desc_ar", label: "Description (Arabic)", dir: "rtl" },
        { type: "text", key: "map_url", label: "Google Maps Embed URL" }
    ];

    Admin.renderFormContainer(panel, schema, dest, id ? 'Edit Destination' : 'New Destination', async (newData) => {
        const normalized = {
            ...newData,
            title: { en: (newData.title_en || '').trim(), ar: (newData.title_ar || '').trim() },
            desc: { en: (newData.desc_en || '').trim(), ar: (newData.desc_ar || '').trim() }
        };
        delete normalized.title_en; delete normalized.title_ar;
        delete normalized.desc_en; delete normalized.desc_ar;
        await Data.saveDestination(id, normalized);
        UI.toast('Destination saved!', 'success');
        await Data.fetchDestinations();
        UI.loadTab('destinations');
        Admin.closeModal();
    }, true);

    UI.openModal();
};

// ── Article Modal ─────────────────────────────────────────────────────────────
Admin.openArticleModal = function(id = null) {
    const existing = id ? State.articles.find(a => a.id === id) : null;
    const article = existing ? {
        ...existing,
        title_en: existing.title?.en || '',
        title_ar: existing.title?.ar || '',
        excerpt_en: existing.excerpt?.en || '',
        excerpt_ar: existing.excerpt?.ar || '',
        content_en: existing.content?.en || '',
        content_ar: existing.content?.ar || ''
    } : { date: new Date().toISOString().split('T')[0] };

    const panel = document.getElementById('modal-panel');
    const schema = [
        { section: "Article Info", description: "Metadata and cover image.", icon: "fa-file-alt" },
        { type: "image", key: "image", label: "Cover Image" },
        { type: "text", key: "date", label: "Publish Date (YYYY-MM-DD)" },
        { type: "text", key: "title_en", label: "Title (English)" },
        { type: "text", key: "title_ar", label: "Title (Arabic)", dir: "rtl" },
        { type: "textarea", key: "excerpt_en", label: "Short Excerpt (English)" },
        { type: "textarea", key: "excerpt_ar", label: "Short Excerpt (Arabic)", dir: "rtl" },
        { section: "Article Body", description: "Full content (HTML supported).", icon: "fa-align-left" },
        { type: "textarea", key: "content_en", label: "Content (English — HTML allowed)" },
        { type: "textarea", key: "content_ar", label: "Content (Arabic — HTML allowed)", dir: "rtl" }
    ];

    Admin.renderFormContainer(panel, schema, article, id ? 'Edit Article' : 'New Article', async (newData) => {
        const normalized = { ...newData };
        normalized.title = { en: newData.title_en, ar: newData.title_ar };
        normalized.excerpt = { en: newData.excerpt_en, ar: newData.excerpt_ar };
        normalized.content = { en: newData.content_en, ar: newData.content_ar };
        ['title_en','title_ar','excerpt_en','excerpt_ar','content_en','content_ar'].forEach(k => delete normalized[k]);
        await Data.saveArticle(id, normalized);
        UI.toast('Article saved!', 'success');
        Admin.closeModal();
        UI.loadTab('articles');
    }, true);

    UI.openModal();
};

// ── Translation helper ────────────────────────────────────────────────────────
Admin.translateField = async function(sourceId, sourceLang, targetKey) {
    const sourceInput = document.getElementById(sourceId);
    if (!sourceInput || !sourceInput.value.trim()) { UI.toast('Enter text to translate first.', 'warning'); return; }
    const targetInput = sourceInput.closest('form')?.querySelector(`[name="${targetKey}"]`);
    if (!targetInput) { UI.toast('Target field not found.', 'error'); return; }
    const btn = sourceInput.closest('[style*="relative"]')?.querySelector('.trans-btn');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true; }
    try {
        const targetLang = sourceLang === 'en' ? 'ar' : 'en';
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(sourceInput.value)}`;
        const res = await fetch(url);
        const d = await res.json();
        if (d?.[0]) { targetInput.value = d[0].map(s => s[0]).join(''); UI.toast('Translated!', 'success'); }
        else throw new Error('Invalid response');
    } catch (err) {
        UI.toast('Translation failed. Rate limit or network error.', 'error');
    } finally {
        if (btn) { btn.innerHTML = '<i class="fa-solid fa-language"></i>'; btn.disabled = false; }
    }
};

// ── Modal backdrop click to close ─────────────────────────────────────────────
document.getElementById('modal-backdrop').addEventListener('click', () => Admin.closeModal());

// ── Start ─────────────────────────────────────────────────────────────────────
App.init();
