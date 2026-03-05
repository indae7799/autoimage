import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    try {
        console.log("Launching LIVE simulation...");
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox']
        });

        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        console.log("Navigating to http://localhost:3000...");
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

        console.log("Uploading sample image...");
        const fileInput = await page.waitForSelector('input[type="file"]');
        const filePath = path.resolve(__dirname, '../backend/sample_product_test.png');
        await fileInput.uploadFile(filePath);

        console.log("Waiting for Analysis Result...");
        await page.waitForFunction(() => document.body.innerText.includes('분석 리포트'), { timeout: 60000 });

        console.log("Result Screen Detected. Clicking 'Generate Plan' button...");
        await new Promise(r => setTimeout(r, 2000)); // Dramatic pause

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const genButton = buttons.find(b => b.innerText.includes('기획안 생성') || b.innerText.includes('Generate'));
            if (genButton) genButton.click();
        });

        console.log("Watching the Editor load...");
        // Wait for editor (data-section-type means editor is active)
        await page.waitForSelector('[data-section-type]', { timeout: 30000 });

        console.log("Editor phase reached. Simulation Success.");

        // Keep open for observation
        await new Promise(r => setTimeout(r, 3600000));
        await browser.close();
    } catch (error) {
        console.error("Simulation failed:", error);
    }
})();
