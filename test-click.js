const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable"
});

dom.window.addEventListener('error', (event) => {
    console.log("Global Error:", event.error);
});

dom.window.addEventListener('load', () => {
    console.log("Loaded! Clicking button...");
    try {
        dom.window.eval(`
            const btn = document.querySelector('button[onclick*="window.openFullScreenPitch"]');
            if (btn) {
                console.log("Button found! Clicking...");
                btn.click();
            } else {
                console.log("Button NOT FOUND in DOM");
                // let's run the renderCampograma to inject it
                window.campogramaFilters = {
                    sistema: 'F11_433', equipos: [], posiciones: [], years: [], clubesConvenidos: [], niveles: []
                };
                // We'll just call openFullScreenPitch directly
                window.openFullScreenPitch('scouting', null, 'F11_433');
            }
            console.log("Overlay classes after click:", document.getElementById('preview-overlay').className);
            console.log("Preview content:", document.getElementById('preview-content').innerHTML.substring(0, 100));
        `);
    } catch(e) {
        console.log("Caught:", e);
    }
});
