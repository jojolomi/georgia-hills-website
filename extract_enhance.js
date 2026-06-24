const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:/Users/LEGION/.gemini/antigravity-cli/brain/1052c78f-40a3-48f0-b4af-a48604037715/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (line.includes('enhance_hero_css.js')) {
             try {
                 const obj = JSON.parse(line);
                 if (obj.tool_calls) {
                     for (const tc of obj.tool_calls) {
                         if (tc.name === 'write_to_file' && tc.args.TargetFile.includes('enhance_hero_css.js')) {
                             fs.writeFileSync('Y:/Website/best/extracted_enhance.js', tc.args.CodeContent);
                             console.log('Extracted enhance_hero_css.js');
                             return;
                         }
                     }
                 }
             } catch(e) {}
        }
    }
    console.log('Finished searching.');
}

extract();
