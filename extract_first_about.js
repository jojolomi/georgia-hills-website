const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:/Users/LEGION/.gemini/antigravity-cli/brain/1052c78f-40a3-48f0-b4af-a48604037715/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let foundAboutHtml = false;

    for await (const line of rl) {
        if (line.includes('"File Path": "`file:///Y:/Website/best/about.html`"')) {
            // This is likely inside the text output of a view_file command
            foundAboutHtml = true;
        }
        
        // Alternatively, let's just use regex to find any block of HTML that looks like the about page
        if (line.includes('<title>About Us | Georgia Hills</title>')) {
             try {
                 const obj = JSON.parse(line);
                 if (obj.content && obj.content.includes('<title>About Us | Georgia Hills</title>')) {
                      fs.writeFileSync('Y:/Website/best/extracted_about_content.html', obj.content);
                      console.log('Extracted from content field');
                      return;
                 }
                 if (obj.output && obj.output.includes('<title>About Us | Georgia Hills</title>')) {
                      fs.writeFileSync('Y:/Website/best/extracted_about_output.html', obj.output);
                      console.log('Extracted from output field');
                      return;
                 }
             } catch(e) {}
        }
    }
    console.log('Finished searching.');
}

extract();
