const fs = require('fs');
const content = fs.readFileSync('/Users/miguelsobejano/Desktop/Home/Proyectos/RS Centro/app.js', 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance < 0) {
        console.log(`Balance negative at line ${i+1}`);
        break;
    }
}
console.log(`Final balance for whole file: ${balance}`);
