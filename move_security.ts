import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const securityBlockRegex = /(                        \{\/\* Sicurezza Attiva & Sosta Notturna \*\/\}\n                        <div\n                          onClick=\{\(\) => setSettingsSubTab\('camper_security'\)\}\n[\s\S]*?<\/div>\n                        <\/div>\n)/;
const match = content.match(securityBlockRegex);

if (match) {
    const securityBlock = match[0];
    content = content.replace(securityBlockRegex, '');
    
    // Insert under Category 3: Life on board
    content = content.replace(/(<div className="divide-y divide-slate-100">\n                        \{\/\* 9. Soste & Aree Preferite \*\/\})/, securityBlock + '\n                        {/* 9. Soste & Aree Preferite */}');
    
    fs.writeFileSync('src/App.tsx', content);
    console.log('Moved security block');
} else {
    console.log('Security block not found');
}
