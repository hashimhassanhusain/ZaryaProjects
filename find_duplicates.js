const fs = require('fs');
const content = fs.readFileSync('src/context/LanguageContext.tsx', 'utf8');

const enMatch = content.match(/en: \{([\s\S]*?)\n {2}\},/);
const arMatch = content.match(/ar: \{([\s\S]*?)\n {2}\},/);

function findDuplicates(text, section) {
    const lines = text.split('\n');
    const keys = {};
    lines.forEach((line, index) => {
        const match = line.match(/^\s*'([^']+)':/);
        if (match) {
            const key = match[1];
            if (keys[key]) {
                console.log(`Duplicate key in ${section}: "${key}" at line index ${index} (previous at line index ${keys[key].index})`);
            } else {
                keys[key] = { index };
            }
        }
    });
}

if (enMatch) findDuplicates(enMatch[1], 'EN');
if (arMatch) findDuplicates(arMatch[1], 'AR');
