const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

let updated = content;

// Fix 1: Cleaning report name in the input field
const oldInput = `id="report-name" value="\${existingReport ? (existingReport.nombre || '') : 'Asistencia ' + selectedDate}"`;
const newInput = `id="report-name" value="\${existingReport ? (existingReport.nombre || '').split(' ||| ')[0] : 'Asistencia ' + selectedDate}"`;
updated = updated.replace(oldInput, newInput);

// Fix 2: Cleaning report name during save
const oldBaseName = `const baseName = (nameInput ? nameInput.value : 'Asistencia').toUpperCase().trim();`;
const newBaseName = `const baseName = (nameInput ? nameInput.value : 'Asistencia').split(' ||| ')[0].toUpperCase().trim();`;
updated = updated.replace(oldBaseName, newBaseName);

fs.writeFileSync('app.js', updated);
console.log('Success');
