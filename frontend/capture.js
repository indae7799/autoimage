/* eslint-disable */
import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });

        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        console.log("Navigating to localhost:3000...");
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

        console.log("Waiting 5s for the user screen...");
        await new Promise(r => setTimeout(r, 5000));

        console.log("Taking logical verification snapshot...");
        await page.screenshot({ path: 'analysis_view.png', fullPage: true });

        console.log("Screenshot saved to analysis_view.png");
        await browser.close();
    } catch (error) {
        console.error("Capture failed:", error);
        process.exit(1);
    }
})();
