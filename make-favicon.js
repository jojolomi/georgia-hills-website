const sharp = require('sharp');
const fs = require('fs');

async function makeFavicon() {
    console.log("Generating favicon.png...");
    let buf = fs.readFileSync('logo-256.webp');
    await sharp(buf).png({quality: 80, compressionLevel: 9}).toFile('favicon.png');
    console.log("Done.");
}

makeFavicon().catch(err => console.error(err));
