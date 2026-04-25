const fs = require('fs');
const content = fs.readFileSync('/Users/miguelsobejano/Desktop/Home/Proyectos/RS Centro/app.js', 'utf8');
const lines = content.split('\n');
const start = 1263; // 1264 is line 1263 in 0-indexed
const end = 1617; // 1618 is line 1617 in 0-indexed

let balance = 0;
for (let i = start; i <= end; i++) {
    const line = lines[i];
    // Ignore characters inside template literals for simplicity, though not perfect
    // Actually, let's just count all.
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance < 0) console.log(`Balance negative at line ${i+1}`);
}
console.log(`Final balance for renderDashboard: ${balance}`);
