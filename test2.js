const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('./index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
dom.window.onerror = function(msg, file, line, col, error) {
    console.error('JS ERROR:', msg, error);
};
dom.window.addEventListener('load', () => {
    try {
        console.log("Loaded. Testing openFullScreenPitch...");
        dom.window.openFullScreenPitch('scouting', null, 'F11_433');
        console.log("Success! innerHTML of preview:", dom.window.document.getElementById('preview-content').innerHTML.substring(0, 50));
    } catch(e) {
        console.error("CAUGHT:", e);
    }
});
