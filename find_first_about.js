const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:/Users/LEGION/.gemini/antigravity-cli/brain/1052c78f-40a3-48f0-b4af-a48604037715/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        if (line.includes('about.html')) {
             try {
                 const obj = JSON.parse(line);
                 // If the agent read or wrote about.html
                 if (obj.tool_calls) {
                     for (const tc of obj.tool_calls) {
                         if (tc.name === 'write_to_file' && tc.args.TargetFile.includes('about.html')) {
                             fs.writeFileSync(`Y:/Website/best/about_history_${count}.html`, tc.args.CodeContent);
                             console.log(`Saved about_history_${count}.html`);
                             count++;
                         }
                         if (tc.name === 'replace_file_content' && tc.args.TargetFile.includes('about.html')) {
                             console.log(`Replaced content in about.html at step ${obj.step_index}`);
                         }
                     }
                 }
                 if (obj.output && obj.output.includes('<title>')) {
                     fs.writeFileSync(`Y:/Website/best/about_output_${count}.html`, obj.output);
                     console.log(`Saved about_output_${count}.html from step ${obj.step_index}`);
                     count++;
                 }
             } catch(e) {}
             
             if (count >= 5) break; // Only get the first 5
        }
    }
    console.log('Finished searching.');
}

extract();
