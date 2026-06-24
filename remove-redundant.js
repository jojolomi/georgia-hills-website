const fs = require('fs');
const cheerio = require('cheerio');

function removeSections(file) {
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });
    
    let removed = false;
    
    // Remove the packages section entirely
    const packagesSec = $('#packages');
    if (packagesSec.length > 0) {
        packagesSec.remove();
        removed = true;
    }
    
    // Remove the guide section entirely
    const guideSec = $('#guide');
    if (guideSec.length > 0) {
        guideSec.remove();
        removed = true;
    }
    
    if (removed) {
        // To avoid cheerio messing up whitespace, we can also just use regex if cheerio breaks formatting.
        // But cheerio with { decodeEntities: false } is usually okay for these files.
        // Let's actually use string replacement to be 100% safe with formatting.
        let rawHtml = fs.readFileSync(file, 'utf8');
        
        // Match from <section id="packages"> up to </section> before the next section
        // Non-greedy match
        rawHtml = rawHtml.replace(/<!-- SERVICES PREVIEW -->\s*<section id="packages"[\s\S]*?<\/section>/, '');
        rawHtml = rawHtml.replace(/<!-- Guide Section -->\s*<section id="guide"[\s\S]*?<\/section>/, '');
        
        fs.writeFileSync(file, rawHtml, 'utf8');
        console.log('Removed redundant sections from', file);
    }
}

removeSections('index.html');
removeSections('arabic.html');
