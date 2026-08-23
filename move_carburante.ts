import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const carburanteRegex = /(                        \{\/\* 6\. Carta Carburante \*\/\}\n                        <div\n                          onClick=\{\(\) => setSettingsSubTab\('fuel_card'\)\}\n[\s\S]*?<\/div>\n                        <\/div>\n)/;
const match = content.match(carburanteRegex);

if (match) {
    const carburanteBlock = match[0];
    content = content.replace(carburanteRegex, '');
    
    // Insert into Gestione Risorse, before Scadenziere di Bordo
    const scadenziereTarget = /(                        \{\/\* Scadenziere di Bordo \*\/\})/;
    content = content.replace(scadenziereTarget, carburanteBlock + '\n$1');
    
    fs.writeFileSync('src/App.tsx', content);
    console.log('Moved Carta Carburante block');
} else {
    console.log('Carta Carburante block not found');
}
