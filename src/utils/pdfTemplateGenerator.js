/**
 * PDF Template Generator — Manual Canvas Slicing Approach
 *
 * Reference: DYNAPIX Digital Media agreement.pdf
 *   Page A4: 597.5 × 843.5pt, Font: Calibri 12pt
 *   Margins: top=140pt (page2+), bottom=104pt, left=50pt
 *
 * This version uses html2canvas to render the ENTIRE content as one tall
 * canvas, then MANUALLY slices it at smart page boundaries (never cutting
 * through a section heading). This eliminates all jsPDF autoPaging bugs.
 */

export const generatePdfWithTemplate = async (htmlContent, templateUrl = '/Arah_Template.pdf') => {
    try {
        const { PDFDocument } = await import('pdf-lib');
        const html2canvas = (await import('html2canvas')).default;

        // ── Template-specific configurations ──
        const TEMPLATE_CONFIG = {
            '/Arah_Template.pdf': {
                pageW: 612, pageH: 792, marginTop: 111, marginBottom: 57, marginLR: 50
            },
            '/Vagerious.pdf': {
                pageW: 595, pageH: 842, marginTop: 140, marginBottom: 104, marginLR: 50
            },
            '/UPlife.pdf': {
                pageW: 596, pageH: 842, marginTop: 99, marginBottom: 78, marginLR: 50
            },
            '/Zero7_A4.pdf': {
                pageW: 595, pageH: 842, marginTop: 140, marginBottom: 101, marginLR: 50
            },
            '/Zero7_A4.jpg': {
                pageW: 595, pageH: 842, marginTop: 140, marginBottom: 101, marginLR: 50
            },
        };

        const cfg = TEMPLATE_CONFIG[templateUrl] || {
            pageW: 612, pageH: 792, marginTop: 110, marginBottom: 60, marginLR: 50
        };

        const PAGE_W = cfg.pageW;
        const PAGE_H = cfg.pageH;
        const MARGIN_TOP = cfg.marginTop;
        const MARGIN_BOTTOM = cfg.marginBottom;
        const MARGIN_LR = cfg.marginLR;
        const CONTENT_W = PAGE_W - (MARGIN_LR * 2);     // pt
        const CONTENT_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;  // pt per page

        // Scale: we want the content to render at ~1pt per CSS px for simplicity
        // Container width = CONTENT_W px, so 1px CSS = 1pt PDF
        const CONTAINER_W = Math.round(CONTENT_W);  // ~495-512px
        const SCALE = 2;  // html2canvas hi-res factor

        console.log(`[PDF GEN] Template: ${templateUrl}`);
        console.log(`[PDF GEN] Page: ${PAGE_W}×${PAGE_H}, Content: ${CONTENT_W}×${CONTENT_H}, Container: ${CONTAINER_W}px`);

        const isDense = htmlContent.length > 2500 ||
            htmlContent.includes('REMUNERATION') ||
            htmlContent.includes('Annexure A');

        const fontSize = isDense ? '11px' : '12px';
        const lineHeight = isDense ? '1.55' : '1.7';

        // ════════════════════════════════════════════════════════════════════
        // STEP 1 — Build DOM container (1px = 1pt mapping)
        // ════════════════════════════════════════════════════════════════════
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: ${CONTAINER_W}px;
            z-index: -9999;
            background: #ffffff;
            overflow: visible;
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .pdfgen * {
                font-family: Arial, Helvetica, sans-serif !important;
                color: #000000 !important;
                -webkit-text-fill-color: #000000 !important;
                box-sizing: border-box !important;
            }
            .pdfgen {
                width: ${CONTAINER_W}px !important;
                background: #ffffff !important;
                padding: 0 8px !important;
                font-size: ${fontSize} !important;
                line-height: ${lineHeight} !important;
            }
            .pdfgen p {
                margin-bottom: ${isDense ? '5px' : '8px'} !important;
                text-align: justify !important;
            }
            .pdfgen h1, .pdfgen h2, .pdfgen h3, .pdfgen h4,
            .pdfgen strong, .pdfgen b {
                margin-top: ${isDense ? '10px' : '15px'} !important;
                margin-bottom: 4px !important;
            }
            .pdfgen h3 {
                font-size: ${parseInt(fontSize) + 1}px !important;
                text-transform: uppercase;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                text-align: center !important;
            }
            .pdfgen h4 {
                font-size: ${parseInt(fontSize) + 1}px !important;
            }
            .pdfgen table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: ${isDense ? '10px' : '11px'} !important;
                margin: 8px 0 !important;
            }
            .pdfgen td, .pdfgen th { padding: 4px !important; }
            .pdfgen table:not([style*="border: none"]) td,
            .pdfgen table:not([style*="border: none"]) th {
                border: 1px solid #000 !important;
            }
            .pdfgen ul, .pdfgen ol {
                padding-left: 18px !important;
                margin-top: 2px !important;
                margin-bottom: 5px !important;
            }
            .pdfgen li { margin-bottom: 2px !important; }
        `;

        const container = document.createElement('div');
        container.className = 'pdfgen';
        container.style.position = 'relative';
        container.innerHTML = htmlContent;

        wrapper.appendChild(styleTag);
        wrapper.appendChild(container);
        document.body.appendChild(wrapper);

        // Force solid black text
        container.querySelectorAll('*').forEach(el => {
            el.style.color = '#000000';
            if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'B', 'TH'].includes(el.tagName)) {
                el.style.fontWeight = 'bold';
            }
        });

        await new Promise(r => setTimeout(r, 500));

        // ════════════════════════════════════════════════════════════════════
        // STEP 2 — Calculate smart page breaks (section-aware)
        // ════════════════════════════════════════════════════════════════════
        // Since 1px CSS ≈ 1pt PDF, CONTENT_H px = CONTENT_H pt content per page
        const totalHeight = container.scrollHeight;
        console.log(`[PDF GEN] Total content height: ${totalHeight}px, Content/page: ${CONTENT_H}px`);

        // Find all section headings and their Y positions
        const headings = Array.from(container.querySelectorAll('h4'));
        const sectionYs = headings.map(h => h.offsetTop);

        // Calculate page break Y positions (in container px)
        const pageBreaks = [0]; // Start of first page
        let currentY = 0;

        while (currentY + CONTENT_H < totalHeight) {
            let idealBreak = currentY + CONTENT_H;

            // Find the best break point: just BEFORE a section heading
            // Look for the heading that's closest to (but before) the ideal break
            let bestBreak = idealBreak;

            for (const sy of sectionYs) {
                // If a heading is within the last 30% of the page, break before it
                if (sy > currentY + CONTENT_H * 0.3 && sy <= idealBreak) {
                    bestBreak = sy - 5; // 5px buffer before heading
                }
            }

            // Also check: if a heading would be cut (heading starts before break
            // but its content extends after), break before that heading
            for (let i = 0; i < headings.length; i++) {
                const hTop = sectionYs[i];
                const hBottom = i + 1 < sectionYs.length ? sectionYs[i + 1] : totalHeight;
                const sectionHeight = hBottom - hTop;

                // If section starts on this page and extends past the break
                if (hTop > currentY && hTop < idealBreak && hBottom > idealBreak) {
                    // If the section fits on ONE page, break BEFORE it
                    if (sectionHeight <= CONTENT_H) {
                        bestBreak = Math.min(bestBreak, hTop - 5);
                    }
                }
            }

            // Ensure we always make progress (at least 50% of page height)
            if (bestBreak <= currentY + CONTENT_H * 0.5) {
                bestBreak = idealBreak;
            }

            pageBreaks.push(bestBreak);
            currentY = bestBreak;
        }

        const numPages = pageBreaks.length;
        console.log(`[PDF GEN] Smart page breaks:`, pageBreaks, `→ ${numPages} pages`);

        // ════════════════════════════════════════════════════════════════════
        // STEP 3 — Capture canvas with html2canvas
        // ════════════════════════════════════════════════════════════════════
        const canvas = await html2canvas(container, {
            scale: SCALE,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: CONTAINER_W,
            height: totalHeight,
            windowWidth: CONTAINER_W,
        });

        document.body.removeChild(wrapper);

        console.log(`[PDF GEN] Canvas: ${canvas.width}×${canvas.height}`);

        // ════════════════════════════════════════════════════════════════════
        // STEP 4 — Slice canvas into pages and build PDF
        // ════════════════════════════════════════════════════════════════════
        const finalDoc = await PDFDocument.create();

        // Load template
        const isImage = /\.(jpg|jpeg|png)$/i.test(templateUrl);
        let templateImage = null;
        let templatePdfDoc = null;
        let templatePage = null;

        if (isImage) {
            const imgRes = await fetch(`${templateUrl}?t=${Date.now()}`);
            const imageBytes = await imgRes.arrayBuffer();
            templateImage = templateUrl.toLowerCase().endsWith('.png')
                ? await finalDoc.embedPng(imageBytes)
                : await (async () => {
                    try { return await finalDoc.embedJpg(imageBytes); }
                    catch { return await finalDoc.embedPng(imageBytes); }
                })();
        } else {
            const templateRes = await fetch(`${templateUrl}?t=${Date.now()}`);
            const templatePdfBytes = await templateRes.arrayBuffer();
            templatePdfDoc = await PDFDocument.load(templatePdfBytes);
            const [embeddedPage] = await finalDoc.embedPdf(templatePdfDoc, [0]);
            templatePage = embeddedPage;
        }

        // Process each page
        for (let i = 0; i < numPages; i++) {
            const sliceStartPx = pageBreaks[i];
            const sliceEndPx = i + 1 < numPages ? pageBreaks[i + 1] : totalHeight;
            const sliceHeightPx = sliceEndPx - sliceStartPx;

            // Slice the canvas
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.ceil(sliceHeightPx * SCALE);
            const ctx = sliceCanvas.getContext('2d');

            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

            // Copy the relevant portion from the main canvas
            ctx.drawImage(
                canvas,
                0, Math.floor(sliceStartPx * SCALE),           // source x, y
                canvas.width, Math.ceil(sliceHeightPx * SCALE), // source w, h
                0, 0,                                            // dest x, y
                canvas.width, Math.ceil(sliceHeightPx * SCALE)  // dest w, h
            );

            // Convert slice to PNG
            const slicePng = sliceCanvas.toDataURL('image/png');
            const slicePngBytes = Uint8Array.from(
                atob(slicePng.split(',')[1]),
                c => c.charCodeAt(0)
            );

            const embeddedSlice = await finalDoc.embedPng(slicePngBytes);

            // Create page with template background
            const page = finalDoc.addPage([PAGE_W, PAGE_H]);

            // Draw template background
            if (templateImage) {
                page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
            } else if (templatePage) {
                page.drawPage(templatePage, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
            }

            // Draw content slice in the safe content area
            // PDF y-axis is bottom-up: y=0 is bottom of page
            // Content goes from MARGIN_TOP (from top) to PAGE_H - MARGIN_BOTTOM (from top)
            // In PDF coords: y = PAGE_H - MARGIN_TOP - sliceHeightPt
            const sliceWidthPt = CONTENT_W;
            const sliceHeightPt = Math.min(sliceHeightPx, CONTENT_H);

            page.drawImage(embeddedSlice, {
                x: MARGIN_LR,
                y: PAGE_H - MARGIN_TOP - sliceHeightPt,
                width: sliceWidthPt,
                height: sliceHeightPt,
            });
        }

        console.log(`[PDF GEN] Final PDF: ${finalDoc.getPageCount()} pages`);
        return _pdfBytesToDataUri(await finalDoc.save());

    } catch (err) {
        console.error('[PDF GEN] Error:', err);
        throw err;
    }
};

function _pdfBytesToDataUri(pdfBytes) {
    const bytes = new Uint8Array(pdfBytes);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return 'data:application/pdf;base64,' + window.btoa(binary);
}