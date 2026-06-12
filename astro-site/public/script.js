/**
 * Georgia Hills - Unified Application Logic
 */

// ==========================================
// 1. SERVICE WORKER REGISTRATION (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => {})
          .catch(err => {});
    } catch(e) {}
  });
}

// ==========================================
// 2. CONFIGURATION & DATA
// ==========================================

// --- FIREBASE CONFIGURATION ---
// Uses optional `window.__GH_FIREBASE_CONFIG` override when present.
const firebaseConfig = window.__GH_FIREBASE_CONFIG || {
    apiKey: "AIzaSyApLm0zacQiM1VbSQ5INRlQ28ev3QoTw2o",
    authDomain: "georgiahills-15d19.firebaseapp.com",
    projectId: "georgiahills-15d19",
    storageBucket: "georgiahills-15d19.firebasestorage.app",
    messagingSenderId: "447700508040",
    appId: "1:447700508040:web:379c32079d09523a14ae3d",
    measurementId: "G-PTEM4FPQR1"
};

let db, auth;
// Only init global SDK if present (not module usage)
if (typeof firebase !== 'undefined') {
    try {
        if (!firebaseConfig || !firebaseConfig.apiKey) throw new Error("Firebase Config Missing");
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        if(firebase.auth) auth = firebase.auth();
    } catch (e) {
        console.log("ℹ️ Running in Static Mode (Firebase keys not set).");
        db = null;
        auth = null;
    }
} else {
    // If running in Admin Module mode, rely on module variables elsewhere, 
    // but keep db/auth null here so we don't crash
    db = null; 
    auth = null;
}

const AppConfig = {
    vehicleRates: { 'Sedan': 150, 'Minivan': 250 },
    currencies: [
        { code: 'GEL', flag: 'ge' }, { code: 'USD', flag: 'us' }, { code: 'EUR', flag: 'eu' },
        { code: 'AED', flag: 'ae' }, { code: 'SAR', flag: 'sa' }, { code: 'KWD', flag: 'kw' },
        { code: 'QAR', flag: 'qa' }, { code: 'OMR', flag: 'om' }
    ],
    defaultRates: { GEL: 1, USD: 0.37, EUR: 0.34, AED: 1.35, SAR: 1.38, KWD: 0.11, QAR: 1.34, OMR: 0.14 }
};

function getBookingEndpoint() {
    if (firebaseConfig.bookingEndpoint) return firebaseConfig.bookingEndpoint;
    if (firebaseConfig.projectId) {
        const region = firebaseConfig.functionsRegion || 'europe-west1';
        return `https://${region}-${firebaseConfig.projectId}.cloudfunctions.net/createBookingLead`;
    }
    return '';
}

const AttributionManager = {
    storageKey: 'gh_attribution',
    capture() {
        try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            const existing = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            const next = {
                firstSeenAt: existing.firstSeenAt || new Date().toISOString(),
                firstReferrer: existing.firstReferrer || document.referrer || '',
                lastReferrer: document.referrer || existing.lastReferrer || '',
                landingPath: existing.landingPath || window.location.pathname,
                lastPath: window.location.pathname,
                utm_source: params.get('utm_source') || existing.utm_source || '',
                utm_medium: params.get('utm_medium') || existing.utm_medium || '',
                utm_campaign: params.get('utm_campaign') || existing.utm_campaign || '',
                utm_term: params.get('utm_term') || existing.utm_term || '',
                utm_content: params.get('utm_content') || existing.utm_content || ''
            };
            localStorage.setItem(this.storageKey, JSON.stringify(next));
        } catch (e) {}
    },
    current() {
        try { return JSON.parse(localStorage.getItem(this.storageKey) || '{}'); }
        catch (e) { return {}; }
    }
};

const ExperimentManager = {
    storageKey: 'gh_experiments',
    assignBookingVariant() {
        try {
            const state = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            if (!state.bookingFormVariant) {
                state.bookingFormVariant = Math.random() < 0.5 ? 'control' : 'variant_a';
                state.assignedAt = new Date().toISOString();
                localStorage.setItem(this.storageKey, JSON.stringify(state));
            }
            return state.bookingFormVariant;
        } catch (e) {
            return 'control';
        }
    },
    current() {
        try { return JSON.parse(localStorage.getItem(this.storageKey) || '{}'); }
        catch (e) { return {}; }
    }
};

const Translations = {
    en: {
        nav_home: "Home", nav_tours: "Destinations", nav_packages: "Packages", nav_guide: "Guide", nav_fleet: "Fleet", nav_reviews: "Reviews", nav_book: "Book Now",
        label_gallery: "Photo Gallery", label_highlights: "Top Sights", label_next: "Explore Next", btn_view: "View Details", label_map: "View on Google Maps",
        cta_title: "Plan Your Trip", cta_subtitle: "Personal Driver & Car",
        trust_1: "Free Cancellation", trust_2: "Pay on Arrival", trust_3: "English/Arabic Driver",
        footer_desc: "Premium transport solutions in Georgia. Safety, comfort, and local expertise.",
        footer_links: "Quick Links", footer_contact: "Contact Us", footer_privacy: "Privacy Policy"
    },
    ar: {
        nav_home: "الرئيسية", nav_tours: "وجهات", nav_packages: "باقات", nav_guide: "دليل السفر", nav_fleet: "السيارات", nav_reviews: "الآراء", nav_book: "احجز الآن",
        label_gallery: "معرض الصور", label_highlights: "أبرز المعالم", label_next: "وجهتك القادمة", btn_view: "شاهد التفاصيل", label_map: "الموقع على الخريطة",
        cta_title: "خطط لرحلتك", cta_subtitle: "سيارة مع سائق خاص",
        trust_1: "إلغاء مجاني", trust_2: "الدفع عند الوصول", trust_3: "سائقين يتحدثون العربية",
        footer_desc: "حلول نقل فاخرة في جورجيا. أمان وراحة وخبرة محلية.",
        footer_links: "روابط سريعة", footer_contact: "اتصل بنا", footer_privacy: "سياسة الخصوصية"
    }
};

const AnalyticsTracker = {
    event(name, payload = {}) {
        try {
            if (typeof gtag === 'function') {
                gtag('event', name, payload);
            }
        } catch (e) {}
    }
};

function sanitizeRichText(input) {
    if (typeof input !== 'string') return '';

    const template = document.createElement('template');
    template.innerHTML = input;

    const allowedTags = new Set(['BR', 'SPAN', 'B', 'STRONG', 'I', 'EM']);
    const nodes = [];
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((el) => {
        if (!allowedTags.has(el.tagName)) {
            el.replaceWith(document.createTextNode(el.textContent || ''));
            return;
        }

        Array.from(el.attributes).forEach((attr) => {
            if (attr.name !== 'class') {
                el.removeAttribute(attr.name);
                return;
            }

            const safeClasses = attr.value
                .split(/\s+/)
                .filter((c) => /^[a-zA-Z0-9_-]{1,40}$/.test(c));

            if (safeClasses.length) el.setAttribute('class', safeClasses.join(' '));
            else el.removeAttribute('class');
        });
    });

    return template.innerHTML;
}

function setSafeHTML(el, value) {
    if (!el || !value) return;
    el.innerHTML = sanitizeRichText(value);
}

function sanitizeImageUrl(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
    if (/^[./a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg|gif|avif|svg)$/i.test(trimmed)) return trimmed;
    return '';
}

// ==========================================
// START CONFIGURATION (EDIT VIA ADMIN.HTML)
// ==========================================
window.DestData = {
    'tbilisi': {
        img: 'Tbilisi.webp',
        gallery: [
            'https://images.unsplash.com/photo-1539656206689-d4198db85834?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1582236357876-0f836526154b?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1569947936662-81438903c734?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80'
        ],
        highlights_en: ["Old Town & Sulphur Baths", "Narikala Fortress", "Peace Bridge", "Rustaveli Avenue"],
        highlights_ar: ["المدينة القديمة وحمامات الكبريت", "قلعة ناريكالا", "جسر السلام", "شارع روستافيلي"],
        title_en: "Tbilisi: The Heart of Georgia",
        title_ar: "السياحة في تبليسي: أهم المعالم والأماكن",
        desc_en: "Tbilisi, the capital of Georgia, is a city where old meets new in a spectacular fashion. Founded in the 5th century, its diverse history is reflected in its architecture, which is a mix of medieval, neoclassical, Beaux Arts, Art Nouveau, Stalinist and Modern structures.\n\nWander through the narrow streets of the Old Town, relax in the famous sulfur baths (Abanotubani), and enjoy the stunning panoramic views from Narikala Fortress. Whether you're looking for history, modern nightlife, or culinary adventures, Tbilisi has it all.",
        desc_ar: "تبليسي، عاصمة جورجيا، هي مدينة يلتقي فيها التاريخ بالحداثة في مشهد مذهل. تأسست في القرن الخامس، وتتميز بتاريخها المتنوع الذي ينعكس في عمارتها الفريدة.\n\nتجوّل في الأزقة الضيقة للمدينة القديمة، واسترخِ في حمامات الكبريت الشهيرة (أبانوتوباني)، واستمتع بإطلالات بانورامية خلابة من قلعة ناريكالا. سواء كنت تبحث عن التاريخ، الحياة العصرية، أو تجربة المطبخ الجورجي الأصيل، فإن تبليسي هي وجهتك المثالية."
    },
    'kazbegi': {
        img: 'Kazbegi.webp',
        gallery: [
            'https://images.unsplash.com/photo-1549466540-349079f2913e?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1560965377-63a236087b32?auto=format&fit=crop&w=800&q=80'
        ],
        highlights_en: ["Gergeti Trinity Church", "Mount Kazbek View", "Gveleti Waterfall", "Dariali Gorge"],
        highlights_ar: ["كنيسة الثالوث جيرجيتي", "إطلالة جبل كازبيك", "شلال جفيليتي", "مضيق داريالي"],
        title_en: "Kazbegi: Peaks Above the Clouds",
        title_ar: "رحلة كازبيجي: جبال القوقاز والطبيعة",
        desc_en: "Step into a postcard at Kazbegi (Stepantsminda). This region is home to the breathtaking Mount Kazbek and the iconic Gergeti Trinity Church, sitting high at 2,170 meters under the glacier.\n\nThe drive along the Georgian Military Highway is an adventure in itself, passing the Ananuri Fortress and the Russia-Georgia Friendship Monument. It is a perfect destination for nature lovers, hikers, and anyone seeking fresh mountain air.",
        desc_ar: "استمتع بمشهد خيالي في كازبيجي (ستيبانتسميندا). هذه المنطقة هي موطن جبل كازبيك الشاهق وكنيسة الثالوث جيرجيتي الشهيرة التي تتربع على ارتفاع 2170 متراً تحت النهر الجليدي.\n\nالطريق عبر الطريق العسكري الجورجي هو مغامرة بحد ذاته، مروراً بقلعة أنانوري ونصب الصداقة. إنها الوجهة المثالية لعشاق الطبيعة والمشي لمسافات طويلة وكل من يبحث عن هواء الجبل النقي."
    },
    'martvili': {
        img: 'Martvili.webp',
        gallery: [
            'https://images.unsplash.com/photo-1570701123490-67c858561d2d?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=800&q=80'
        ],
        highlights_en: ["Boat Ride in Canyon", "Walking Trails", "Dadiani Palace", "Waterfalls"],
        highlights_ar: ["جولة بالقارب في الوادي", "مسارات المشي", "قصر دادياني", "الشلالات"],
        title_en: "Martvili Canyon: Emerald Waters",
        title_ar: "وادي مارتفيلي: جولة القوارب والشلالات",
        desc_en: "Discover the hidden gem of Western Georgia. Martvili Canyon offers a surreal experience with its emerald green waters, waterfalls, and white limestone cliffs.\n\nThe highlight of any trip here is a boat ride through the stunning gorges. Historically, this was a bathing place for the Dadiani noble family. Today, it stands as one of the most photogenic spots in the country.",
        desc_ar: "اكتشف الجوهرة المخفية في غرب جورجيا. يقدم وادي مارتفيلي تجربة خيالية بمياهه الخضراء الزمردية، والشلالات، والمنحدرات الصخرية البيضاء.\n\nأبرز ما في الرحلة هنا هو ركوب القارب عبر المضائق المذهلة. تاريخياً، كان هذا المكان مسبحاً لعائلة دادياني النبيلة. اليوم، يعد واحداً من أجمل المواقع للتصوير في البلاد."
    },
    'signagi': {
        img: 'Signagi.webp',
        gallery: [
            'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1534065662709-b6814b73b578?auto=format&fit=crop&w=800&q=80'
        ],
        highlights_en: ["City Walls Walk", "Bodbe Monastery", "Wine Tasting", "Alazani Valley View"],
        highlights_ar: ["المشي على أسوار المدينة", "دير بودبي", "تذوق النبيذ", "إطلالة وادي ألازاني"],
        title_en: "Signagi: The City of Love",
        title_ar: "سغناغي: مدينة الحب ومزارع العنب",
        desc_en: "Perched on a hilltop overlooking the vast Alazani Valley and the Caucasus Mountains, Signagi is one of Georgia's most charming towns. Known as the 'City of Love', it is famous for its 24/7 wedding house and romantic atmosphere.\n\nWander through cobblestone streets, admire the 18th-century architecture, and explore the ancient city walls. As the heart of the Kakheti wine region, it is also the best place to taste traditional Georgian wine.",
        desc_ar: "تتربع سغناغي على قمة تل يطل على وادي ألازاني الشاسع وجبال القوقاز، وهي واحدة من أكثر المدن سحراً في جورجيا. تُعرف بـ 'مدينة الحب'، وتشتهر بأجوائها الرومانسية ومكتب الزواج الذي يعمل على مدار الساعة.\n\nتجول في الشوارع المرصوفة بالحصى، وتأمل العمارة من القرن الثامن عشر، واستكشف أسوار المدينة القديمة. وباعتبارها قلب منطقة كاخيتي للنبيذ، فهي أفضل مكان لتذوق النبيذ الجورجي التقليدي."
    },
    'batumi': {
        img: 'Batumi.webp',
        gallery: [
            'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1539656206689-d4198db85834?auto=format&fit=crop&w=800&q=80'
        ],
        highlights_en: ["Ali & Nino Statue", "Batumi Boulevard", "Botanical Garden", "Alphabetic Tower"],
        highlights_ar: ["تمثال علي ونينو", "بوليفارد باتومي", "الحديقة النباتية", "برج الحروف"],
        title_en: "Batumi: Pearl of the Black Sea",
        title_ar: "باتومي: لؤلؤة البحر الأسود",
        desc_en: "Batumi is a vibrant seaside city on the Black Sea coast and capital of Adjara. It's known for its modern architecture, botanical garden, and pebbly beaches.",
        desc_ar: "باتومي هي مدينة ساحلية نابضة بالحياة على ساحل البحر الأسود وعاصمة أدجارا. تشتهر بعمارتها الحديثة وحديقتها النباتية وشواطئها الحصوية."
    }
};
// ==========================================
// END CONFIGURATION
// ==========================================

let DestKeys = Object.keys(window.DestData);

function normalizeDestinationShape(id, raw = {}) {
    const existing = window.DestData[id] || {};
    return {
        ...existing,
        title_en: raw.title_en || raw.title?.en || existing.title_en || '',
        title_ar: raw.title_ar || raw.title?.ar || existing.title_ar || '',
        desc_en: raw.desc_en || raw.desc?.en || existing.desc_en || '',
        desc_ar: raw.desc_ar || raw.desc?.ar || existing.desc_ar || '',
        img: raw.img || raw.thumbnail || existing.img || '',
        gallery: raw.gallery || existing.gallery || [],
        highlights_en: raw.highlights_en || raw.highlights?.en || existing.highlights_en || [],
        highlights_ar: raw.highlights_ar || raw.highlights?.ar || existing.highlights_ar || [],
        map_url: raw.map_url || raw.mapUrl || existing.map_url || ''
    };
}

function applyNavbarSettings(data = {}) {
    if (!data.items || !Array.isArray(data.items)) return;
    
    const isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
    
    // Desktop Nav
    const desktopNav = document.getElementById('desktop-links-container');
    if (desktopNav) {
        // Only clear if we actually have items to replace
        if(data.items.length > 0) desktopNav.innerHTML = '';
        
        data.items.forEach(item => {
            const label = isAr ? (item.label_ar || item.label_en) : item.label_en;
            const link = item.link;
            
            const a = document.createElement('a');
            a.href = link;
            a.className = 'nav-link';
            // Simple active check heuristic
            if(window.location.href.includes(link) && link !== '/' && link !== '#') a.classList.add('active');
            a.textContent = label;
            desktopNav.appendChild(a);
        });
    }

    // Mobile Nav
    const mobileNav = document.getElementById('mobile-links-container');
    if (mobileNav) {
        if(data.items.length > 0) mobileNav.innerHTML = '';
        
        data.items.forEach(item => {
             const label = isAr ? (item.label_ar || item.label_en) : item.label_en;
             const link = item.link;

             const a = document.createElement('a');
             a.href = link;
             a.className = 'mobile-link'; 
             if(window.location.href.includes(link) && link !== '/' && link !== '#') a.classList.add('active');
             a.textContent = label;
             mobileNav.appendChild(a);
        });
    }
}

function renderSliderDestinations(dests) {
    const slider = document.getElementById('tours-slider');
    if (!slider) return;

    // Clear slider (remove existing cards and clones) - keep structure clean
    slider.innerHTML = '';
    slider.removeAttribute('data-initialized'); // Reset init state

    const lang = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl' ? 'ar' : 'en';

    Object.keys(dests).forEach(id => {
        const d = dests[id];
        const title = lang === 'ar' ? (d.title_ar || d.title_en) : d.title_en;
        const desc = lang === 'ar' ? (d.desc_ar || d.desc_en) : d.desc_en;
        const btnText = lang === 'ar' ? 'اذهب هنا' : 'Drive Here';
        // Check if a static file exists for standard ones or route to generic destination.html
        // We assume generic is safer for dynamically added ones.
        // For legacy keys (tbilisi, kazbegi, martvili), we might want to keep static links if they exist?
        // Actually, destination.html?id=... handles everything now via DestinationApp.
        // But let's check if we want to preserve old links.
        // The original code had href="tbilisi.html".
        // Let's use destination.html?id=ID for all to be consistent, OR check a list.
        // However, standard pages might have custom layouts.
        // Let's stick to destination.html?id=... for dynamic ones, and maybe hardcode the known statics?
        // Actually, DestinationApp redirects index.html links but maybe not these.
        // Let's just use destination.html?id=${id} for simplicity and consistency with the new system.
        
        const link = `destination.html?id=${id}`; 

        const card = document.createElement('a');
        card.href = link;
        card.className = 'tour-card group';
        
        // Image
        const img = document.createElement('img');
        img.src = d.img;
        img.width = 380; // Standardize
        img.height = 475;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'tour-card-img'; // Use consistent class
        img.alt = title;
        
        const overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        
        const content = document.createElement('div');
        content.className = 'tour-content';
        
        const h3 = document.createElement('h3');
        h3.className = 'tour-title';
        h3.textContent = title;
        
        const p = document.createElement('p');
        p.className = 'tour-desc';
        p.textContent = desc.substring(0, 60) + (desc.length > 60 ? '...' : '');
        
        const span = document.createElement('span');
        span.className = 'tour-btn text-accent-light';
        span.innerHTML = `${btnText} <i class="fa-solid fa-arrow-right rtl:rotate-180"></i>`;
        
        content.appendChild(h3);
        content.appendChild(p);
        content.appendChild(span);
        
        card.appendChild(img);
        card.appendChild(overlay);
        card.appendChild(content);
        
        slider.appendChild(card);
    });
}

(async function refreshContentFromFirestore() {
    if (!db) return; // No Firebase

    try {
        // Fetch Destinations (Dynamic Slider)
        try {
            // Fetch all to handle legacy data missing 'active' field
            const allDestsSnap = await db.collection('destinations').get();
            
            if (!allDestsSnap.empty) {
                const newDests = {};
                allDestsSnap.forEach(doc => {
                    const data = doc.data();
                    // Filter: Only exclude if explicitly set to false
                    if (data.active === false) return;
                    newDests[doc.id] = normalizeDestinationShape(doc.id, data);
                });
                
                // Update global data
                window.DestData = { ...window.DestData, ...newDests };
                
                // Re-render slider
                renderSliderDestinations(window.DestData);
                
                // Re-initialize slider logic if module API is ready
                if (window.GHCoreUI && window.GHCoreUI.initSlider) {
                     const slider = document.getElementById('tours-slider');
                     if (slider && slider.dataset.initialized) {
                         slider.removeAttribute('data-initialized');
                         window.GHCoreUI.initSlider();
                     }
                }
            }
        } catch (e) { console.warn("Destinations fetch failed", e); }

        // Fetch Settings (Prices immediately)
        const settingsSnap = await db.collection('settings').doc('global').get();
        if (settingsSnap.exists) {
            const s = settingsSnap.data();
            if (s.prices) AppConfig.vehicleRates = { 'Sedan': s.prices.sedan || 150, 'Minivan': s.prices.minivan || 250 };
        }
        
        // Fetch Page Content (Based on body class)
        const isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
        const body = document.body;

        try {
            // Home Page Logic
            if (!body.classList.contains('secondary-page')) {
                const homeSnap = await db.collection('settings').doc('page_home').get();
                if (homeSnap.exists) {
                    const h = homeSnap.data();
                    
                    if (h.hero) {
                        const heroTitle = document.getElementById('hero-title');
                        const newTitle = isAr ? h.hero.title_ar : h.hero.title_en;
                        setSafeHTML(heroTitle, newTitle);
                        
                        const heroSub = document.getElementById('hero-subtitle');
                        const newSub = isAr ? h.hero.subtitle_ar : h.hero.subtitle_en;
                        setSafeHTML(heroSub, newSub);
                        
                        const heroImg = document.getElementById('hero-img');
                        const safeHeroImage = sanitizeImageUrl(h.hero.bg_image);
                        if(heroImg && safeHeroImage) {
                            heroImg.src = safeHeroImage;
                            heroImg.srcset = `${safeHeroImage} 1x`;
                        }
                    }

                    if (h.about) {
                        const aboutTitle = document.getElementById('about-title');
                        // ... existing logic for home-about-section ...
                        const newAboutTitle = isAr ? h.about.title_ar : h.about.title_en;
                        setSafeHTML(aboutTitle, newAboutTitle);

                        const aboutDesc = document.getElementById('about-desc');
                        const newAboutDesc = isAr ? h.about.text_ar : h.about.text_en;
                        if(aboutDesc && newAboutDesc) aboutDesc.innerText = newAboutDesc;
                        
                        const aboutImg = document.getElementById('about-img');
                        if(aboutImg && h.about.image) aboutImg.src = h.about.image;
                    }
                    
                    // Features / How It Works
                    if (h.hero) {
                        const setTxt = (id, en, ar) => {
                            const el = document.getElementById(id);
                            if(el) el.innerText = isAr ? ar : en;
                        };
                        setTxt('steps-title', h.hero.steps_title_en, h.hero.steps_title_ar);
                        setTxt('step1-title', h.hero.step1_title_en, h.hero.step1_title_ar);
                        setTxt('step1-desc', h.hero.step1_desc_en, h.hero.step1_desc_ar);
                        setTxt('step2-title', h.hero.step2_title_en, h.hero.step2_title_ar);
                        setTxt('step2-desc', h.hero.step2_desc_en, h.hero.step2_desc_ar);
                        setTxt('step3-title', h.hero.step3_title_en, h.hero.step3_title_ar);
                        setTxt('step3-desc', h.hero.step3_desc_en, h.hero.step3_desc_ar);
                    }
                }
            }
            
            // About Page Logic (Exclusive)
            else if (body.classList.contains('page-about') && !body.classList.contains('page-services') && !body.classList.contains('page-contact')) {
                const aboutSnap = await db.collection('settings').doc('page_about').get();
                if (aboutSnap.exists) {
                    const a = aboutSnap.data();
                    
                    if (a.hero) {
                        const heroTitle = document.getElementById('hero-title');
                        const newHeroTitle = isAr ? a.hero.title_ar : a.hero.title_en;
                        setSafeHTML(heroTitle, newHeroTitle);

                        const heroSub = document.getElementById('hero-subtitle');
                        const newHeroSub = isAr ? a.hero.subtitle_ar : a.hero.subtitle_en;
                        setSafeHTML(heroSub, newHeroSub);
                    }
                    if (a.story) {
                        const storyTitle = document.getElementById('story-title');
                        const newStoryTitle = isAr ? a.story.title_ar : a.story.title_en;
                        setSafeHTML(storyTitle, newStoryTitle);
                        
                        const storyIntro = document.getElementById('story-intro');
                        const newIntro = isAr ? a.story.intro_ar : a.story.intro_en;
                        if(storyIntro && newIntro) storyIntro.innerText = newIntro;
                    }
                }
            }

            // Services Page Logic
            else if (body.classList.contains('page-services')) {
                const servSnap = await db.collection('settings').doc('page_services').get();
                if (servSnap.exists) {
                    const s = servSnap.data();
                    if (s.hero) {
                         const ht = document.getElementById('hero-title');
                         const newHt = isAr ? s.hero.title_ar : s.hero.title_en;
                         setSafeHTML(ht, newHt);
                         
                         const hs = document.getElementById('hero-subtitle');
                         const newHs = isAr ? s.hero.subtitle_ar : s.hero.subtitle_en;
                         setSafeHTML(hs, newHs);
                    }
                    if (s.intro) {
                         const it = document.getElementById('intro-title');
                         const newIt = isAr ? s.intro.title_ar : s.intro.title_en;
                         if(it && newIt) it.innerText = newIt;

                         const idesc = document.getElementById('intro-desc');
                         const newIdesc = isAr ? s.intro.desc_ar : s.intro.desc_en;
                         if(idesc && newIdesc) idesc.innerText = newIdesc;
                    }
                }
            }

            // Contact Page Logic
            else if (body.classList.contains('page-contact')) {
                const contSnap = await db.collection('settings').doc('page_contact').get();
                if (contSnap.exists) {
                    const c = contSnap.data();
                    if (c.hero) {
                         const ht = document.getElementById('hero-title');
                         const newHt = isAr ? c.hero.title_ar : c.hero.title_en;
                         setSafeHTML(ht, newHt);
                         
                         const hs = document.getElementById('hero-subtitle');
                         const newHs = isAr ? c.hero.subtitle_ar : c.hero.subtitle_en;
                         setSafeHTML(hs, newHs);
                    }
                    if (c.intro) {
                         const it = document.getElementById('intro-title');
                         const newIt = isAr ? c.intro.title_ar : c.intro.title_en;
                         if(it && newIt) it.innerText = newIt;

                         const idesc = document.getElementById('intro-desc');
                         const newIdesc = isAr ? c.intro.desc_ar : c.intro.desc_en;
                         if(idesc && newIdesc) idesc.innerText = newIdesc;
                    }
                }
            }

            // Shared Content (Footer, Trust, Booking Flow)
            const sharedSnap = await db.collection('settings').doc('page_shared').get();
            if (sharedSnap.exists) {
                window.SharedContent = sharedSnap.data();
            }

        } catch(e) { console.warn("Content fetch error", e); }


        // Fetch Contact Settings
        try {
            const contactSnap = await db.collection('settings').doc('contact').get();
            if (contactSnap.exists) {
                const c = contactSnap.data();
                if(c.whatsapp) {
                     document.querySelectorAll('a[href*="wa.me"]').forEach(el => el.href = `https://wa.me/${c.whatsapp}`);
                }
                if(c.phone) {
                     document.querySelectorAll('a[href^="tel:"]').forEach(el => el.href = `tel:${c.phone}`);
                }
            }
        } catch(e) { console.warn("Contact settings error", e); }

        // Fetch Navbar Settings
        try {
            const navbarSnap = await db.collection('settings').doc('navbar').get();
            if (navbarSnap.exists) {
                const navbarSettings = navbarSnap.data();
                const applyNow = () => applyNavbarSettings(navbarSettings);
                applyNow();
                window.addEventListener('DOMContentLoaded', applyNow, { once: true });
            }
        } catch (e) { console.warn("Navbar settings error", e); }

        // Fetch Destinations
        const snapshot = await db.collection('destinations').get();
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                window.DestData[doc.id] = normalizeDestinationShape(doc.id, doc.data());
            });
            
            // Update Keys
            DestKeys = Object.keys(window.DestData);
            
            // Dispatch Event to notify UI
            window.dispatchEvent(new CustomEvent('gh-content-updated'));
            console.log('Content refreshed from Firestore');
        }
    } catch(e) {
        console.error('Error fetching content:', e);
    }
})();




// ==========================================
// 3. SHARED MANAGERS
// ==========================================

// --- Currency Manager ---
const CurrencyManager = {
    current: 'GEL',
    rates: { ...AppConfig.defaultRates },

    init() {
        try {
            const saved = localStorage.getItem('userCurrency');
            if (saved && AppConfig.currencies.find(c => c.code === saved)) {
                this.current = saved;
            }
        } catch (e) {}
        this.updateUI();
        this.fetchRates();
    },

    set(code) {
        this.current = code;
        try { localStorage.setItem('userCurrency', code); } catch (e) {}
        this.updateUI();
        this.updatePrices();
    },

    async fetchRates() {
        try {
            const CACHE_KEY = 'currency_rates_data';
            const CACHE_TTL = 3600000 * 24; 
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            const now = Date.now();

            if (cached && (now - cached.timestamp < CACHE_TTL)) {
                this.rates = cached.rates;
                this.updatePrices();
                return;
            }

            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/GEL`);
            if (response.ok) {
                const data = await response.json();
                this.rates = data.rates;
                localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, timestamp: now }));
                this.updatePrices();
            }
        } catch (e) { console.warn("Using offline rates"); }
    },

    convert(amountGEL) {
        if (this.current === 'GEL') return amountGEL;
        const rate = this.rates[this.current] || 1;
        const converted = amountGEL * rate;
        return Math.ceil(converted / 5) * 5;
    },

    updateUI() {
        const flagUrl = `https://flagcdn.com/w40/${AppConfig.currencies.find(c => c.code === this.current).flag}.png`;
        ['desktop', 'mobile'].forEach(type => {
            const codeEl = document.getElementById(`curr-code-${type}`);
            const flagEl = document.getElementById(`curr-flag-${type}`);
            if (codeEl) codeEl.innerText = this.current;
            if (flagEl) flagEl.src = flagUrl;
        });
    },

    updatePrices() {
        document.querySelectorAll('.price-display').forEach(el => {
            const base = parseFloat(el.dataset.basePrice);
            if (base) {
                el.innerText = `${this.convert(base)} ${this.current}`;
            }
        });
        if (BookingManager.updateEstimate) {
            BookingManager.updateEstimate();
        }
    }
};

// --- UI Manager ---
const UIManager = {
    init() {
        this.applyPageVisualContext();
        this.normalizeNavigation();
        this.normalizeMicrocopy();
        this.injectUniversalProfessionalSection();
        this.setupMobileMenu();
        this.setupScrollListener();
        CurrencyManager.init();
        this.initDropdowns();
        this.updateCopyright();
        this.updateActiveNavLink();
    },

    applyPageVisualContext() {
        const path = (window.location.pathname || '').toLowerCase();
        const isHome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('/arabic.html') || path === '/index.html' || path === '/arabic.html';
        if (!isHome) document.body.classList.add('secondary-page');
        if (path.includes('blog')) document.body.classList.add('page-blog');
        if (path.includes('guide')) document.body.classList.add('page-guide');
        if (path.includes('article-')) document.body.classList.add('page-article');
        if (path.includes('booking')) document.body.classList.add('page-booking');
        if (path.includes('about')) document.body.classList.add('page-about');
        if (path.includes('services')) document.body.classList.add('page-services');
        if (path.includes('contact')) document.body.classList.add('page-contact');
        if (path.includes('legal')) document.body.classList.add('page-legal');
    },

    getLangConfig() {
        const isArabic = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
        let langSwitch = isArabic ? 'index.html' : 'arabic.html';
        const path = (window.location.pathname || '').toLowerCase();
        const filename = path.substring(path.lastIndexOf('/') + 1);

        if (filename.includes('destination.html')) {
            langSwitch = 'javascript:LangManager.toggle()';
        } else {
            if (isArabic) {
                if (filename === 'arabic.html') langSwitch = 'index.html';
                else if (filename.endsWith('-ar.html')) langSwitch = filename.replace('-ar.html', '.html');
            } else {
                if (filename === 'index.html' || filename === '') langSwitch = 'arabic.html';
                else if (filename.endsWith('.html') && !filename.endsWith('-ar.html')) langSwitch = filename.replace('.html', '-ar.html');
            }
        }

        return {
            isArabic,
            home: isArabic ? 'arabic.html' : 'index.html',
            services: isArabic ? 'services-ar.html' : 'services.html',
            guide: isArabic ? 'guide-ar.html' : 'guide.html',
            about: isArabic ? 'about-ar.html' : 'about.html',
            blog: isArabic ? 'blog-ar.html' : 'blog.html',
            contact: isArabic ? 'contact-ar.html' : 'contact.html',
            booking: isArabic ? 'booking-ar.html' : 'booking.html',
            langSwitch: langSwitch,
            langText: isArabic ? 'English' : 'العربية',
            homeText: isArabic ? 'الرئيسية' : 'Home',
            servicesText: isArabic ? 'الخدمات' : 'Services',
            guideText: isArabic ? 'الدليل' : 'Guide',
            aboutText: isArabic ? 'من نحن' : 'About',
            blogText: isArabic ? 'المدونة' : 'Blog',
            contactText: isArabic ? 'اتصل بنا' : 'Contact',
            bookText: isArabic ? 'احجز الآن' : 'Book Now'
        };
    },

    normalizeNavigation() {
        if (window.__GH_SHARED_NAVBAR__) return;
        const nav = document.getElementById('navbar');
        if (!nav) return;

        const cfg = this.getLangConfig();
        const navInner = nav.querySelector('.navbar-inner');
        const desktopMenu = nav.querySelector('.desktop-menu');
        const mobileControls = nav.querySelector('.mobile-controls');
        const mobileMenu = document.getElementById('mobile-menu');
        const logoLink = nav.querySelector('.nav-logo');

        if (logoLink) logoLink.setAttribute('href', cfg.home);

        if (desktopMenu) {
            desktopMenu.innerHTML = `
                <a href="${cfg.home}" class="nav-link">${cfg.homeText}</a>
                <a href="${cfg.services}" class="nav-link">${cfg.servicesText}</a>
                <a href="${cfg.guide}" class="nav-link">${cfg.guideText}</a>
                <a href="${cfg.about}" class="nav-link">${cfg.aboutText}</a>
                <a href="${cfg.blog}" class="nav-link">${cfg.blogText}</a>
                <a href="${cfg.contact}" class="nav-link">${cfg.contactText}</a>
                <a href="${cfg.langSwitch}" class="action-btn"><i class="fa-solid fa-globe"></i> ${cfg.langText}</a>
                <a href="${cfg.booking}" class="btn-book-nav">${cfg.bookText}</a>`;
        }

        if (mobileControls) {
            mobileControls.innerHTML = `
                <a href="${cfg.langSwitch}" class="action-btn" style="font-size:0.75rem; padding:0.375rem 0.75rem;"><i class="fa-solid fa-globe"></i> ${cfg.langText}</a>
                <button id="mobile-menu-btn" class="btn-mobile-menu" aria-label="Toggle Navigation Menu" aria-expanded="false" aria-controls="mobile-menu"><i class="fa-solid fa-bars"></i></button>`;
        } else if (navInner) {
            const controls = document.createElement('div');
            controls.className = 'mobile-controls';
            controls.innerHTML = `
                <a href="${cfg.langSwitch}" class="action-btn" style="font-size:0.75rem; padding:0.375rem 0.75rem;"><i class="fa-solid fa-globe"></i> ${cfg.langText}</a>
                <button id="mobile-menu-btn" class="btn-mobile-menu" aria-label="Toggle Navigation Menu" aria-expanded="false" aria-controls="mobile-menu"><i class="fa-solid fa-bars"></i></button>`;
            navInner.appendChild(controls);
        }

        if (mobileMenu) {
            mobileMenu.innerHTML = `
                <button id="close-menu-btn" class="close-menu-btn" aria-label="Close Navigation Menu"><i class="fa-solid fa-xmark"></i></button>
                <a href="${cfg.home}" class="mobile-link">${cfg.homeText}</a>
                <a href="${cfg.services}" class="mobile-link">${cfg.servicesText}</a>
                <a href="${cfg.guide}" class="mobile-link">${cfg.guideText}</a>
                <a href="${cfg.about}" class="mobile-link">${cfg.aboutText}</a>
                <a href="${cfg.blog}" class="mobile-link">${cfg.blogText}</a>
                <a href="${cfg.contact}" class="mobile-link">${cfg.contactText}</a>
                <a href="${cfg.booking}" class="mobile-btn-book">${cfg.bookText}</a>`;
        }
    },

    normalizeMicrocopy() {
        const cfg = this.getLangConfig();

        document.querySelectorAll('a.btn-book-nav[href*="booking"], a.mobile-btn-book[href*="booking"]').forEach((link) => {
            link.textContent = cfg.bookText;
        });

        // Removed improved navbar text overrides that conflict with shared-navbar language switcher
        /*
        document.querySelectorAll('a[href="services.html"].action-btn, a[href="services-ar.html"].action-btn').forEach((link) => {
            link.textContent = cfg.servicesText;
        });

        document.querySelectorAll('a[href="guide.html"].action-btn, a[href="guide-ar.html"].action-btn').forEach((link) => {
            link.textContent = cfg.guideText;
        });
        */

        document.querySelectorAll('a[href="contact.html"].btn-book-nav, a[href="contact-ar.html"].btn-book-nav, a[href="contact.html"].action-btn, a[href="contact-ar.html"].action-btn').forEach((link) => {
            // Check if this is likely a shared-navbar language switcher or mobile control
            if (link.getAttribute('aria-label') === 'Language switch' || link.closest('.mobile-controls') || link.closest('.desktop-menu')) {
                return;
            }
            link.textContent = cfg.isArabic ? 'تواصل مع الفريق' : 'Contact Team';
        });

        document.querySelectorAll('a.blog-link').forEach((link) => {
            const iconClass = cfg.isArabic ? 'fa-arrow-left' : 'fa-arrow-right';
            link.innerHTML = `${cfg.isArabic ? 'اقرأ المقال' : 'Read Article'} <i class="fa-solid ${iconClass}"></i>`;
        });

        document.querySelectorAll('a[href="legal.html"]').forEach((link) => {
            link.textContent = cfg.isArabic ? 'سياسة الخصوصية' : 'Privacy Policy';
        });
    },

    injectUniversalProfessionalSection() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('index.html') || path.includes('arabic.html') || path.endsWith('/') || path.includes('admin.html') || path.includes('404.html')) return;
        if (document.querySelector('.pro-growth-section, .process-grid, .compare-grid, .testimonials-grid')) return;

        const main = document.getElementById('main-content');
        if (!main) return;

        const shared = window.SharedContent || {};
        const flow = shared.booking_flow || {};

        const cfg = this.getLangConfig();
        const isAr = cfg.isArabic;

        const t = (keyEn, keyAr) => isAr ? (flow[keyAr] || flow[keyEn]) : flow[keyEn];

        const section = document.createElement('section');
        section.className = 'content-card pro-growth-section';
        section.style.cssText = 'padding:2rem; margin-top:2rem;';
        section.innerHTML = cfg.isArabic
            ? `
                <h2 class="section-heading">${flow.title_ar || 'الحجز بطريقة احترافية'}</h2>
                <div class="process-grid" style="margin-bottom:1.5rem;">
                    <article class="process-card"><span class="process-step">1</span><h3 class="process-title">${flow.step1_title_ar || 'أرسل تفاصيل الرحلة'}</h3><p class="process-text">${flow.step1_desc_ar || 'المسار والتواريخ وعدد المسافرين.'}</p></article>
                    <article class="process-card"><span class="process-step">2</span><h3 class="process-title">${flow.step2_title_ar || 'استلم عرض واضح'}</h3><p class="process-text">${flow.step2_desc_ar || 'سعر وخطة خدمة بدون رسوم مخفية.'}</p></article>
                    <article class="process-card"><span class="process-step">3</span><h3 class="process-title">${flow.step3_title_ar || 'تأكيد سريع'}</h3><p class="process-text">${flow.step3_desc_ar || 'تأكيد واتساب وتجهيز الجدول قبل الوصول.'}</p></article>
                </div>
                <div class="proof-grid">
                    <div class="proof-card"><p class="proof-number">24/7</p><p class="proof-label">دعم</p></div>
                    <div class="proof-card"><p class="proof-number">10 د</p><p class="proof-label">متوسط الرد</p></div>
                    <div class="proof-card"><p class="proof-number">4.9/5</p><p class="proof-label">تقييم العملاء</p></div>
                    <div class="proof-card"><p class="proof-number">100%</p><p class="proof-label">رحلات خاصة</p></div>
                </div>`
            : `
                <h2 class="section-heading">${flow.title_en || 'Professional Booking Flow'}</h2>
                <div class="process-grid" style="margin-bottom:1.5rem;">
                    <article class="process-card"><span class="process-step">1</span><h3 class="process-title">${flow.step1_title_en || 'Share trip details'}</h3><p class="process-text">${flow.step1_desc_en || 'Route, dates, and passenger count.'}</p></article>
                    <article class="process-card"><span class="process-step">2</span><h3 class="process-title">${flow.step2_title_en || 'Get clear quote'}</h3><p class="process-text">${flow.step2_desc_en || 'Transparent price and service scope.'}</p></article>
                    <article class="process-card"><span class="process-step">3</span><h3 class="process-title">${flow.step3_title_en || 'Confirm quickly'}</h3><p class="process-text">${flow.step3_desc_en || 'WhatsApp confirmation with ready schedule.'}</p></article>
                </div>
                <div class="proof-grid">
                    <div class="proof-card"><p class="proof-number">24/7</p><p class="proof-label">Support</p></div>
                    <div class="proof-card"><p class="proof-number">10m</p><p class="proof-label">Typical Reply</p></div>
                    <div class="proof-card"><p class="proof-number">4.9/5</p><p class="proof-label">Guest Rating</p></div>
                    <div class="proof-card"><p class="proof-number">100%</p><p class="proof-label">Private Trips</p></div>
                </div>`;

        main.appendChild(section);
    },

    initDropdowns() {
         ['desktop', 'mobile'].forEach(type => {
            const container = document.getElementById(`curr-options-${type}`);
            if(!container) return;
            container.innerHTML = '';
            AppConfig.currencies.forEach(curr => {
                const opt = document.createElement('div');
                opt.className = 'custom-option';
                opt.innerHTML = `<img src="https://flagcdn.com/w40/${curr.flag}.png" class="currency-flag-sm" alt="${curr.code}"> ${curr.code}`;
                opt.onclick = () => {
                    CurrencyManager.set(curr.code);
                    document.querySelectorAll('.custom-select-wrapper').forEach(el => el.classList.remove('open'));
                };
                container.appendChild(opt);
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select-wrapper')) {
                document.querySelectorAll('.custom-select-wrapper').forEach(el => el.classList.remove('open'));
            }
        });
    },

    toggleCurrencyDropdown(type) {
        const el = document.getElementById(`currency-${type}`);
        if(el) el.classList.toggle('open');
    },

    setupMobileMenu() {
        // Use Event Delegation to handle dynamically injected elements (like shared-navbar)
        document.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('#mobile-menu-btn');
            const closeBtn = e.target.closest('#close-menu-btn');
            const link = e.target.closest('.mobile-link, .mobile-btn-book'); // Handles navigation links inside mobile menu
            
            // Only proceed if one of the targets was clicked
            if (!menuBtn && !closeBtn && !link) return;

            const menu = document.getElementById('mobile-menu');
            const toggleBtn = document.getElementById('mobile-menu-btn'); 

            if (!menu) return;

            const isOpen = menu.classList.contains('open');

            // Toggle function
            const toggle = (forceState) => {
                const newState = (forceState !== undefined) ? forceState : !isOpen;
                menu.classList.toggle('open', newState);
                
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', newState);
                menu.setAttribute('aria-hidden', newState ? 'false' : 'true');
                document.body.classList.toggle('overflow-hidden', newState);
            };

            if (menuBtn) {
                toggle(); // Toggle open/close
            } else if (closeBtn) {
                toggle(false); // Force close
            } else if (link && isOpen) {
                toggle(false); // Close on link click
            }
        });

        document.addEventListener('keydown', (event) => {
            const menu = document.getElementById('mobile-menu');
            if (event.key === 'Escape' && menu && menu.classList.contains('open')) {
                const toggleBtn = document.getElementById('mobile-menu-btn');
                menu.classList.remove('open');
                if(toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                menu.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('overflow-hidden');
            }
        });
    },

    setupScrollListener() {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            const nav = document.getElementById('navbar');
            const sticky = document.querySelector('.sticky-bar');
            const backBtn = document.getElementById('backToTop');
            
            if (nav) {
                nav.classList.toggle('shadow-md', currentScroll > 20);
                nav.classList.toggle('scrolled', currentScroll > 20);
            }
            if (backBtn) backBtn.classList.toggle('show', currentScroll > 500);

            if (sticky) {
                 if (currentScroll > lastScroll && currentScroll > 100) {
                     sticky.classList.add('hide-bar');
                     if(nav && window.innerWidth < 1024) nav.classList.add('nav-hidden');
                 } else {
                     sticky.classList.remove('hide-bar');
                     if(nav) nav.classList.remove('nav-hidden');
                 }
            }
            lastScroll = currentScroll;
            
            const hero = document.getElementById('hero-img');
            if(hero && document.querySelector('.dest-hero')) {
                hero.style.transform = `translateY(${window.scrollY * 0.4}px)`;
            }
            
            this.updateActiveNavLink();
        }, { passive: true });
    },

    updateActiveNavLink() {
        // Disabled scroll spy updates for removed anchors
        // Only active link provided by current page URL is sufficient
        return;
    },

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('hidden');
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    },
    
    showToast(msg) {
         const toast = document.getElementById('network-toast');
        if (toast) {
            toast.innerHTML = `<i class="fa-solid fa-check"></i> <span>${msg}</span>`;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    },

    updateCopyright() {
        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.innerText = new Date().getFullYear();
    }
};


// --- Booking Manager ---
const BookingManager = {
    fpInstance: null,
    initialized: false,
    startedAt: Date.now(),
    trackedView: false,
    currentStep: 1,
    maxStepReached: 1,
    totalSteps: 3,

    init() {
        const form = document.getElementById('bookingForm');
        if(!form) return;

        const dateInput = document.getElementById('dateRange');

        if (!this.fpInstance && typeof flatpickr !== 'undefined') {
            this.fpInstance = flatpickr("#dateRange", {
                mode: "range",
                minDate: "today",
                dateFormat: "Y-m-d",
                disableMobile: "true",
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        this.updateEstimate();
                    }
                }
            });
        } else if (!this.fpInstance && dateInput) {
            dateInput.disabled = false;
            if (!dateInput.getAttribute('placeholder')) {
                const isArabic = document.documentElement.lang === 'ar';
                dateInput.setAttribute('placeholder', isArabic ? 'اختر تواريخ الاستلام والتسليم' : 'Select Pick-up & Drop-off Dates');
            }
        }

        if (!this.initialized) {
            this.startedAt = Date.now();
            this.loadDraft();
            form.addEventListener('input', () => this.saveDraft());
            this.initStepper();
            this.bindIntentCta();
            this.initialized = true;
        }

        if (!this.trackedView) {
            this.trackedView = true;
            AnalyticsTracker.event('funnel_booking_form_view', {
                page_path: window.location.pathname,
                variant: (ExperimentManager.current() || {}).bookingFormVariant || 'control'
            });
        }
        this.updateIntentCta();
    },

    initStepper() {
        const steps = document.querySelectorAll('.booking-step');
        if (!steps.length) return;

        const prevBtn = document.getElementById('stepPrev');
        const nextBtn = document.getElementById('stepNext');
        for (let i = 1; i <= this.totalSteps; i++) {
            const pill = document.getElementById(`step-pill-${i}`);
            if (!pill) continue;
            pill.onclick = () => {
                if (i <= this.maxStepReached) this.goToStep(i);
            };
        }

        if (prevBtn) prevBtn.onclick = () => this.goToStep(this.currentStep - 1);
        if (nextBtn) {
            nextBtn.onclick = () => {
                if (!this.validateStep(this.currentStep)) return;
                this.goToStep(this.currentStep + 1);
                AnalyticsTracker.event('booking_step_next', {
                    page_path: window.location.pathname,
                    step: this.currentStep
                });
            };
        }

        this.goToStep(this.currentStep, true);
    },

    goToStep(step, silent = false) {
        const steps = Array.from(document.querySelectorAll('.booking-step'));
        if (!steps.length) return;

        const bounded = Math.max(1, Math.min(this.totalSteps, step));
        this.currentStep = bounded;
        this.maxStepReached = Math.max(this.maxStepReached, bounded);

        steps.forEach((el) => {
            const s = Number(el.dataset.step || '1');
            el.classList.toggle('hidden', s !== bounded);
        });

        const prevBtn = document.getElementById('stepPrev');
        const nextBtn = document.getElementById('stepNext');
        const submitBtn = document.getElementById('submitBtn');
        if (prevBtn) prevBtn.classList.toggle('hidden', bounded === 1);
        if (nextBtn) nextBtn.classList.toggle('hidden', bounded === this.totalSteps);
        if (submitBtn) submitBtn.classList.toggle('hidden', bounded !== this.totalSteps);

        const progress = document.getElementById('bookingStepProgress');
        if (progress) progress.style.width = `${Math.round((bounded / this.totalSteps) * 100)}%`;

        for (let i = 1; i <= this.totalSteps; i++) {
            const pill = document.getElementById(`step-pill-${i}`);
            if (!pill) continue;
            pill.classList.toggle('active', i === bounded);
            pill.disabled = i > this.maxStepReached;
            pill.setAttribute('aria-current', i === bounded ? 'step' : 'false');
            pill.setAttribute('aria-disabled', pill.disabled ? 'true' : 'false');
        }

        const state = document.getElementById('bookingStepState');
        if (state) state.value = String(bounded);
        this.saveDraft();

        if (!silent) {
            AnalyticsTracker.event('booking_step_view', {
                page_path: window.location.pathname,
                step: bounded
            });
        }
    },

    bindIntentCta() {
        const intent = document.getElementById('travelIntent');
        if (!intent) return;
        intent.addEventListener('change', () => {
            this.updateIntentCta();
            AnalyticsTracker.event('booking_intent_selected', {
                page_path: window.location.pathname,
                intent: intent.value
            });
        });
    },

    updateIntentCta() {
        const intentEl = document.getElementById('travelIntent');
        const hintEl = document.getElementById('intentCtaHint');
        const btnText = document.getElementById('btnText');
        if (!intentEl || !hintEl || !btnText) return;

        const isArabic = document.documentElement.lang === 'ar';
        const intent = intentEl.value || 'family';
        const map = isArabic
            ? {
                honeymoon: ['احصل على عرض شهر العسل عبر واتساب', 'تجهيز برنامج رومانسي خاص مع سائق خاص.'],
                family: ['احصل على عرض عائلي عبر واتساب', 'خطة عائلية مريحة مع محطات مناسبة للأطفال.'],
                women_only: ['احصل على عرض للمجموعة النسائية', 'خيار رحلات مناسب للمجموعات النسائية حسب الطلب.'],
                halal: ['احصل على عرض البرنامج الحلال', 'يتضمن خيارات مطاعم حلال ومحطات صلاة.'],
                luxury: ['احصل على عرض الجولة الفاخرة', 'برنامج فاخر مع أولوية خدمة واستقبال مميز.']
            }
            : {
                honeymoon: ['Get Honeymoon Quote on WhatsApp', 'Romantic private itinerary with premium comfort.'],
                family: ['Get Family Quote on WhatsApp', 'Family-optimized route plan with kid-friendly pacing.'],
                women_only: ['Get Women-Only Group Quote', 'Women-friendly journey planning available on request.'],
                halal: ['Get Halal Itinerary Quote', 'Includes halal dining and prayer-stop planning.'],
                luxury: ['Get Luxury Tour Quote', 'Premium private route with priority support and VIP pacing.']
            };

        const fallback = map.family;
        const selected = map[intent] || fallback;
        btnText.innerText = selected[0];
        hintEl.innerText = selected[1];
    },

    getSegmentation() {
        const tags = [];
        const intent = document.getElementById('travelIntent')?.value || 'family';
        if (document.getElementById('segFamily')?.checked) tags.push('family_friendly');
        if (document.getElementById('segWomen')?.checked) tags.push('women_friendly');
        if (document.getElementById('segHalal')?.checked) tags.push('halal_focus');
        if (document.getElementById('segLuxury')?.checked) tags.push('luxury_vehicle');
        return { intent, tags };
    },

    calculateLeadScore(data, segmentation) {
        let score = 35;
        const pax = Number(data.passengers || 0);
        if (pax >= 4) score += 10;
        if ((data.vehicle || '').toLowerCase().includes('minivan')) score += 10;
        if ((data.duration || '').length > 0) score += 10;
        if ((data.notes || '').trim().length >= 30) score += 10;
        if (segmentation.intent === 'honeymoon' || segmentation.intent === 'luxury') score += 10;
        if (segmentation.tags.length >= 2) score += 5;
        return Math.max(0, Math.min(100, score));
    },

    saveDraft() {
        const nameEl = document.getElementById('name');
        if(!nameEl) return;
        
        const data = {
            name: nameEl.value,
            phone: document.getElementById('phone').value,
            passengers: document.getElementById('passengers').value,
            vehicle: document.getElementById('vehicle').value,
            notes: document.getElementById('notes').value,
            travelIntent: document.getElementById('travelIntent')?.value || '',
            segFamily: Boolean(document.getElementById('segFamily')?.checked),
            segWomen: Boolean(document.getElementById('segWomen')?.checked),
            segHalal: Boolean(document.getElementById('segHalal')?.checked),
            segLuxury: Boolean(document.getElementById('segLuxury')?.checked),
            step: this.currentStep,
            maxStepReached: this.maxStepReached
        };
        try { sessionStorage.setItem('booking_draft', JSON.stringify(data)); } catch(e){}
    },

    loadDraft() {
        try {
            const data = JSON.parse(sessionStorage.getItem('booking_draft'));
            if(data) {
                const nameEl = document.getElementById('name');
                if(!nameEl) return;
                
                nameEl.value = data.name || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('passengers').value = data.passengers || '';
                document.getElementById('vehicle').value = data.vehicle || 'Sedan';
                document.getElementById('notes').value = data.notes || '';
                const intent = document.getElementById('travelIntent');
                if (intent && data.travelIntent) intent.value = data.travelIntent;
                if (document.getElementById('segFamily')) document.getElementById('segFamily').checked = Boolean(data.segFamily);
                if (document.getElementById('segWomen')) document.getElementById('segWomen').checked = Boolean(data.segWomen);
                if (document.getElementById('segHalal')) document.getElementById('segHalal').checked = Boolean(data.segHalal);
                if (document.getElementById('segLuxury')) document.getElementById('segLuxury').checked = Boolean(data.segLuxury);
                this.currentStep = Math.max(1, Math.min(this.totalSteps, Number(data.step || 1)));
                this.maxStepReached = Math.max(this.currentStep, Number(data.maxStepReached || this.currentStep));
                this.goToStep(this.currentStep, true);
                this.updateIntentCta();
            }
        } catch(e){}
    },

    updateEstimate() {
        if (!this.fpInstance) return;

        const dates = this.fpInstance.selectedDates;
        const vehEl = document.getElementById('vehicle');
        if(!vehEl) return;
        
        const veh = vehEl.value;
        const display = document.getElementById('price-estimate');
        const priceEl = document.getElementById('total-price-display');
        const durationEl = document.getElementById('trip-duration');
        const helperEl = document.getElementById('dates-helper');
        
        const isArabic = document.documentElement.lang === 'ar';
        const dayLabel = isArabic ? "أيام" : "Days";
        const nightLabel = isArabic ? "ليالي" : "Nights";
        
        if (dates && dates.length === 2 && veh) {
            const d1 = dates[0];
            const d2 = dates[1];
            const days = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
            
            const nights = Math.max(0, days - 1);
            const durationText = `${days} ${dayLabel} / ${nights} ${nightLabel}`;
            
            if(durationEl) durationEl.innerText = durationText;
            
            if(helperEl) {
                helperEl.innerText = `(${days} ${dayLabel})`;
                helperEl.classList.remove('hidden');
            }

            const baseTotal = days * AppConfig.vehicleRates[veh];
            const final = CurrencyManager.convert(baseTotal);
            priceEl.innerText = `${final} ${CurrencyManager.current}`;
            display.classList.remove('hidden');
        } else {
            display.classList.add('hidden');
            if(helperEl) helperEl.classList.add('hidden');
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.validate()) return;

        const honeypot = document.getElementById('companyWebsite');
        if (honeypot && honeypot.value.trim()) {
            return;
        }

        // Basic client-side bot friction before backend checks.
        if (Date.now() - this.startedAt < 2500) {
            UIManager.showToast(document.documentElement.lang === 'ar' ? 'يرجى المحاولة بعد ثانيتين' : 'Please wait a moment before submitting.');
            return;
        }
        
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        document.getElementById('btnSpinner').classList.remove('hidden');
        document.getElementById('btnText').classList.add('opacity-0');

        const dateInput = document.getElementById('dateRange');
        const dates = this.fpInstance ? this.fpInstance.selectedDates : [];
        const dString = this.fpInstance && dates.length === 2
            ? `${this.fpInstance.formatDate(dates[0], "Y-m-d")} to ${this.fpInstance.formatDate(dates[1], "Y-m-d")}`
            : (dateInput?.value?.trim() || "No dates selected");
        
        const priceText = document.getElementById('total-price-display').innerText;
        const durationText = document.getElementById('trip-duration').innerText;
        const serviceEl = document.querySelector('input[name="driver"]:checked').nextElementSibling;
        const serviceText = serviceEl ? serviceEl.innerText.trim() : "";

        const segmentation = this.getSegmentation();
        const data = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            passengers: document.getElementById('passengers').value,
            vehicle: document.getElementById('vehicle').value,
            service: serviceText,
            dates: dString,
            duration: durationText,
            price: priceText,
            notes: document.getElementById('notes').value,
            intent: segmentation.intent
        };
        const leadScoreClient = this.calculateLeadScore(data, segmentation);

        const isArabic = document.documentElement.lang === 'ar';
        const header = isArabic ? "السلام عليكم، أريد الاستفسار عن" : "New Booking Request";

        const text = `${header}:\n👤 ${data.name}\n📱 ${data.phone}\n🎯 Intent: ${data.intent}\n🚗 ${data.vehicle} (${data.passengers} pax)\n📅 ${data.dates} (${data.duration})\n💰 Estimate: ${data.price}\n📝 ${data.notes}`;
        const waUrl = `https://wa.me/995579088537?text=${encodeURIComponent(text)}`;
        document.getElementById('whatsappLink').href = waUrl;
        AnalyticsTracker.event('booking_submit_attempt', { page_path: window.location.pathname, vehicle: data.vehicle, intent: segmentation.intent, lead_score_client: leadScoreClient });

        const endpoint = getBookingEndpoint();
        const payload = {
            ...data,
            sourcePage: window.location.pathname,
            sourceLang: isArabic ? 'ar' : 'en',
            companyWebsite: honeypot ? honeypot.value : '',
            consent: Boolean(document.getElementById('bookingConsent')?.checked),
            attribution: AttributionManager.current(),
            experiment: ExperimentManager.current(),
            segmentation,
            leadScoreClient,
            funnel: {
                currentStep: this.currentStep,
                maxStepReached: this.maxStepReached,
                totalSteps: this.totalSteps,
                completionPercent: Math.round((this.maxStepReached / this.totalSteps) * 100)
            }
        };

        try {
            if (!endpoint) throw new Error('booking_endpoint_missing');
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || 'booking_api_failed');
            }

            AnalyticsTracker.event('booking_submit_success', {
                page_path: window.location.pathname,
                vehicle: data.vehicle,
                intent: segmentation.intent,
                lead_score_client: leadScoreClient,
                variant: (ExperimentManager.current() || {}).bookingFormVariant || 'control'
            });
            this.finishSubmit();
        } catch (apiError) {
            // Fallback to WhatsApp intent so leads are not lost.
            AnalyticsTracker.event('booking_submit_fallback_whatsapp', {
                page_path: window.location.pathname,
                reason: (apiError && apiError.message) || 'unknown'
            });
            this.finishSubmit();
        }
    },

    validate() {
        let valid = true;
        const reqIds = ['name', 'phone', 'passengers'];
        
        reqIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.classList.remove('input-error');
                if (!el.value.trim()) {
                    el.classList.add('input-error');
                    valid = false;
                }
            }
        });
        
        const dateInput = document.getElementById('dateRange');
        if(dateInput && this.fpInstance) {
            dateInput.classList.remove('input-error');
            if (this.fpInstance.selectedDates.length !== 2) {
                 dateInput.classList.add('input-error');
                 const err = document.getElementById('dateError');
                 if(err) err.classList.remove('hidden');
                 valid = false;
            } else {
                const err = document.getElementById('dateError');
                if(err) err.classList.add('hidden');
            }
        } else if (dateInput) {
            dateInput.classList.remove('input-error');
            if (!dateInput.value.trim()) {
                dateInput.classList.add('input-error');
                const err = document.getElementById('dateError');
                if(err) err.classList.remove('hidden');
                valid = false;
            } else {
                const err = document.getElementById('dateError');
                if(err) err.classList.add('hidden');
            }
        }
        
        const phone = document.getElementById('phone');
        if (phone && !/^\+?[\d\s-]{5,}$/.test(phone.value)) {
            phone.classList.add('input-error');
            valid = false;
        }

        const consent = document.getElementById('bookingConsent');
        const consentError = document.getElementById('consentError');
        if (consent) {
            if (!consent.checked) {
                valid = false;
                if (consentError) consentError.classList.remove('hidden');
            } else if (consentError) {
                consentError.classList.add('hidden');
            }
        }

        if(!valid && navigator.vibrate) navigator.vibrate([50, 50, 50]);
        return valid;
    },

    validateStep(step) {
        if (step <= 1) {
            const name = document.getElementById('name');
            const phone = document.getElementById('phone');
            if (!name?.value?.trim() || !phone?.value?.trim()) {
                UIManager.showToast(document.documentElement.lang === 'ar' ? 'يرجى إدخال الاسم ورقم واتساب أولاً' : 'Please add name and WhatsApp first.');
                return false;
            }
            return true;
        }
        if (step === 2) {
            const passengers = document.getElementById('passengers');
            const dateInput = document.getElementById('dateRange');
            const hasDates = this.fpInstance ? this.fpInstance.selectedDates.length === 2 : Boolean(dateInput?.value?.trim());
            if (!passengers?.value?.trim() || !hasDates) {
                UIManager.showToast(document.documentElement.lang === 'ar' ? 'يرجى إدخال الركاب والتواريخ قبل المتابعة' : 'Please complete passengers and dates before continuing.');
                return false;
            }
            return true;
        }
        return true;
    },

    finishSubmit() {
        const btn = document.getElementById('submitBtn');
        btn.disabled = false;
        document.getElementById('btnSpinner').classList.add('hidden');
        document.getElementById('btnText').classList.remove('opacity-0');
        UIManager.openModal('successModal');
        try { sessionStorage.removeItem('booking_draft'); } catch(e){}
    }
};

// --- Library Loader (Performance Optimization) ---
const LibraryLoader = {
    loaded: {},
    load(url, type = 'script') {
        if (this.loaded[url]) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const el = type === 'css' ? document.createElement('link') : document.createElement('script');
            if (type === 'css') { el.rel = 'stylesheet'; el.href = url; }
            else { el.src = url; el.defer = true; }
            
            el.onload = () => { this.loaded[url] = true; resolve(); };
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }
};

// --- Language Manager (For Destination Page) ---
const LangManager = {
    // UPDATED: Check URL param first, default to localStorage
    get current() {
        const path = window.location.pathname;
        
        // 1. Static Pages: File name is the source of truth
        if (path.endsWith('arabic.html') || /-ar\.html$/.test(path)) return 'ar';
        if (path.includes('admin.html')) return 'en'; // Admin is always English
        if (path.includes('index.html') || path === '/' || path.endsWith('/')) return 'en';
        
        // 2. Dynamic Pages (destination.html): Check URL param, then storage
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('lang') || localStorage.getItem('userLang') || 'en';
    },
    
    sync() {
        const current = this.current;
        if (current) {
            localStorage.setItem('userLang', current);
        }
    },
    
    toggle() {
        const current = this.current;
        const isDestPage = window.location.pathname.indexOf('destination.html') !== -1;

        if (isDestPage) {
            // For dynamic destination page, reload with new param
            const newLang = current === 'en' ? 'ar' : 'en';
            localStorage.setItem('userLang', newLang);
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            window.location.href = url.toString();
        } else {
            // For static pages, redirect to the correct file
            const path = window.location.pathname;
            const filename = path.substring(path.lastIndexOf('/') + 1);

            if (current === 'ar') {
                localStorage.setItem('userLang', 'en');
                if (filename === 'arabic.html') window.location.href = 'index.html';
                else if (filename.endsWith('-ar.html')) window.location.href = filename.replace('-ar.html', '.html');
                else window.location.href = 'index.html';
            } else {
                localStorage.setItem('userLang', 'ar');
                if (filename === 'index.html' || filename === '') window.location.href = 'arabic.html';
                else if (filename.endsWith('.html') && !filename.endsWith('-ar.html')) window.location.href = filename.replace('.html', '-ar.html');
                else if (filename.endsWith('-ar.html')) window.location.href = filename; // Already on AR
            }
        }
    },
    
    apply() {
        const lang = this.current;
        const isAr = lang === 'ar';
        document.documentElement.lang = lang;
        document.documentElement.dir = isAr ? 'rtl' : 'ltr';
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if(Translations[lang][key]) el.innerText = Translations[lang][key];
        });
        
        document.querySelectorAll('.lang-text').forEach(el => {
            el.innerText = isAr ? 'English' : 'العربية';
        });
    }
};


// ==========================================
// 4. PAGE SPECIFIC CONTROLLERS
// ==========================================

// --- Main Page Controller (index.html & arabic.html) ---
const MainApp = {
    start() {
        UIManager.init();
        BookingManager.init();
        AttributionManager.capture();
        const bookingVariant = ExperimentManager.assignBookingVariant();
        AnalyticsTracker.event('funnel_landing_view', { page_path: window.location.pathname });
        AnalyticsTracker.event('experiment_assigned', { experiment: 'booking_form_variant', variant: bookingVariant });
        this.normalizeBookingLinks();
        this.initTracking();
        
        // OPTIMIZATION: Lazy Load Booking Libraries (Flatpickr & EmailJS)
        // Only load them when user scrolls near the booking section
        const bookingSection = document.getElementById('booking');
        if (bookingSection) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    // UX IMPROVEMENT: Show loading state on date input
                    const dateInput = document.getElementById('dateRange');
                    if(dateInput) {
                        dateInput.setAttribute('placeholder', 'Loading calendar...');
                        dateInput.disabled = true;
                    }

                    Promise.all([
                        LibraryLoader.load('https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css', 'css'),
                        LibraryLoader.load('https://cdn.jsdelivr.net/npm/flatpickr')
                    ]).then(() => {
                        BookingManager.init();
                    }).catch(() => {
                        BookingManager.init();
                    }).finally(() => {
                        if(dateInput) {
                            const isArabic = document.documentElement.lang === 'ar';
                            dateInput.setAttribute('placeholder', isArabic ? 'اختر تواريخ الاستلام والتسليم' : 'Select Pick-up & Drop-off Dates');
                            dateInput.disabled = false;
                        }
                    });
                    observer.disconnect();
                }
            }, { rootMargin: '300px' }); // Start loading 300px before section is visible
            observer.observe(bookingSection);
        }
        
        this.initSlider();
        this.initAnimations(); 
        
        const preloader = document.getElementById('preloader');
        if(preloader) {
            // OPTIMIZATION: Remove artificial 800ms delay for better LCP score
            preloader.style.opacity = '0';
            setTimeout(() => { preloader.style.display = 'none'; }, 500); // Wait for CSS transition only
        }

        // PROFESSIONALISM FIX: Handle empty links
        document.querySelectorAll('a[href="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const isAr = document.documentElement.lang === 'ar';
                const msg = isAr ? 'هذه الميزة قادمة قريباً!' : 'This feature is coming soon!';
                UIManager.showToast(msg);
            });
        });
    },
    
    initAnimations() {
        const isArabicPage = document.documentElement.lang === 'ar';
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isArabicPage || reduceMotion) {
            document.querySelectorAll('.reveal').forEach(el => el.classList.remove('waiting'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('waiting');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.reveal').forEach(el => {
            if (el.closest('.hero')) {
                el.classList.remove('waiting');
                return;
            }
            el.classList.add('waiting');
            observer.observe(el);
        });
    },

    share() {
        if (navigator.share) {
            navigator.share({ title: 'Georgia Hills', url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            UIManager.showToast(document.documentElement.lang === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!');
        }
    },
    
    acceptCookies() {
        try { localStorage.setItem('cookieConsent', 'true'); } catch(e){}
        if(typeof gtag === 'function') {
            gtag('consent', 'update', { 'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_personalization': 'granted', 'analytics_storage': 'granted' });
        }
        document.getElementById('cookie-banner').classList.remove('active');
    },
    
    declineCookies() {
        try { localStorage.setItem('cookieConsent', 'false'); } catch(e){}
        if(typeof gtag === 'function') {
            gtag('consent', 'update', { 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied', 'analytics_storage': 'denied' });
        }
        document.getElementById('cookie-banner').classList.remove('active');
    },
    
    checkCookies() {
        const consent = localStorage.getItem('cookieConsent');
        const banner = document.getElementById('cookie-banner');
        if (!consent && banner) {
            banner.classList.add('active');
        } else if (consent === 'true' && typeof gtag === 'function') {
            gtag('consent', 'update', { 'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_personalization': 'granted', 'analytics_storage': 'granted' });
        }
    },

    initSlider() {
         const slider = document.getElementById('tours-slider');
         if(!slider) return;

         // Prevent multiple initializations or clean up if re-initializing
         if (slider.dataset.initialized === 'true') {
            // Remove existing clones to reset state
            const clones = slider.querySelectorAll('[aria-hidden="true"]');
            clones.forEach(clone => clone.remove());
            // Clear old listeners if possible (hard without reference), 
            // but since we are just re-cloning, maybe it's fine?
            // Actually, we should be careful about button listeners piling up.
            // Let's assume for now we just reset the clones.
         }
         slider.dataset.initialized = 'true';

         const prevBtns = [document.getElementById('prevBtnDesk'), document.getElementById('prevBtnMob')];
         const nextBtns = [document.getElementById('nextBtnDesk'), document.getElementById('nextBtnMob')];

         // Clear existing listeners to prevent duplicates (requires storing abort controllers or named functions)
         // For simplicity, we'll use cloning to wipe listeners on buttons
         prevBtns.forEach((btn, i) => {
             if(btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                prevBtns[i] = newBtn; // Update reference
             }
         });
         nextBtns.forEach((btn, i) => {
             if(btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                nextBtns[i] = newBtn; // Update reference
             }
         });

         let autoScrollInterval;
         const intervalTime = 3500;
         let isPaused = false;
         
         // Get updated original cards (excluding any clones if we missed them)
         const originalCards = Array.from(slider.children).filter(c => !c.hasAttribute('aria-hidden'));
         if(originalCards.length === 0) return;

         // Append clones for infinite scroll
         originalCards.forEach(card => {
             const clone = card.cloneNode(true);
             clone.setAttribute('aria-hidden', 'true');
             const originalOnClick = card.getAttribute('onclick');
             if (originalOnClick) clone.setAttribute('onclick', originalOnClick);
             slider.appendChild(clone);
         });
         
         originalCards.slice().reverse().forEach(card => {
             const clone = card.cloneNode(true);
             clone.setAttribute('aria-hidden', 'true');
             const originalOnClick = card.getAttribute('onclick');
             if (originalOnClick) clone.setAttribute('onclick', originalOnClick);
             slider.insertBefore(clone, slider.firstChild);
         });

         const getMetrics = () => {
             const style = window.getComputedStyle(slider);
             const gap = parseFloat(style.gap) || 0;
             const itemWidth = originalCards[0].offsetWidth + gap;
             const totalWidth = itemWidth * originalCards.length;
             return { itemWidth, totalWidth };
         };

         const jumpToStart = () => {
             const { totalWidth } = getMetrics();
             slider.scrollLeft = totalWidth; 
         };
         
         setTimeout(() => {
             slider.style.scrollBehavior = 'auto';
             jumpToStart();
             slider.style.scrollBehavior = 'smooth';
         }, 100);

         const moveSlider = (direction) => {
            const { itemWidth } = getMetrics();
            let scrollAmount = direction * itemWidth;
            slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
         };

         const checkScroll = () => {
            const { totalWidth } = getMetrics();
            const tolerance = 10;
            
            if (slider.scrollLeft >= (totalWidth * 2) - tolerance) {
                slider.style.scrollBehavior = 'auto';
                slider.scrollLeft = totalWidth;
                slider.style.scrollBehavior = 'smooth';
            }
            else if (slider.scrollLeft <= tolerance) {
                slider.style.scrollBehavior = 'auto';
                slider.scrollLeft = totalWidth;
                slider.style.scrollBehavior = 'smooth';
            }
         };

         slider.addEventListener('scroll', checkScroll);

         const startAuto = () => {
             clearInterval(autoScrollInterval);
             autoScrollInterval = setInterval(() => {
                 if(!isPaused) moveSlider(1);
             }, intervalTime);
         };
         
         const resetAuto = () => {
             clearInterval(autoScrollInterval);
             startAuto();
         };
         
         nextBtns.forEach(btn => btn?.addEventListener('click', () => { moveSlider(1); resetAuto(); }));
         prevBtns.forEach(btn => btn?.addEventListener('click', () => { moveSlider(-1); resetAuto(); }));
         
         slider.addEventListener('mouseenter', () => isPaused = true);
         slider.addEventListener('touchstart', () => isPaused = true);
         slider.addEventListener('mouseleave', () => isPaused = false);
         slider.addEventListener('touchend', () => isPaused = false);
         
         window.addEventListener('resize', () => {
            slider.style.scrollBehavior = 'auto';
            jumpToStart();
            setTimeout(() => { slider.style.scrollBehavior = 'smooth'; }, 50);
         });
         
         startAuto();
    },
    
    prefillVehicle(type) {
        const sel = document.getElementById('vehicle');
        if(sel) {
            sel.value = type;
            BookingManager.updateEstimate();
            const bookingSec = document.getElementById('booking');
            if(bookingSec) bookingSec.scrollIntoView({ behavior: 'smooth' });
        }
    },

    normalizeBookingLinks() {
        const isArabic = document.documentElement.lang === 'ar';
        const bookingTarget = isArabic ? 'booking-ar.html' : 'booking.html';
        const isHome = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('arabic.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
        if (isHome) return;

        document.querySelectorAll('a[href="#booking"], a[href="index.html#booking"], a[href="arabic.html#booking"]').forEach((link) => {
            link.setAttribute('href', bookingTarget);
        });
    },

    initTracking() {
        const attr = AttributionManager.current();
        if (attr && (attr.utm_source || attr.utm_campaign)) {
            AnalyticsTracker.event('traffic_attribution', {
                page_path: window.location.pathname,
                utm_source: attr.utm_source || '(none)',
                utm_medium: attr.utm_medium || '(none)',
                utm_campaign: attr.utm_campaign || '(none)'
            });
        }

        document.querySelectorAll('a.btn-book-nav, a.mobile-btn-book, .btn-submit').forEach((el) => {
            el.addEventListener('click', () => {
                AnalyticsTracker.event('cta_click', {
                    page_path: window.location.pathname,
                    cta_text: (el.textContent || '').trim().slice(0, 60)
                });
            });
        });

        ['name', 'phone', 'passengers', 'dateRange'].forEach((id) => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('blur', () => {
                AnalyticsTracker.event('booking_field_blur', { page_path: window.location.pathname, field: id });
            });
        });
    }
};

// --- Destination Page Controller (destination.html) ---
const DestinationApp = {
    async init() {
        LangManager.apply();
        UIManager.init();

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id') || 'tbilisi';
        
        let data = normalizeDestinationShape(id, window.DestData[id] || {}); // Fallback to local data

        // FETCH FROM FIREBASE
        if (db) {
            try {
                const docSnap = await db.collection('destinations').doc(id).get();
                if (docSnap.exists) {
                    data = normalizeDestinationShape(id, docSnap.data());
                }
            } catch(e) { console.log("Using offline data"); }
        }

        const lang = LangManager.current;

        // 0. Fix Navigation Links for Arabic
        if (lang === 'ar') {
            document.querySelectorAll('a[href^="index.html"]').forEach(link => {
                link.href = link.href.replace('index.html', 'arabic.html');
            });
        }

        if(data) {
            const title = data[`title_${lang}`];
            document.title = title + " - Georgia Hills";
            
            // 1. Dynamic Meta Description & Open Graph
            const desc = data[`desc_${lang}`];
            const metaDesc = document.querySelector('meta[name="description"]');
            if(metaDesc) metaDesc.content = desc.substring(0, 160) + "...";

            const setMeta = (prop, val) => {
                let el = document.querySelector(`meta[property="${prop}"]`);
                if(!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
                el.content = val;
            };
            setMeta('og:title', title);
            setMeta('og:description', desc.substring(0, 200));
            setMeta('og:image', data.img.startsWith('http') ? data.img : `https://georgiahills.com/${data.img}`);

            // 2. Clean Canonical URL (Remove tracking params)
            const canonicalLink = document.querySelector('link[rel="canonical"]');
            if(canonicalLink) {
                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.set('id', id);
                if(lang !== 'en') url.searchParams.set('lang', lang);
                canonicalLink.href = url.toString();
            }

            // 2. Dynamic Schema.org Injection (NEW OPTIMIZATION)
            const scriptJSON = document.getElementById('json-ld-data');
            if(scriptJSON) {
                const schema = {
                    "@context": "https://schema.org",
                    "@type": "TouristAttraction",
                    "name": title,
                    "description": data[`desc_${lang}`],
                    "image": data.img.startsWith('http') ? data.img : `https://georgiahills.com/${data.img}`,
                    "url": window.location.href,
                    "address": {
                        "@type": "PostalAddress",
                        "addressCountry": "GE"
                    }
                };
                scriptJSON.textContent = JSON.stringify(schema);
            }

            // Image Error Handling
            const heroImg = document.getElementById('hero-img');
            if(heroImg) {
                heroImg.alt = title; // Accessibility Fix
                // FIX: Set handlers before src to catch cached loads
                heroImg.onload = function() { this.classList.remove('skeleton'); };
                heroImg.onerror = function() { this.src = 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=80'; }; // Fallback
                document.getElementById('hero-bg').style.backgroundImage = 'url(' + (data.img.startsWith('http') ? data.img : data.img) + ')'; heroImg.src = data.img;
            }
            
            const crumbTitle = document.getElementById('crumb-title'); const crumbCurrent = document.getElementById('crumb-current'); if(crumbCurrent) crumbCurrent.innerText = title;
            if(crumbTitle) {
                crumbTitle.innerText = title;
                crumbTitle.classList.remove('skeleton');
            }
            
            const pageTitle = document.getElementById('page-title');
            if(pageTitle) {
                pageTitle.innerText = title;
                pageTitle.classList.remove('skeleton');
            }
            
            const pageDesc = document.getElementById('page-desc');
            if(pageDesc) {
                pageDesc.innerText = data[`desc_${lang}`];
                pageDesc.classList.remove('skeleton');
            }
            
            const highlightsEl = document.getElementById('highlights');
            if(highlightsEl) {
                const highlightsList = data[`highlights_${lang}`] || [];
                highlightsEl.innerHTML = '';
                highlightsList.forEach((h) => {
                    const li = document.createElement('li');
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-star';
                    li.appendChild(icon);
                    li.appendChild(document.createTextNode(` ${h}`));
                    highlightsEl.appendChild(li);
                });
            }

            const mapLink = document.getElementById('map-link');
            if(mapLink) {
                mapLink.href = data.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.title_en)}`;
                mapLink.rel = "noopener noreferrer";
            }

            const galleryEl = document.getElementById('gallery');
            if(galleryEl) {
                galleryEl.innerHTML = '';
                (data.gallery || []).forEach((url) => {
                    const safeUrl = sanitizeImageUrl(url);
                    if (!safeUrl) return;
                    const img = document.createElement('img');
                    img.src = safeUrl;
                    img.className = 'gallery-img skeleton';
                    img.loading = 'lazy';
                    img.addEventListener('load', () => img.classList.remove('skeleton'));
                    img.addEventListener('error', () => { img.style.display = 'none'; });
                    galleryEl.appendChild(img);
                });
            }

            const idx = DestKeys.indexOf(id);
            const nextId = DestKeys[(idx + 1) % DestKeys.length];
            const nextData = normalizeDestinationShape(nextId, window.DestData[nextId] || {});
            
            const nextLink = document.getElementById('next-link');
            // Update next link to preserve language choice in URL
            if(nextLink) nextLink.href = `destination.html?id=${nextId}${lang === 'ar' ? '&lang=ar' : ''}`;
            
            const nextImg = document.getElementById('next-img');
            if(nextImg) {
                nextImg.onload = function() { this.classList.remove('skeleton'); };
                nextImg.src = nextData.img;
            }
            
            const nextTitle = document.getElementById('next-title');
            if(nextTitle) nextTitle.innerText = nextData[`title_${lang}`];
        }
    }
};

// --- Destination Loader ---
const DestinationLoader = {
    async load() {
        const slider = document.getElementById('tours-slider');
        if (!slider) return;

        try {
            const db = firebase.firestore();
            // Fetch all destinations (client-side filtering for legacy support)
            const snapshot = await db.collection('destinations').get();
            
            if (snapshot.empty) {
                console.warn("No destinations found in Firestore.");
                return; 
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                // Skip inactive
                if (data.active === false) return;

                const id = doc.id;
                const lang = document.documentElement.lang || 'en';
                const isAr = lang === 'ar';
                
                const title = isAr ? (data.title_ar || data.title_en) : data.title_en;
                const desc = isAr ? (data.desc_ar || data.desc_en) : data.desc_en;
                // Prefer explicit slug or route handling if available, else link to dynamic page
                // Note: The static site has tbilisi.html etc. We might want to link there if ID matches?
                // But for new destinations, we rely on destination.html?id=...
                const link = `destination.html?id=${id}`; 

                html += `
                <a href="${link}" class="tour-card group">
                    <img src="${data.thumbnail || 'https://placehold.co/600x800'}" width="380" height="475" loading="lazy" decoding="async" class="tour-img" alt="${title}">
                    <div class="tour-overlay"></div>
                    <div class="tour-content">
                        <h3 class="tour-title">${title}</h3>
                        <p class="tour-desc">${desc || ''}</p>
                        <span class="tour-btn text-accent-light">Drive Here <i class="fa-solid fa-arrow-right rtl:rotate-180"></i></span>
                    </div>
                </a>`;
            });
            
            slider.innerHTML = html;
            
            // Re-init slider logic because we replaced DOM elements
            if(window.GHCoreUI && window.GHCoreUI.initSlider) {
                // Reset initialized flag to force re-bind
                slider.dataset.initialized = 'false';
                window.GHCoreUI.initSlider();
            }
        } catch (e) {
            console.error("Failed to load destinations", e);
        }
    }
};

// --- Blog Manager (Dynamic) ---
const BlogManager = {
    async init() {
        const container = document.getElementById('blog-grid');
        if (!container) return;

        // Check if we are in static mode or firebase mode
        if (!db) {
            console.warn("Firebase not initialized, cannot load dynamic blogs.");
            return;
        }

        try {
            const snapshot = await db.collection('articles').orderBy('date', 'desc').get();
            if (snapshot.empty) return;

            container.innerHTML = ''; // Clear static placeholders if any
            const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
            const isAr = lang === 'ar';

            snapshot.forEach(doc => {
                const data = doc.data();
                const title = isAr ? (data.title?.ar || data.title?.en) : data.title?.en;
                const excerpt = isAr ? (data.excerpt?.ar || data.excerpt?.en) : data.excerpt?.en;
                // We link to a generic article viewer or just use the ID
                // For now, let's assume we might have a generic article.html?id=... 
                // or we just link to the static ones if they match specific IDs.
                // To make this "Top Tier", you should create an article.html that reads ?id=
                const link = `article.html?id=${doc.id}`; 

                const html = `
                    <article class="blog-card reveal">
                        <div class="blog-img-container">
                            <img src="${data.image || 'https://placehold.co/600x400'}" alt="${title}" loading="lazy">
                        </div>
                        <div class="blog-content">
                            <div class="blog-date"><i class="fa-regular fa-calendar"></i> ${data.date}</div>
                            <h3 class="blog-title">${title}</h3>
                            <p class="blog-excerpt">${excerpt}</p>
                            <a href="${link}" class="blog-link">${isAr ? 'اقرأ المزيد' : 'Read More'} <i class="fa-solid ${isAr ? 'fa-arrow-left' : 'fa-arrow-right'}"></i></a>
                        </div>
                    </article>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });
        } catch (e) {
            console.error("Error loading blogs:", e);
        }
    }
};

// ==========================================
// 5. GLOBAL EXPORTS
// ==========================================

const previousGHCoreUI = window.GHCoreUI || {};
const previousGHBooking = window.GHBooking || {};
const previousGHLocalization = window.GHLocalization || {};
const previousGHDestination = window.GHDestination || {};

window.GHCoreUI = {
    ...previousGHCoreUI,
    init: () => {
        if (typeof previousGHCoreUI.init === "function") previousGHCoreUI.init();
        UIManager.init();
    },
    closeModal: (modalId) => UIManager.closeModal(modalId),
    toggleCurrencyDropdown: (type) => UIManager.toggleCurrencyDropdown(type),
    initSlider: () => MainApp.initSlider(),
    prefillVehicle: (type) => MainApp.prefillVehicle(type)
};

window.GHBooking = {
    ...previousGHBooking,
    init: () => {
        if (typeof previousGHBooking.init === "function") previousGHBooking.init();
        BookingManager.init();
    },
    updateEstimate: () => BookingManager.updateEstimate(),
    handleSubmit: (event) => BookingManager.handleSubmit(event)
};

window.GHLocalization = {
    ...previousGHLocalization,
    init: () => {
        if (typeof previousGHLocalization.init === "function") previousGHLocalization.init();
        LangManager.apply();
    },
    sync: () => LangManager.sync()
};

window.GHDestination = {
    ...previousGHDestination,
    init: () => {
        if (typeof previousGHDestination.init === "function") previousGHDestination.init();
        DestinationApp.init();
    },
    refreshSlider: () => DestinationLoader.load()
};

window.addEventListener('DOMContentLoaded', () => {
    // Sync language state with current page
    LangManager.sync();
    AttributionManager.capture();
    ExperimentManager.assignBookingVariant();

    // Ensure Cookie Banner runs on all pages (except Admin)
    if (!window.location.pathname.includes('admin.html')) {
        MainApp.checkCookies();
    }
    
    // Detect which page we are on and run the appropriate logic
    
    // Condition 1: Main Page (has 'tours-slider' or 'hero' or 'dest-hero')
    if (document.getElementById('tours-slider') || document.querySelector('.hero') || document.querySelector('.about-premium-hero') || document.querySelector('.dest-hero')) {
        MainApp.start();
        // Load dynamic destinations if slider exists
        if(document.getElementById('tours-slider')) DestinationLoader.load();
    } 
    // Condition 2: Dynamic Destination Page (ONLY destination.html)
    else if (window.location.pathname.includes('destination.html')) {
        DestinationApp.init();
    }
    // Condition 3: Blog Page
    else if (window.location.pathname.includes('blog')) {
        UIManager.init();
        BlogManager.init();
    }
    // Condition 3: Static Pages (tbilisi.html, honeymoon.html, etc.)
    else {
        UIManager.init();
        // Ensure animations run if present
        if (document.querySelector('.reveal')) {
            MainApp.initAnimations();
        }
    }
});
