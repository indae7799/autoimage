import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log("Connecting to the active browser session...");
        const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
        const pages = await browser.pages();
        const page = pages[0];

        console.log("Attempting to click the 'Generate' button...");

        // Find the button (it has specific classes and text)
        // Since I translated it to Korean, I'll search for '기획안 생성'
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const genButton = buttons.find(b => b.innerText.includes('기획안 생성'));
            if (genButton) {
                genButton.click();
                console.log("Button clicked!");
            } else {
                console.error("Button not found!");
            }
        });

        console.log("Waiting for Editor to load...");
        await new Promise(r => setTimeout(r, 10000));

        await browser.disconnect();
    } catch (error) {
        console.error("Remote click failed:", error);
    }
})();
