
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- Configuration ---
// Note: We use the existing config from your window object or fallback
const firebaseConfig = window.__GH_FIREBASE_CONFIG || window.firebaseConfig || {
    // You must ensure these are correct in your firebase-config.js
    apiKey: "AIzaSyApLm0zacQiM1VbSQ5INRlQ28ev3QoTw2o",
    authDomain: "georgiahills-15d19.firebaseapp.com",
    projectId: "georgiahills-15d19",
    storageBucket: "georgiahills-15d19.firebasestorage.app",
    messagingSenderId: "447700508040",
    appId: "1:447700508040:web:379c32079d09523a14ae3d",
    measurementId: "G-PTEM4FPQR1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- State Management ---
const State = {
    currentUser: null,
    currentTab: 'dashboard',
    destinations: [],
    settings: {}, // Global settings like prices
    home: {},
    contact: {},
    navbar: {}
};

// --- UI Rendering ---
const UI = {
    showLogin() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
                <div class="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-blue-500">Georgia Hills</h1>
                        <p class="text-gray-400">Admin Control Panel</p>
                    </div>
                    <form id="loginForm" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium mb-2">Email</label>
                            <input type="email" id="email" class="w-full bg-gray-700 border border-gray-600 rounded p-3 focus:outline-none focus:border-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Password</label>
                            <input type="password" id="password" class="w-full bg-gray-700 border border-gray-600 rounded p-3 focus:outline-none focus:border-blue-500" required>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition">
                            Login
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (error) {
                alert("Login Failed: " + error.message);
            }
        });
    },

    renderLayout() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex bg-gray-100">
                <!-- Sidebar -->
                <aside class="w-64 bg-gray-900 text-white flex flex-col">
                    <div class="p-6 text-center border-b border-gray-800">
                        <h2 class="text-xl font-bold">Admin Panel</h2>
                        <p class="text-xs text-gray-400 mt-1">Georgia Hills</p>
                    </div>
                    <nav class="flex-1 p-4 space-y-2">
                        <button onclick="window.Admin.switchTab('dashboard')" class="w-full text-left px-4 py-3 rounded hover:bg-gray-800 flex items-center gap-3 ${State.currentTab === 'dashboard' ? 'bg-blue-900 text-blue-200' : ''}">
                            <span>📊</span> Dashboard
                        </button>
                        <button onclick="window.Admin.switchTab('destinations')" class="w-full text-left px-4 py-3 rounded hover:bg-gray-800 flex items-center gap-3 ${State.currentTab === 'destinations' ? 'bg-blue-900 text-blue-200' : ''}">
                            <span>📍</span> Destinations
                        </button>
                        <button onclick="window.Admin.switchTab('home')" class="w-full text-left px-4 py-3 rounded hover:bg-gray-800 flex items-center gap-3 ${State.currentTab === 'home' ? 'bg-blue-900 text-blue-200' : ''}">
                            <span>🏠</span> Home Page
                        </button>
                        <button onclick="window.Admin.switchTab('contact')" class="w-full text-left px-4 py-3 rounded hover:bg-gray-800 flex items-center gap-3 ${State.currentTab === 'contact' ? 'bg-blue-900 text-blue-200' : ''}">
                            <span>📞</span> Contact Info
                        </button>
                        <button onclick="window.Admin.switchTab('navbar')" class="w-full text-left px-4 py-3 rounded hover:bg-gray-800 flex items-center gap-3 ${State.currentTab === 'navbar' ? 'bg-blue-900 text-blue-200' : ''}">
                            <span>🧭</span> Navbar
                        </button>
                        <button onclick="window.Admin.switchTab('settings')" class="w-full text-left px-4 py-3 rounded hover:bg-gray-800 flex items-center gap-3 ${State.currentTab === 'settings' ? 'bg-blue-900 text-blue-200' : ''}">
                            <span>⚙️</span> Price Settings
                        </button>
                    </nav>
                    <div class="p-4 border-t border-gray-800">
                        <button onclick="window.Admin.logout()" class="w-full text-left px-4 py-2 hover:bg-red-900 rounded text-red-400">
                            Sign Out
                        </button>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="flex-1 overflow-y-auto">
                    <header class="bg-white shadow p-4 flex justify-between items-center">
                        <h1 class="text-xl font-bold text-gray-800 capitalize" id="page-title">${State.currentTab}</h1>
                        <a href="/" target="_blank" class="text-blue-600 hover:underline">View Website &rarr;</a>
                    </header>
                    <div id="content-area" class="p-8">
                        <!-- Dynamic Content loads here -->
                        <div class="animate-pulse flex space-x-4">
                            <div class="flex-1 space-y-4 py-1">
                                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div class="space-y-2">
                                <div class="h-4 bg-gray-200 rounded"></div>
                                <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            
            <!-- Modal Container -->
            <div id="modal-container" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"></div>
        `;
        this.loadTab(State.currentTab);
    },

    async loadTab(tab) {
        State.currentTab = tab;
        const container = document.getElementById('content-area');
        const title = document.getElementById('page-title');
        if(title) title.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);

        if (tab === 'dashboard') {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                        <h3 class="text-gray-500 uppercase text-xs font-bold mb-2">Total Destinations</h3>
                        <p class="text-3xl font-bold">${State.destinations.length}</p>
                    </div>
                    <div class="bg-white p-6 rounded shadow border-l-4 border-green-500">
                        <h3 class="text-gray-500 uppercase text-xs font-bold mb-2">System Status</h3>
                        <p class="text-3xl font-bold text-green-500">Active</p>
                    </div>
                </div>
            `;
        } else if (tab === 'destinations') {
            await Data.fetchDestinations();
            container.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <p class="text-gray-600">Manage your tour destinations here.</p>
                    <div class="space-x-2">
                        <button onclick="window.Admin.updateDatabaseFromCode()" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow text-sm">
                            <i class="fa-solid fa-sync"></i> Import Defaults
                        </button>
                        <button onclick="window.Admin.openDestinationModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow">
                            + Add New Destination
                        </button>
                    </div>
                </div>
                
                <div class="bg-white rounded shadow overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${State.destinations.map(dest => {
                                const esc = (s) => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
                                return `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <img src="${esc(dest.thumbnail) || 'https://via.placeholder.com/50'}" class="h-10 w-10 rounded object-cover bg-gray-200">
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${esc(dest.title?.en) || 'Untitled'}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${esc(dest.id)}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onclick="window.Admin.openDestinationModal('${esc(dest.id)}')" class="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                        <button onclick="window.Admin.deleteDestination('${esc(dest.id)}')" class="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (tab === 'home') {
            await Data.fetchHomeSettings();
            const h = State.home || {};
            const hero = h.hero || {};
            const about = h.about || {};
            
            container.innerHTML = `
                <div class="bg-white rounded shadow p-6 max-w-4xl">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2">Home Page Content</h3>
                    <form onsubmit="window.Admin.saveHomeSettings(event)" class="space-y-6">
                        
                        <!-- Hero Section -->
                        <div class="bg-blue-50 p-4 rounded border border-blue-100">
                            <h4 class="font-bold text-blue-800 mb-3">Hero Section</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium mb-1">Hero Background Image</label>
                                    <div class="flex gap-2">
                                        <input type="text" id="hero-bg" value="${hero.bg_image || ''}" class="flex-1 border p-2 rounded text-sm">
                                        <input type="file" id="upload-hero" class="hidden" onchange="window.Admin.handleUpload({inputId:'upload-hero', targetId:'hero-bg', path:'hero'})">
                                        <button type="button" onclick="document.getElementById('upload-hero').click()" class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm font-medium">Upload</button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium">Title (English)</label>
                                    <input type="text" id="hero-title-en" value="${hero.title_en || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div dir="rtl">
                                    <label class="block text-sm font-medium">العنوان الرئيسي</label>
                                    <input type="text" id="hero-title-ar" value="${hero.title_ar || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium">Subtitle (English)</label>
                                    <input type="text" id="hero-sub-en" value="${hero.subtitle_en || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div dir="rtl">
                                    <label class="block text-sm font-medium">العنوان الفرعي</label>
                                    <input type="text" id="hero-sub-ar" value="${hero.subtitle_ar || ''}" class="w-full border p-2 rounded">
                                </div>
                            </div>
                        </div>

                        <!-- About Section -->
                        <div class="bg-yellow-50 p-4 rounded border border-yellow-100">
                            <h4 class="font-bold text-yellow-800 mb-3">About Us Section</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium mb-1">About Image</label>
                                    <div class="flex gap-2">
                                        <input type="text" id="about-img" value="${about.image || ''}" class="flex-1 border p-2 rounded text-sm">
                                        <input type="file" id="upload-about" class="hidden" onchange="window.Admin.handleUpload({inputId:'upload-about', targetId:'about-img', path:'about'})">
                                        <button type="button" onclick="document.getElementById('upload-about').click()" class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm font-medium">Upload</button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium">Title (English)</label>
                                    <input type="text" id="about-title-en" value="${about.title_en || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div dir="rtl">
                                    <label class="block text-sm font-medium">العنوان</label>
                                    <input type="text" id="about-title-ar" value="${about.title_ar || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium">Description (English)</label>
                                    <textarea id="about-text-en" rows="3" class="w-full border p-2 rounded">${about.text_en || ''}</textarea>
                                </div>
                                <div class="col-span-2" dir="rtl">
                                    <label class="block text-sm font-medium">الوصف</label>
                                    <textarea id="about-text-ar" rows="3" class="w-full border p-2 rounded">${about.text_ar || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <div class="pt-4 border-t text-right">
                            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold">Save Home Page</button>
                        </div>
                    </form>
                </div>
            `;
        } else if (tab === 'contact') {
            await Data.fetchContactSettings();
            const c = State.contact || {};
            const social = c.social || {};
            
            container.innerHTML = `
                <div class="bg-white rounded shadow p-6 max-w-2xl">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2">Contact Information</h3>
                    <form onsubmit="window.Admin.saveContactSettings(event)" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Phone Number (Call)</label>
                                <input type="text" id="contact-phone" value="${c.phone || ''}" class="w-full border rounded p-2" placeholder="+995 555 123 456">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">WhatsApp Number</label>
                                <input type="text" id="contact-whatsapp" value="${c.whatsapp || ''}" class="w-full border rounded p-2" placeholder="995555123456 (No +)">
                            </div>
                            <div class="col-span-2">
                                <label class="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                                <input type="email" id="contact-email" value="${c.email || ''}" class="w-full border rounded p-2">
                            </div>
                            
                            <div class="col-span-2 border-t pt-4 mt-2">
                                <h4 class="font-bold text-gray-500 text-xs uppercase mb-2">Social Media Links</h4>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Instagram URL</label>
                                <input type="text" id="social-insta" value="${social.instagram || ''}" class="w-full border rounded p-2">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Facebook URL</label>
                                <input type="text" id="social-fb" value="${social.facebook || ''}" class="w-full border rounded p-2">
                            </div>
                        </div>
                        
                        <div class="pt-4 border-t mt-4 text-right">
                            <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold">Save Contact Info</button>
                        </div>
                    </form>
                </div>
            `;
        } else if (tab === 'navbar') {
            await Data.fetchNavbarSettings();
            const n = State.navbar || {};
            const en = n.en || {};
            const ar = n.ar || {};
            const links = n.links || {};

            container.innerHTML = `
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div class="bg-white rounded shadow p-6">
                        <h3 class="text-lg font-bold mb-4 border-b pb-2">Navbar Labels (EN)</h3>
                        <div class="space-y-3">
                            <input id="nav-en-home" class="w-full border rounded p-2" placeholder="Home" value="${en.home || 'Home'}">
                            <input id="nav-en-about" class="w-full border rounded p-2" placeholder="About" value="${en.about || 'About'}">
                            <input id="nav-en-services" class="w-full border rounded p-2" placeholder="Services" value="${en.services || 'Services'}">
                            <input id="nav-en-guide" class="w-full border rounded p-2" placeholder="Guide" value="${en.guide || 'Guide'}">
                            <input id="nav-en-blog" class="w-full border rounded p-2" placeholder="Blog" value="${en.blog || 'Blog'}">
                            <input id="nav-en-contact" class="w-full border rounded p-2" placeholder="Contact" value="${en.contact || 'Contact'}">
                            <input id="nav-en-book" class="w-full border rounded p-2" placeholder="Book Now" value="${en.book || 'Book Now'}">
                            <input id="nav-logo-text" class="w-full border rounded p-2" placeholder="Logo Text" value="${n.logoText || 'Georgia Hills'}">
                        </div>
                    </div>

                    <div class="bg-white rounded shadow p-6" dir="rtl">
                        <h3 class="text-lg font-bold mb-4 border-b pb-2">تسميات الشريط (AR)</h3>
                        <div class="space-y-3">
                            <input id="nav-ar-home" class="w-full border rounded p-2" placeholder="الرئيسية" value="${ar.home || 'الرئيسية'}">
                            <input id="nav-ar-about" class="w-full border rounded p-2" placeholder="من نحن" value="${ar.about || 'من نحن'}">
                            <input id="nav-ar-services" class="w-full border rounded p-2" placeholder="الخدمات" value="${ar.services || 'الخدمات'}">
                            <input id="nav-ar-guide" class="w-full border rounded p-2" placeholder="الدليل" value="${ar.guide || 'الدليل'}">
                            <input id="nav-ar-blog" class="w-full border rounded p-2" placeholder="المدونة" value="${ar.blog || 'المدونة'}">
                            <input id="nav-ar-contact" class="w-full border rounded p-2" placeholder="اتصل بنا" value="${ar.contact || 'اتصل بنا'}">
                            <input id="nav-ar-book" class="w-full border rounded p-2" placeholder="احجز الآن" value="${ar.book || 'احجز الآن'}">
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded shadow p-6 mt-6">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2">Navbar Links</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="block text-sm mb-1">Home URL</label><input id="nav-link-home" class="w-full border rounded p-2" value="${links.home || 'index.html'}"></div>
                        <div><label class="block text-sm mb-1">About URL</label><input id="nav-link-about" class="w-full border rounded p-2" value="${links.about || 'about.html'}"></div>
                        <div><label class="block text-sm mb-1">Services URL</label><input id="nav-link-services" class="w-full border rounded p-2" value="${links.services || 'services.html'}"></div>
                        <div><label class="block text-sm mb-1">Guide URL</label><input id="nav-link-guide" class="w-full border rounded p-2" value="${links.guide || 'guide.html'}"></div>
                        <div><label class="block text-sm mb-1">Blog URL</label><input id="nav-link-blog" class="w-full border rounded p-2" value="${links.blog || 'blog.html'}"></div>
                        <div><label class="block text-sm mb-1">Contact URL</label><input id="nav-link-contact" class="w-full border rounded p-2" value="${links.contact || 'contact.html'}"></div>
                        <div><label class="block text-sm mb-1">Booking URL</label><input id="nav-link-booking" class="w-full border rounded p-2" value="${links.booking || 'booking.html'}"></div>
                        <div><label class="block text-sm mb-1">Arabic Home URL</label><input id="nav-link-home-ar" class="w-full border rounded p-2" value="${links.home_ar || 'arabic.html'}"></div>
                    </div>
                    <div class="pt-4 border-t mt-6 text-right">
                        <button type="button" onclick="window.Admin.saveNavbarSettings(event)" class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-bold">Save Navbar</button>
                    </div>
                </div>
            `;
        } else if (tab === 'settings') {
            await Data.fetchSettings();

            
            // Default Structure if empty
            const prices = State.settings.prices || { sedan: 150, minivan: 250 };
            
            container.innerHTML = `
                <div class="bg-white rounded shadow p-6 max-w-2xl">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2">Vehicle Prices</h3>
                    <form onsubmit="window.Admin.saveSettings(event)" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Sedan Price (GEL)</label>
                                <input type="number" name="price_sedan" value="${prices.sedan}" class="w-full border rounded p-2">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Minivan Price (GEL)</label>
                                <input type="number" name="price_minivan" value="${prices.minivan}" class="w-full border rounded p-2">
                            </div>
                        </div>
                        
                        <div class="pt-4 border-t mt-4 text-right">
                            <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;
        }
    },

    openDestinationModal(id = null) {
        const isEdit = !!id;
        const dest = isEdit ? State.destinations.find(d => d.id === id) : {
            id: '',
            title: {en: '', ar: ''},
            desc: {en: '', ar: ''}
        };

        const modal = document.getElementById('modal-container');
        modal.classList.remove('hidden');
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 class="text-lg font-bold">${isEdit ? 'Edit Destination' : 'Add New Destination'}</h3>
                    <button onclick="document.getElementById('modal-container').classList.add('hidden')" class="text-gray-500 hover:text-gray-700">&times;</button>
                </div>
                
                <div class="p-6 overflow-y-auto flex-1">
                    <form id="destForm" class="space-y-6">
                        <div class="grid grid-cols-2 gap-6">
                            <!-- Basic Info -->
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Unique ID (URL Slug)</label>
                                <input type="text" id="dest-id" value="${dest.id}" ${isEdit ? 'disabled' : ''} 
                                    class="w-full border p-2 rounded bg-gray-50 text-gray-600" placeholder="e.g. batumi">
                                <p class="text-xs text-gray-400 mt-1">This will be used in the URL.</p>
                            </div>

                            <!-- English Content -->
                            <div class="space-y-4 border p-4 rounded bg-blue-50">
                                <h4 class="font-bold text-blue-800">🇬🇧 English Content</h4>
                                <div>
                                    <label class="block text-sm font-medium">Title</label>
                                    <input type="text" id="title-en" value="${dest.title?.en || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium">Description</label>
                                    <textarea id="desc-en" rows="4" class="w-full border p-2 rounded">${dest.desc?.en || ''}</textarea>
                                </div>
                            </div>

                            <!-- Arabic Content -->
                            <div class="space-y-4 border p-4 rounded bg-green-50" dir="rtl">
                                <h4 class="font-bold text-green-800">🇸🇦 Arabic Content</h4>
                                <div>
                                    <label class="block text-sm font-medium">العنوان</label>
                                    <input type="text" id="title-ar" value="${dest.title?.ar || ''}" class="w-full border p-2 rounded">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium">الوصف</label>
                                    <textarea id="desc-ar" rows="4" class="w-full border p-2 rounded">${dest.desc?.ar || ''}</textarea>
                                </div>
                            </div>
                            
                            <!-- Images -->
                            <div class="col-span-2 border p-4 rounded">
                                <h4 class="font-bold mb-2">Primary Image URL</h4>
                                <div class="flex gap-2">
                                    <input type="text" id="dest-img" value="${dest.thumbnail || ''}" class="flex-1 border p-2 rounded mb-2" placeholder="https://...">
                                    <input type="file" id="upload-dest-main" class="hidden" onchange="window.Admin.handleUpload({inputId:'upload-dest-main', targetId:'dest-img', path:'destinations'})">
                                    <button type="button" onclick="document.getElementById('upload-dest-main').click()" class="h-fit bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm font-medium">Upload</button>
                                </div>

                                <h4 class="font-bold mb-2 mt-4">Google Map URL (Optional)</h4>
                                <input type="text" id="dest-map" value="${dest.mapUrl || ''}" class="w-full border p-2 rounded" placeholder="https://maps.google.com/...">
                                
                                <h4 class="font-bold mb-2 mt-4">Gallery Images (One URL per line)</h4>
                                <textarea id="dest-gallery" rows="4" class="w-full border p-2 rounded">${(dest.gallery || []).join('\n')}</textarea>
                            </div>

                            <!-- Highlights -->
                            <div class="col-span-2 grid grid-cols-2 gap-4 border p-4 rounded">
                                <div>
                                    <h4 class="font-bold mb-2">Highlights (English - One per line)</h4>
                                    <textarea id="high-en" rows="5" class="w-full border p-2 rounded">${(dest.highlights?.en || []).join('\n')}</textarea>
                                </div>
                                <div dir="rtl">
                                    <h4 class="font-bold mb-2">أبرز المعالم (عربي - سطر لكل معلم)</h4>
                                    <textarea id="high-ar" rows="5" class="w-full border p-2 rounded">${(dest.highlights?.ar || []).join('\n')}</textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onclick="document.getElementById('modal-container').classList.add('hidden')" class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                    <button onclick="window.Admin.saveDestination('${isEdit ? 'edit' : 'create'}')" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Destination</button>
                </div>
            </div>
        `;
    }
};

// --- Data Operations ---
const Data = {
    async fetchDestinations() {
        const querySnapshot = await getDocs(collection(db, "destinations"));
        State.destinations = [];
        querySnapshot.forEach((doc) => {
            State.destinations.push({ id: doc.id, ...doc.data() });
        });
        return State.destinations;
    },

    async fetchSettings() {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            State.settings = docSnap.data();
        } else {
            State.settings = {};
        }
    },

    async fetchHomeSettings() {
        const docRef = doc(db, "settings", "home");
        const docSnap = await getDoc(docRef);
        State.home = docSnap.exists() ? docSnap.data() : {};
    },

    async fetchContactSettings() {
        const docRef = doc(db, "settings", "contact");
        const docSnap = await getDoc(docRef);
        State.contact = docSnap.exists() ? docSnap.data() : {};
    },

    async fetchNavbarSettings() {
        const docRef = doc(db, "settings", "navbar");
        const docSnap = await getDoc(docRef);
        State.navbar = docSnap.exists() ? docSnap.data() : {};
    },

    async updateDatabaseFromCode() {
        if(!confirm("This will overwrite existing destinations in the database with the default ones from the code. Are you sure?")) return;
        
        try {
            const defaults = window.DestData;
            if (!defaults) return alert("No default data found.");

            const batch = []; // For simplicity, waiting for batched writes implementation or just parallel
            
            for (const [key, val] of Object.entries(defaults)) {
                const docRef = doc(db, "destinations", key);
                const data = {
                    title: { en: val.title_en, ar: val.title_ar },
                    desc: { en: val.desc_en, ar: val.desc_ar },
                    thumbnail: val.img,
                    gallery: val.gallery || [],
                    highlights: { en: val.highlights_en || [], ar: val.highlights_ar || [] },
                    mapUrl: val.map_url || ''
                };
                await setDoc(docRef, data, { merge: true });
            }
            alert("Database synchronized with default code values!");
            UI.loadTab('destinations');
        } catch(e) {
            alert("Sync Failed: " + e.message);
        }
    },

    async saveDestination(mode) {
        const id = document.getElementById('dest-id').value;
        if (!id) return alert("ID is required");
        if (id.includes('/') || id.includes('..')) return alert("Invalid ID format");

        const data = {
            title: {
                en: document.getElementById('title-en').value,
                ar: document.getElementById('title-ar').value
            },
            desc: {
                en: document.getElementById('desc-en').value,
                ar: document.getElementById('desc-ar').value
            },
            thumbnail: document.getElementById('dest-img').value,
            mapUrl: document.getElementById('dest-map').value,
            gallery: document.getElementById('dest-gallery').value.split('\n').filter(s => s.trim()),
            highlights: {
                en: document.getElementById('high-en').value.split('\n').filter(s => s.trim()),
                ar: document.getElementById('high-ar').value.split('\n').filter(s => s.trim())
            }
        };

        try {
            await setDoc(doc(db, "destinations", id), data, { merge: true });
            document.getElementById('modal-container').classList.add('hidden');
            UI.loadTab('destinations'); // Refresh
        } catch (e) {
            console.error(e);
            alert("Error saving: " + e.message);
        }
    },

    async deleteDestination(id) {
        if (id && (id.includes('/') || id.includes('..'))) return alert("Invalid ID format");
        if(!confirm("Are you sure? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "destinations", id));
            UI.loadTab('destinations');
        } catch(e) {
            alert(e.message);
        }
    },
    
    async saveSettings(e) {
        e.preventDefault();
        const prices = {
            sedan: Number(document.querySelector('input[name="price_sedan"]').value),
            minivan: Number(document.querySelector('input[name="price_minivan"]').value)
        };
        
        try {
            await setDoc(doc(db, "settings", "global"), { prices }, { merge: true });
            alert("Settings Saved!");
        } catch(e) {
            alert(e.message);
        }
    },

    async saveHomeSettings(e) {
        e.preventDefault();
        const data = {
            hero: {
                title_en: document.getElementById('hero-title-en').value,
                title_ar: document.getElementById('hero-title-ar').value,
                subtitle_en: document.getElementById('hero-sub-en').value,
                subtitle_ar: document.getElementById('hero-sub-ar').value,
                bg_image: document.getElementById('hero-bg').value
            },
            about: {
                title_en: document.getElementById('about-title-en').value,
                title_ar: document.getElementById('about-title-ar').value,
                text_en: document.getElementById('about-text-en').value,
                text_ar: document.getElementById('about-text-ar').value,
                image: document.getElementById('about-img').value
            }
        };
        try {
            await setDoc(doc(db, "settings", "home"), data, { merge: true });
            alert("Home Page Settings Saved!");
        } catch(e) { alert(e.message); }
    },

    async saveContactSettings(e) {
        e.preventDefault();
        const data = {
            phone: document.getElementById('contact-phone').value,
            whatsapp: document.getElementById('contact-whatsapp').value,
            email: document.getElementById('contact-email').value,
            social: {
                instagram: document.getElementById('social-insta').value,
                facebook: document.getElementById('social-fb').value
            }
        };
        try {
            await setDoc(doc(db, "settings", "contact"), data, { merge: true });
            alert("Contact Info Saved!");
        } catch(e) { alert(e.message); }
    },

    async saveNavbarSettings(e) {
        if (e && e.preventDefault) e.preventDefault();
        const data = {
            logoText: document.getElementById('nav-logo-text')?.value || 'Georgia Hills',
            en: {
                home: document.getElementById('nav-en-home')?.value || 'Home',
                about: document.getElementById('nav-en-about')?.value || 'About',
                services: document.getElementById('nav-en-services')?.value || 'Services',
                guide: document.getElementById('nav-en-guide')?.value || 'Guide',
                blog: document.getElementById('nav-en-blog')?.value || 'Blog',
                contact: document.getElementById('nav-en-contact')?.value || 'Contact',
                book: document.getElementById('nav-en-book')?.value || 'Book Now'
            },
            ar: {
                home: document.getElementById('nav-ar-home')?.value || 'الرئيسية',
                about: document.getElementById('nav-ar-about')?.value || 'من نحن',
                services: document.getElementById('nav-ar-services')?.value || 'الخدمات',
                guide: document.getElementById('nav-ar-guide')?.value || 'الدليل',
                blog: document.getElementById('nav-ar-blog')?.value || 'المدونة',
                contact: document.getElementById('nav-ar-contact')?.value || 'اتصل بنا',
                book: document.getElementById('nav-ar-book')?.value || 'احجز الآن'
            },
            links: {
                home: document.getElementById('nav-link-home')?.value || 'index.html',
                about: document.getElementById('nav-link-about')?.value || 'about.html',
                services: document.getElementById('nav-link-services')?.value || 'services.html',
                guide: document.getElementById('nav-link-guide')?.value || 'guide.html',
                blog: document.getElementById('nav-link-blog')?.value || 'blog.html',
                contact: document.getElementById('nav-link-contact')?.value || 'contact.html',
                booking: document.getElementById('nav-link-booking')?.value || 'booking.html',
                home_ar: document.getElementById('nav-link-home-ar')?.value || 'arabic.html'
            }
        };

        try {
            await setDoc(doc(db, "settings", "navbar"), data, { merge: true });
            alert("Navbar settings saved!");
        } catch (e2) {
            alert(e2.message);
        }
    },

    async uploadImage(file, path = 'uploads') {
         if (!file) return null;
         const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
         await uploadBytes(storageRef, file);
         return await getDownloadURL(storageRef);
    }
};

// --- Operations Exposed to Window (for HTML events) ---
window.Admin = {
    switchTab: (tab) => UI.loadTab(tab),
    logout: () => signOut(auth),
    openDestinationModal: UI.openDestinationModal,
    saveDestination: Data.saveDestination,
    deleteDestination: Data.deleteDestination,
    saveSettings: Data.saveSettings,
    saveHomeSettings: Data.saveHomeSettings,
    saveContactSettings: Data.saveContactSettings,
    saveNavbarSettings: Data.saveNavbarSettings,
    updateDatabaseFromCode: Data.updateDatabaseFromCode,
    handleUpload: async (inputParams) => {
        // Generic handler for upload buttons
        const { inputId, targetId, path } = inputParams;
        const file = document.getElementById(inputId).files[0];
        if(!file) return alert("Select a file first");
        
        try {
            const btn = document.getElementById(inputId).nextElementSibling;
            const originalText = btn.innerText;
            btn.innerText = "Uploading...";
            btn.disabled = true;
            
            const url = await Data.uploadImage(file, path);
            document.getElementById(targetId).value = url;
            
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Upload Successful!");
        } catch(e) {
            console.error(e);
            alert("Upload Failed: " + e.message);
        }
    }
};

// --- Init ---
onAuthStateChanged(auth, (user) => {
    State.currentUser = user;
    if (user) {
        UI.renderLayout();
    } else {
        UI.showLogin();
    }
});
