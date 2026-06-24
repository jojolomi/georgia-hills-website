const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:/Users/LEGION/.gemini/antigravity-cli/brain/1052c78f-40a3-48f0-b4af-a48604037715/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let linesToPrint = 0;
    let found = false;

    for await (const line of rl) {
        if (line.includes('File Path: `file:///Y:/Website/best/about.html`')) {
             found = true;
             console.log("FOUND IT! Extracting...");
             // Extract the string output
             try {
                 const obj = JSON.parse(line);
                 if (obj.output) {
                     fs.writeFileSync('Y:/Website/best/original_about.txt', obj.output);
                     console.log("Saved original about to original_about.txt");
                     return;
                 }
             } catch(e) {}
        }
    }
    console.log('Finished searching.');
}

extract();
