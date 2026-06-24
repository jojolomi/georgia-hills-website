const sharp = require('sharp');
const fs = require('fs');

async function optimize() {
    console.log("Hyper-optimizing images for PageSpeed...");

    // martvili.webp (Target ~30KB)
    let buf = fs.readFileSync('martvili.webp');
    await sharp(buf).resize({width: 600, height: 400, fit: 'cover'}).webp({quality: 15, effort: 6}).toFile('martvili-opt.webp');

    // image-1024.avif (Target ~38KB)
    buf = fs.readFileSync('image-1024.avif');
    await sharp(buf).avif({quality: 20, effort: 6}).toFile('image-1024-opt.avif');

    // tbilisi-old-town-1024.webp (Target ~32KB)
    buf = fs.readFileSync('tbilisi-old-town-1024.webp');
    await sharp(buf).resize({width: 665, height: 444, fit: 'cover'}).webp({quality: 15, effort: 6}).toFile('tbilisi-old-town-1024-opt.webp');

    console.log("Done.");
}

optimize().catch(err => console.error(err));
