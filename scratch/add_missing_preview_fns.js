const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const missingFns = `
    window.previewTorneoPDF = async (id) => {
        const url = await window.exportConvocatoria(id, 'preview');
        if (url) window.previewDocument(url, 'Ficha de Torneo');
    };
`;

let updated = content;
if (!content.includes('window.previewTorneoPDF =')) {
    // Add it before exportConvocatoria
    updated = updated.replace('window.exportConvocatoria = async (id, mode = \'download\') => {', missingFns + '\n    window.exportConvocatoria = async (id, mode = \'download\') => {');
}

fs.writeFileSync('app.js', updated);
console.log('Success');
