const fs = require('fs');
const cheerio = require('cheerio');

const regions = [
    { file: 'qa/index.html', title: 'السفر من قطر إلى جورجيا', desc: 'نقدم خطط سياحية مخصصة للمسافرين من قطر مع دعم عربي كامل وخيارات عائلية فاخرة.' },
    { file: 'ae/index.html', title: 'السفر من الإمارات إلى جورجيا', desc: 'برامج خاصة للمسافرين من الإمارات إلى جورجيا مع سائق خاص وخطط عائلية مريحة.' },
    { file: 'sa/index.html', title: 'السفر من السعودية إلى جورجيا', desc: 'عروض سياحية مميزة للمسافرين من السعودية مع خيارات حلال ومرونة تامة.' },
    { file: 'kw/index.html', title: 'السفر من الكويت إلى جورجيا', desc: 'خطط سفر فاخرة ومناسبة للعوائل من الكويت إلى أجمل مناطق جورجيا.' },
    { file: 'eg/index.html', title: 'السفر من مصر إلى جورجيا', desc: 'برامج ورحلات مخصصة للمسافرين من مصر لقضاء أجمل الأوقات في جورجيا.' }
];

const arTemplateContent = fs.readFileSync('itineraries-hub-ar.html', 'utf8');
const $arTmpl = cheerio.load(arTemplateContent);
const arMainHtml = $arTmpl('main').html();
const arHeroHtml = $arTmpl.html($arTmpl('.itinerary-hero'));
let arStyleHtml = $arTmpl('style').html();

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

function buildRegional(region) {
    let targetContent;
    try {
        targetContent = fs.readFileSync(region.file, 'utf8');
    } catch(e) {
        console.log(`Could not read ${region.file}, skipping.`);
        return;
    }
    
    const $ = cheerio.load(targetContent);
    
    // Fix minified css/js links (since they are in a subfolder, use ../)
    $('link[href="../style.css"]').attr('href', '../style.min.css?v=16');
    $('link[href="../style.min.css?v=16"]').attr('href', '../style.min.css?v=16');
    $('script[src="../script.js"]').attr('src', '../script.min.js');
    $('script[src="../shared-navbar.js"]').attr('src', '../shared-navbar.min.js');

    if ($('style').length > 0) {
        $('style').html(arStyleHtml + backBtnCss);
    } else {
        $('head').append(`<style>${arStyleHtml + backBtnCss}</style>`);
    }

    $('main').html(arMainHtml);
    $('.itinerary-hero').remove();
    if (arHeroHtml) {
        $('main').before(arHeroHtml);
    }
    
    $('.itinerary-hero-title').text(region.title);
    $('.itinerary-hero-subtitle').text(region.desc);

    // Ensure paths inside main point correctly (like images)
    $('img').each(function() {
        const src = $(this).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('../')) {
            $(this).attr('src', '../' + src);
        }
    });

    $('img, source').each(function() {
        const srcset = $(this).attr('srcset');
        if (srcset) {
            const newSrcset = srcset.split(',').map(s => {
                const parts = s.trim().split(' ');
                let url = parts[0];
                if (url && !url.startsWith('http') && !url.startsWith('../')) {
                    url = '../' + url;
                }
                parts[0] = url;
                return parts.join(' ');
            }).join(', ');
            $(this).attr('srcset', newSrcset);
        }
    });

    $('a').each(function() {
        const href = $(this).attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('../')) {
            if (!href.startsWith('mailto:') && !href.startsWith('tel:')) {
                $(this).attr('href', '../' + href);
            }
        }
    });

    // Add back button inside hero
    if ($('.itinerary-hero').length > 0) {
        if ($('.mobile-back-btn').length === 0) {
            $('.itinerary-hero').prepend(`<a href="../arabic.html" class="mobile-back-btn"><i class="fas fa-arrow-right"></i> رجوع</a>`);
        } else {
            $('.mobile-back-btn').attr('href', '../arabic.html');
        }
    }

    // Ensure body has the dark/secondary classes so it matches the theme
    $('body').attr('class', 'secondary-page page-about');

    fs.writeFileSync(region.file, $.html());
    console.log(`Updated ${region.file}`);
}

for (const region of regions) {
    buildRegional(region);
}
