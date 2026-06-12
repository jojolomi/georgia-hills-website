(function () {
  const STORAGE_KEY = 'gh_admin_destinations';

  const AdminApp = {
    destinations: {},

    init() {
      this.destinations = this.loadDestinations();
      this.bindEvents();
      this.populateSelect();
      this.tryAutoLogin();
    },

    bindEvents() {
      const email = document.getElementById('admin-email');
      const pass = document.getElementById('admin-pass');
      if (pass) {
        pass.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.login();
        });
      }
      if (email) {
        email.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.login();
        });
      }
    },

    loadDestinations() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {}

      if (typeof DestData !== 'undefined' && DestData) {
        return JSON.parse(JSON.stringify(DestData));
      }
      return {};
    },

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.destinations));
      } catch (e) {}
    },

    showMessage(msg, isError = false) {
      const toast = document.getElementById('network-toast');
      if (!toast) return;
      toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation text-error' : 'fa-check-circle text-success'}"></i> <span>${msg}</span>`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    },

    tryAutoLogin() {
      if (typeof auth !== 'undefined' && auth && auth.currentUser) {
        this.unlockUI();
      }
    },

    async login() {
      const email = document.getElementById('admin-email')?.value.trim() || '';
      const pass = document.getElementById('admin-pass')?.value || '';
      const err = document.getElementById('login-error');
      if (err) err.textContent = '';

      if (!email || !pass) {
        if (err) err.textContent = 'Enter email and password.';
        return;
      }

      if (!(typeof auth !== 'undefined' && auth && auth.signInWithEmailAndPassword)) {
        if (err) err.textContent = 'Admin auth is disabled. Configure Firebase credentials first.';
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(email, pass);
        this.unlockUI();
        this.showMessage('Logged in successfully.');
      } catch (e) {
        if (err) err.textContent = 'Login failed. Check credentials.';
      }
    },

    unlockUI() {
      const ids = ['admin-sidebar', 'admin-top-bar', 'main-content'];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === 'admin-sidebar' ? 'block' : 'flex';
      });

      const main = document.getElementById('main-content');
      if (main) main.style.display = 'block';

      const overlay = document.getElementById('login-overlay');
      if (overlay) overlay.style.display = 'none';
    },

    switchTab(tab) {
      const contentTab = document.getElementById('tab-content');
      const deployTab = document.getElementById('tab-deploy');
      const title = document.getElementById('page-title');

      if (!contentTab || !deployTab || !title) return;

      const items = document.querySelectorAll('.admin-nav-item');
      items.forEach((el) => el.classList.remove('active'));

      if (tab === 'deploy') {
        contentTab.classList.add('hidden');
        deployTab.classList.remove('hidden');
        title.textContent = 'Build & Deploy';
        if (items[1]) items[1].classList.add('active');
      } else {
        deployTab.classList.add('hidden');
        contentTab.classList.remove('hidden');
        title.textContent = 'Content Manager';
        if (items[0]) items[0].classList.add('active');
      }
    },

    populateSelect() {
      const select = document.getElementById('destSelect');
      if (!select) return;

      const previous = select.value;
      select.innerHTML = '<option value="">-- Select a Destination to Edit --</option>';

      Object.keys(this.destinations).sort().forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        const title = this.destinations[key]?.title_en || key;
        opt.textContent = `${title} (${key})`;
        select.appendChild(opt);
      });

      if (previous && this.destinations[previous]) {
        select.value = previous;
      }
    },

    loadDestData() {
      const select = document.getElementById('destSelect');
      const editor = document.getElementById('editor');
      if (!select || !editor) return;

      const id = select.value;
      if (!id || !this.destinations[id]) {
        editor.classList.add('hidden');
        return;
      }

      const d = this.destinations[id];
      this.setValue('cfgId', id);
      this.setValue('cfgImg', d.img || '');
      this.setValue('cfgTitleEn', d.title_en || '');
      this.setValue('cfgTitleAr', d.title_ar || '');
      this.setValue('cfgDescEn', d.desc_en || '');
      this.setValue('cfgDescAr', d.desc_ar || '');
      this.setValue('cfgGallery', Array.isArray(d.gallery) ? d.gallery.join('\n') : '');
      this.setValue('cfgHighEn', Array.isArray(d.highlights_en) ? d.highlights_en.join('\n') : '');
      this.setValue('cfgHighAr', Array.isArray(d.highlights_ar) ? d.highlights_ar.join('\n') : '');

      editor.classList.remove('hidden');
    },

    setValue(id, value) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    },

    getLines(id) {
      const raw = document.getElementById(id)?.value || '';
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    },

    collectFromForm() {
      const id = (document.getElementById('cfgId')?.value || '').trim();
      if (!id) return null;

      return {
        id,
        data: {
          img: (document.getElementById('cfgImg')?.value || '').trim(),
          title_en: (document.getElementById('cfgTitleEn')?.value || '').trim(),
          title_ar: (document.getElementById('cfgTitleAr')?.value || '').trim(),
          desc_en: (document.getElementById('cfgDescEn')?.value || '').trim(),
          desc_ar: (document.getElementById('cfgDescAr')?.value || '').trim(),
          gallery: this.getLines('cfgGallery'),
          highlights_en: this.getLines('cfgHighEn'),
          highlights_ar: this.getLines('cfgHighAr')
        }
      };
    },

    addNewDest() {
      const key = prompt('Enter new destination key (example: gudauri):', '');
      if (!key) return;

      const id = key.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!id) return;
      if (this.destinations[id]) {
        this.showMessage('Destination key already exists.', true);
        return;
      }

      this.destinations[id] = {
        img: '',
        gallery: [],
        highlights_en: [],
        highlights_ar: [],
        title_en: id,
        title_ar: id,
        desc_en: '',
        desc_ar: ''
      };

      this.persist();
      this.populateSelect();
      const select = document.getElementById('destSelect');
      if (select) {
        select.value = id;
        this.loadDestData();
      }
      this.showMessage('Destination created. Fill details and save.');
    },

    deleteDest() {
      const id = document.getElementById('cfgId')?.value;
      if (!id || !this.destinations[id]) return;
      if (!confirm(`Delete destination "${id}"?`)) return;

      delete this.destinations[id];
      this.persist();
      this.populateSelect();
      const editor = document.getElementById('editor');
      if (editor) editor.classList.add('hidden');
      this.showMessage('Destination deleted.');
    },

    async saveToDatabase() {
      const payload = this.collectFromForm();
      if (!payload) {
        this.showMessage('Select a destination first.', true);
        return;
      }

      this.destinations[payload.id] = payload.data;
      this.persist();

      if (typeof db !== 'undefined' && db) {
        try {
          await db.collection('destinations').doc(payload.id).set(payload.data, { merge: true });
          this.showMessage('Saved to Firestore and local backup.');
          return;
        } catch (e) {
          this.showMessage('Saved locally, but Firestore save failed.', true);
          return;
        }
      }

      this.showMessage('Saved locally (static mode).');
    },

    downloadScript() {
      fetch('script.js', { cache: 'no-cache' })
        .then((r) => r.text())
        .then((text) => {
          if (typeof saveAs !== 'undefined') {
            saveAs(new Blob([text], { type: 'application/javascript;charset=utf-8' }), 'script.js');
          } else {
            this.downloadBlob('script.js', text, 'application/javascript;charset=utf-8');
          }
          this.showMessage('script.js downloaded.');
        })
        .catch(() => this.showMessage('Could not download script.js', true));
    },

    downloadAllPages() {
      if (typeof JSZip === 'undefined') {
        this.showMessage('Zip library not loaded.', true);
        return;
      }

      const zip = new JSZip();
      const files = [
        'index.html', 'arabic.html', 'destination.html', 'contact.html', 'contact-ar.html',
        'blog.html', 'blog-ar.html', 'honeymoon.html', 'honeymoon-ar.html', 'tbilisi.html', 'tbilisi-ar.html',
        'kazbegi.html', 'kazbegi-ar.html', 'martvili.html', 'martvili-ar.html',
        'signagi.html', 'signagi-ar.html', 'batumi.html', 'batumi-ar.html',
        'legal.html', 'script.js', 'style.css', 'manifest.json', 'service-worker.js', 'robots.txt', 'sitemap.xml'
      ];

      const jobs = files.map((file) =>
        fetch(file, { cache: 'no-cache' })
          .then((r) => {
            if (!r.ok) throw new Error(file);
            return r.text();
          })
          .then((text) => zip.file(file, text))
          .catch(() => null)
      );

      Promise.all(jobs)
        .then(() => zip.generateAsync({ type: 'blob' }))
        .then((blob) => {
          if (typeof saveAs !== 'undefined') saveAs(blob, 'georgiahills-site.zip');
          else this.downloadBlob('georgiahills-site.zip', blob, 'application/zip', true);
          this.showMessage('ZIP generated successfully.');
        })
        .catch(() => this.showMessage('Failed to generate ZIP.', true));
    },

    downloadBlob(filename, content, type, rawBlob = false) {
      const blob = rawBlob ? content : new Blob([content], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    }
  };

  window.AdminApp = AdminApp;
  document.addEventListener('DOMContentLoaded', () => AdminApp.init());
})();
