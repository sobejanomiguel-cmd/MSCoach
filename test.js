const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.goto('file://' + process.cwd() + '/index.html', {waitUntil: 'networkidle0'});
    await page.evaluate(() => {
        window.openFullScreenPitch('scouting', null, 'F11_433');
    });
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
