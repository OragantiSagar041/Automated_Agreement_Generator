import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        let errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(`Console Error: ${msg.text()}`);
            }
        });
        page.on('pageerror', err => {
            errors.push(`Page Error: ${err.message}`);
        });

        await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

        // Click New Candidate
        const newCandidateBtn = await page.$x("//button[contains(., 'New Candidate')]");
        if (newCandidateBtn.length > 0) {
            await newCandidateBtn[0].click();
            await page.waitForTimeout(500);

            // Fill form minimally
            await page.type('input[placeholder="Company Name"]', 'Test Company');
            await page.type('input[placeholder="Person name"]', 'John Doe');
            await page.type('input[placeholder="Ex: 5"]', '10');
            await page.type('input[placeholder="Authorized Signatory"]', 'CEO');

            const addPartnerBtn = await page.$x("//button[contains(., 'Add Partner')]");
            if (addPartnerBtn.length > 0) {
                await addPartnerBtn[0].click();
                await page.waitForTimeout(500);
            }
        }

        // Find Generate Offer
        const genOfferBtn = await page.$x("//button[contains(., 'GENERATE OFFER') or contains(., 'VIEW / RESEND')]");
        if (genOfferBtn.length > 0) {
            await genOfferBtn[0].click();
            await page.waitForTimeout(1000);

            // Click Generate AI Draft (or 'Generate')
            const genDraftBtn = await page.$x("//button[contains(., 'Generate AI Draft')]");
            if (genDraftBtn.length > 0) {
                await genDraftBtn[0].click();
                console.log("Clicked Generate AI Draft");
                await page.waitForTimeout(5000); // Wait for generation
            } else {
                console.log("Could not find Generate AI Draft");
            }
        } else {
            console.log("Could not find GENERATE OFFER");
        }

        console.log("Recorded Errors:", errors);
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
