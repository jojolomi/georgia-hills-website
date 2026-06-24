const fs = require('fs');
const cheerio = require('cheerio');

const hubs = [
    { file: 'destinations-hub', title: 'Georgia Destinations', desc: 'Explore top destinations in Georgia.', arTitle: 'وجهات جورجيا', arDesc: 'أهم الوجهات السياحية في جورجيا' },
    { file: 'family-travel-hub', title: 'Family Travel', desc: 'Georgia for families and kids.', arTitle: 'سفر العائلات', arDesc: 'دليل السفر العائلي في جورجيا' },
    { file: 'halal-travel-hub', title: 'Halal Travel', desc: 'Halal-friendly options in Georgia.', arTitle: 'السفر الحلال', arDesc: 'دليل السفر الحلال في جورجيا' },
    { file: 'safety-hub', title: 'Safety Hub', desc: 'Safety guidelines for traveling in Georgia.', arTitle: 'دليل الأمان', arDesc: 'إرشادات الأمان للمسافرين في جورجيا' },
    { file: 'itineraries-hub', title: 'Georgia Itineraries', desc: 'Discover carefully crafted itineraries for your perfect Georgia trip.', arTitle: 'برامج جورجيا السياحية', arDesc: 'اكتشف برامج سياحية مصممة بعناية لرحلتك المثالية في جورجيا.'}
];

// Read the templates
const enTemplateContent = fs.readFileSync('itineraries-hub-backup.html', 'utf8');
const arTemplateContent = fs.readFileSync('itineraries-hub-ar.html', 'utf8'); // We assume itineraries-hub-ar was also created and has the layout

const $enTmpl = cheerio.load(enTemplateContent);
const $arTmpl = cheerio.load(arTemplateContent);

const enMainHtml = $enTmpl('main').html();
const arMainHtml = $arTmpl('main').html();

const enStyleHtml = $enTmpl('style').html();
const arStyleHtml = $arTmpl('style').html();

// Add back button CSS to styles
const backBtnCss = `
    .mobile-back-btn { display: none; }
    @media (max-width: 768px) {
      .mobile-back-btn {
        display: inline-flex; align-items: center; gap: 0.5rem;
        position: absolute; top: 1.5rem; z-index: 100;
        color: white; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
        padding: 0.5rem 1rem; border-radius: 2rem; text-decoration: none; font-size: 0.9rem;
      }
      html[dir="ltr"] .mobile-back-btn { left: 1rem; }
      html[dir="rtl"] .mobile-back-btn { right: 1rem; }
    }
`;

function buildHub(hub, isAr) {
    const fileName = isAr ? `${hub.file}-ar.html` : `${hub.file}.html`;
    const title = isAr ? hub.arTitle : hub.title;
    const desc = isAr ? hub.arDesc : hub.desc;
    
    // Read the target file to preserve its <head> and JSON-LD
    let targetContent;
    try {
        targetContent = fs.readFileSync(fileName, 'utf8');
    } catch(e) {
        console.log(`Could not read ${fileName}, skipping.`);
        return;
    }
    
    const $ = cheerio.load(targetContent);
    
    // Replace <style>
    if ($('style').length > 0) {
        $('style').html((isAr ? arStyleHtml : enStyleHtml) + backBtnCss);
    } else {
        $('head').append(`<style>${(isAr ? arStyleHtml : enStyleHtml) + backBtnCss}</style>`);
    }

    // Replace <main>
    $('main').html(isAr ? arMainHtml : enMainHtml);
    
    // Update Hero Title and Subtitle
    $('.itinerary-hero-title').text(title);
    $('.itinerary-hero-subtitle').text(desc);

    // Add back button inside hero
    if ($('.itinerary-hero').length > 0) {
        if ($('.mobile-back-btn').length === 0) {
            const backLink = isAr ? 'arabic.html' : 'index.html';
            const backText = isAr ? 'رجوع' : 'Back';
            const icon = isAr ? 'fa-arrow-right' : 'fa-arrow-left';
            $('.itinerary-hero').prepend(`<a href="${backLink}" class="mobile-back-btn"><i class="fas ${icon}"></i> ${backText}</a>`);
        }
    }

    fs.writeFileSync(fileName, $.html());
    console.log(`Updated ${fileName}`);
}

for (const hub of hubs) {
    buildHub(hub, false);
    buildHub(hub, true);
}
