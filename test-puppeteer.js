const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
        
        await page.goto('file://' + __dirname + '/index.html', { waitUntil: 'networkidle0' });
        
        console.log("Navigating to Pizarra Táctica...");
        await page.evaluate(() => {
            window.loadView('scouting');
        });
        
        await new Promise(r => setTimeout(r, 1000));
        
        console.log("Clicking fullscreen button...");
        await page.evaluate(() => {
            const btn = document.querySelector('button[onclick*="window.openFullScreenPitch"]');
            if (btn) btn.click();
            else console.log("Button not found!");
        });
        
        await new Promise(r => setTimeout(r, 500));
        
        const overlayClass = await page.evaluate(() => {
            return document.getElementById('preview-overlay').className;
        });
        console.log("Overlay class:", overlayClass);
        
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
