const fs = require('fs');
const pngToIco = require('png-to-ico');

pngToIco('favicon.png')
  .then(buf => {
    fs.writeFileSync('favicon.ico', buf);
    console.log('favicon.ico created successfully (1KB).');
  })
  .catch(console.error);
