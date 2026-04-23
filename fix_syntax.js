const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const fixedContent = content.replace('\\n    window.cleanLugar = (l) => {', '\n    window.cleanLugar = (l) => {');
fs.writeFileSync('app.js', fixedContent);
console.log('Success');
