const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

// Fix the most common broken patterns
let updated = content
    .split("split('\n')").join("split('\\n')")
    .split("split(\"\n\")").join("split(\"\\n\")")
    .split("join('\n')").join("join('\\n')")
    .split("join(\"\n\")").join("join(\"\\n\")")
    .split(".split(' ||| ')").join(".split(' ||| ')"); // This one was probably fine but just in case

fs.writeFileSync('app.js', updated);
console.log('Success');
