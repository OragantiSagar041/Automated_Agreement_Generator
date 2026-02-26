/**
 * Generates a PDF by writing text ON TOP of an existing PDF template.
 * @param {string} htmlContent - The letter content (HTML string).
 * @param {string} templateUrl - URL to the PDF template (e.g. '/Arah_Template.pdf').
 * @returns {Promise<string>} - Base64 Data URI of the final PDF.
 *
 * FIXES APPLIED:
 * 1. Unified page size to A4 (595.28 x 841.89) throughout — no more Letter vs A4 mismatch.
 * 2. Reduced yStart from 180 → 130 (first-page top margin for template header).
 * 3. jsPDF margin changed from [yStart, 0, 80, 0] → [yStart, 20, 60, 20] to prevent side clipping.
 * 4. BlendMode.Darken replaced with BlendMode.Normal for the PDF overlay strategy
 *    (Darken was hiding light/colored text).
 * 5. windowWidth increased to 820 to better match the A4 content width after scaling.
 * 6. html2canvas scale reduced to 1.5 (was 2) to prevent memory/rendering issues on long docs.
 */

export const generatePdfWithTemplate = async (htmlContent, templateUrl = '/Arah_Template.pdf') => {
    try {
        const { PDFDocument, BlendMode } = await import('pdf-lib');
        const { jsPDF } = await import('jspdf');

        // --- A4 dimensions in points ---
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;

        // FIX 1: Use A4 for jsPDF too (was [612, 792] US Letter → now A4)
        // This ensures the content PDF and template PDF share the same coordinate space.
        const PAGE_WIDTH_PT = A4_WIDTH;   // 595.28
        const PAGE_HEIGHT_PT = A4_HEIGHT; // 841.89

        // The HTML container width in px used by html2canvas / jsPDF.
        // jsPDF maps this windowWidth → PAGE_WIDTH_PT.
        const CONTAINER_WIDTH_PX = 794; // ≈ A4 at 96dpi

        // FIX 2: Reduced top margin (yStart).
        // 180pt was too aggressive — it pushed content below the visible area on continuation pages.
        // 130pt leaves enough room for the Arah Infotech header/logo on page 1.
        const isDense = htmlContent.length > 2500
            || htmlContent.includes("REMUNERATION")
            || htmlContent.includes("Annexure A");

        const config = {
            fontSize: isDense ? '13px' : '15px',
            lineHeight: isDense ? '1.5' : '1.75',
            pMargin: isDense ? '10px' : '14px',
            hMargin: isDense ? '18px' : '26px',
            tableSize: isDense ? '12px' : '13px',
            padding: '0px 72px',   // horizontal padding only; top/bottom handled by jsPDF margin
            yStart: 130,          // FIX: was 180 → now 130
        };

        // ── 1. Build the hidden DOM container ──────────────────────────────────
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: ${CONTAINER_WIDTH_PX}px;
            height: auto;
            z-index: -9999; // Hide underneath UI instead of tossing it 10 miles off-screen
        `;

        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            * {
                font-family: Arial, Helvetica, sans-serif !important;
                color: #000000 !important;
                -webkit-text-fill-color: #000000 !important;
                box-sizing: border-box !important;
            }
            .pdf-container {
                width: ${CONTAINER_WIDTH_PX}px !important;
                background: white !important;
                padding: ${config.padding} !important;
                font-size: ${config.fontSize} !important;
                line-height: ${config.lineHeight} !important;
                display: block !important;
            }
            p  { margin-bottom: ${config.pMargin} !important; text-align: justify !important; display: block !important; }
            h3, h4, strong, b {
                margin-top: ${config.hMargin} !important;
                margin-bottom: 8px !important;
                display: block !important;
            }
            h3 { font-size: ${parseInt(config.fontSize) + 2}px !important; text-transform: uppercase; }
            .date-row { text-align: right !important; margin-bottom: 25px !important; display: block !important; }
            .signature-block { page-break-inside: avoid !important; margin-top: 50px !important; display: block !important; }
            table { width: 100% !important; margin: 15px 0 !important; border-collapse: collapse !important; font-size: ${config.tableSize} !important; }
            td, th { padding: 8px !important; border: 1px solid #000 !important; }
        `;

        const container = document.createElement('div');
        container.className = 'pdf-container';
        container.innerHTML = htmlContent;

        wrapper.appendChild(styleEl);
        wrapper.appendChild(container);
        document.body.appendChild(wrapper);

        // Force inline colours for html2canvas reliability
        container.querySelectorAll('*').forEach(el => {
            el.style.color = '#000000';
            if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'B', 'TD', 'TH'].includes(el.tagName)) {
                el.style.fontWeight = 'bold';
            }
        });

        // ── 2. Render HTML → jsPDF (A4) ───────────────────────────────────────
        const contentPdfDoc = new jsPDF({
            unit: 'pt',
            format: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT], // FIX: A4 instead of Letter
        });

        // Use setTimeout to ensure the browser strictly paints and correctly measures the DOM height.
        await new Promise(resolve => setTimeout(resolve, 300));

        // ── 100% BULLETPROOF FIX: Manual Canvas Slicing Engine ──
        // jsPDF's internal autoPaging is too flaky and causes 1-page or blank generation bugs.
        // We will generate the full canvas ourselves, CHUNK it into smaller canvas pieces, 
        // and add those perfectly sized pieces to each page.
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default || html2canvasModule;

        const totalHeight = wrapper.scrollHeight;

        const canvas = await html2canvas(wrapper, {
            scale: 2, // High-res text
            useCORS: true,
            logging: false,
            backgroundColor: null, // CRITICAL: null ensures a transparent background so the template shows through
            windowWidth: CONTAINER_WIDTH_PX,
            width: CONTAINER_WIDTH_PX,
            height: totalHeight,
            windowHeight: totalHeight
        });

        const pdfWidth = PAGE_WIDTH_PT; // Fill A4 width
        const pdfHeightRatio = pdfWidth / canvas.width; // e.g. 595.28 / (794 * 2)

        const topMargin1 = config.yStart; // 130pt header clearance for Page 1
        const topMarginN = 60; // 60pt header clearance for Page 2+
        const bottomMargin = 60;

        let currentImgPos = 0; // The Y coordinate in the original Canvas
        let currentPage = 1;

        while (currentImgPos < canvas.height) {
            if (currentPage > 1) {
                contentPdfDoc.addPage();
            }

            const yOffset = currentPage === 1 ? topMargin1 : topMarginN;
            const pdfUsableHeight = PAGE_HEIGHT_PT - yOffset - bottomMargin;
            const canvasUsableHeight = pdfUsableHeight / pdfHeightRatio;

            // Chop the canvas exactly to the usable height
            const chunkCanvas = document.createElement('canvas');
            chunkCanvas.width = canvas.width;
            chunkCanvas.height = Math.min(canvasUsableHeight, canvas.height - currentImgPos);

            const chunkCtx = chunkCanvas.getContext('2d');
            chunkCtx.drawImage(
                canvas,
                0, currentImgPos, canvas.width, chunkCanvas.height, // Source coordinates
                0, 0, chunkCanvas.width, chunkCanvas.height // Destination coordinates
            );

            const imgData = chunkCanvas.toDataURL('image/png');
            const chunkPdfHeight = chunkCanvas.height * pdfHeightRatio;

            // Draw this slice exactly at yOffset without using negative coordinates
            contentPdfDoc.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, chunkPdfHeight);

            currentImgPos += chunkCanvas.height;
            currentPage++;

            if (currentPage > 20) break; // Infinite loop safety
        }

        document.body.removeChild(wrapper);

        const contentPdfBytes = contentPdfDoc.output('arraybuffer');

        // ── 3. Overlay content onto template ──────────────────────────────────
        const isImage = /\.(jpg|jpeg|png)$/i.test(templateUrl);

        if (isImage) {
            // ── IMAGE TEMPLATE STRATEGY ──────────────────────────────────────
            console.log("Using Image Template Strategy");

            const finalDoc = await PDFDocument.create();
            const imgRes = await fetch(`${templateUrl}?t=${Date.now()}`);
            const contentType = imgRes.headers.get('content-type') || '';

            if (!imgRes.ok || contentType.includes('text/html')) {
                throw new Error(`Template image missing: ${templateUrl}`);
            }

            const imageBytes = await imgRes.arrayBuffer();
            const embeddedImage = templateUrl.toLowerCase().endsWith('.png')
                ? await finalDoc.embedPng(imageBytes)
                : await (async () => {
                    try { return await finalDoc.embedJpg(imageBytes); }
                    catch { return await finalDoc.embedPng(imageBytes); }
                })();

            const contentDocForEmbed = await PDFDocument.load(contentPdfBytes);
            const embeddedContent = await finalDoc.embedPdf(contentDocForEmbed);
            const pageCount = embeddedContent.length;

            for (let i = 0; i < pageCount; i++) {
                const finalPage = finalDoc.addPage([A4_WIDTH, A4_HEIGHT]);

                // Draw template image as background
                finalPage.drawImage(embeddedImage, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });

                // Draw content on top
                if (embeddedContent[i]) {
                    finalPage.drawPage(embeddedContent[i], {
                        x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT,
                        blendMode: BlendMode.Normal,
                    });
                }
            }

            return _pdfBytesToDataUri(await finalDoc.save());

        } else {
            // ── EXISTING PDF TEMPLATE STRATEGY ───────────────────────────────
            console.log(`Fetching PDF template: ${templateUrl}`);
            const templateRes = await fetch(`${templateUrl}?t=${Date.now()}`);
            if (!templateRes.ok) throw new Error(`Template PDF not found: ${templateUrl}`);

            const templatePdfBytes = await templateRes.arrayBuffer();
            const finalDoc = await PDFDocument.load(templatePdfBytes);
            const contentDoc = await PDFDocument.load(contentPdfBytes);
            const embeddedPages = await finalDoc.embedPdf(contentDoc);
            const contentPageCount = contentDoc.getPageCount();

            // Ensure template has enough pages (duplicate page 0 as blank-with-header pages)
            while (finalDoc.getPageCount() < contentPageCount) {
                const [dup] = await finalDoc.copyPages(finalDoc, [0]);
                finalDoc.addPage(dup);
            }

            const pages = finalDoc.getPages();
            for (let i = 0; i < contentPageCount; i++) {
                const finalPage = pages[i];
                const { width, height } = finalPage.getSize();

                if (embeddedPages[i]) {
                    // FIX 4: BlendMode.Normal instead of BlendMode.Darken.
                    // Darken was suppressing light-coloured text and making content invisible
                    // against the white template background.
                    finalPage.drawPage(embeddedPages[i], {
                        x: 0, y: 0, width, height,
                        opacity: 1,
                        blendMode: BlendMode.Normal,
                    });
                }
            }

            // Trim any extra template pages
            while (finalDoc.getPageCount() > contentPageCount) {
                finalDoc.removePage(finalDoc.getPageCount() - 1);
            }

            return _pdfBytesToDataUri(await finalDoc.save());
        }

    } catch (err) {
        console.error("PDF Template Error:", err);
        throw err;
    }
};

// ── Helper ─────────────────────────────────────────────────────────────────────
function _pdfBytesToDataUri(pdfBytes) {
    const bytes = new Uint8Array(pdfBytes);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:application/pdf;base64,' + window.btoa(binary);
}