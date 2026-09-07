// ==UserScript==
// @name         Inkr Comics Ripper
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Downloads blob images from comics.inkr.com sequentially into a folder
// @author       ozler365
// @license      MIT
// @icon         https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/23/52/3f/23523f4d-7878-8c58-44da-953647a1bc2c/AppIcon-1x_U007emarketing-0-7-0-85-220.png/400x400ia-75.webp
// @match        https://comics.inkr.com/*
// @grant        GM_download
// @grant        GM_info
// @downloadURL https://update.greasyfork.org/scripts/569825/Inkr%20Comics%20Ripper.user.js
// @updateURL https://update.greasyfork.org/scripts/569825/Inkr%20Comics%20Ripper.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. Construct the Draggable UI
    // ==========================================
    
    // Container acts as the drag handle. Padding provides the space to grab it.
    const uiContainer = document.createElement('div');
    uiContainer.id = 'inkr-downloader-ui';
    uiContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647; /* Max z-index to avoid layout interference */
        background: rgba(30, 30, 30, 0.85);
        border: 2px solid #444;
        border-radius: 8px;
        padding: 15px; /* Ample space around button for dragging */
        cursor: move;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
    `;

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Find & Download Images';
    downloadBtn.style.cssText = `
        cursor: pointer;
        padding: 10px 18px;
        font-size: 14px;
        font-family: sans-serif;
        font-weight: bold;
        color: white;
        background: #ff4757;
        border: none;
        border-radius: 4px;
        transition: background 0.2s;
    `;

    uiContainer.appendChild(downloadBtn);
    document.body.appendChild(uiContainer);

    // ==========================================
    // 2. Draggable Logic
    // ==========================================
    let isDragging = false;
    let initialX, initialY, currentX, currentY;
    let xOffset = 0, yOffset = 0;

    uiContainer.addEventListener('mousedown', (e) => {
        // Prevent dragging if the user is clicking the button itself
        if (e.target === downloadBtn) return;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); // Prevent text highlighting while dragging
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        uiContainer.style.transform = `translate(${currentX}px, ${currentY}px)`;
    });

    document.addEventListener('mouseup', () => {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    });

    // ==========================================
    // 3. Image Fetching & Downloading Logic
    // ==========================================
    let isDownloading = false;

    // Helper to strip invalid characters from folder names
    function sanitizeFilename(name) {
        return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'Inkr_Comics_Download';
    }

    downloadBtn.addEventListener('click', async () => {
        if (isDownloading) return;

        // Fetching directly from DOM ensures they are grabbed in layout order
        const imgElements = document.querySelectorAll('img[src^="blob:https://comics.inkr.com"]');
        const imagesToDownload = Array.from(imgElements).map(img => img.src);

        if (imagesToDownload.length === 0) {
            downloadBtn.textContent = 'No Blob Images Found';
            setTimeout(() => { downloadBtn.textContent = 'Find & Download Images'; }, 2000);
            return;
        }

        isDownloading = true;
        let downloadedCount = 0;
        
        // Grab tab name for the folder
        const folderName = sanitizeFilename(document.title);
        downloadBtn.textContent = `Found ${imagesToDownload.length} images...`;
        downloadBtn.style.background = '#ffa502'; // Change color to indicate processing

        // Download sequentially to respect order and avoid network/memory spam
        for (let i = 0; i < imagesToDownload.length; i++) {
            const blobUrl = imagesToDownload[i];
            
            // Format number to ensure correct sorting in OS (e.g., page_001, page_002)
            const pageNum = String(i + 1).padStart(3, '0');
            const filePath = `${folderName}/page_${pageNum}.jpg`;

            await new Promise((resolve) => {
                GM_download({
                    url: blobUrl,
                    name: filePath,
                    onload: () => {
                        downloadedCount++;
                        downloadBtn.textContent = `Downloading: ${downloadedCount} / ${imagesToDownload.length}`;
                        resolve();
                    },
                    onerror: (err) => {
                        console.error(`Error downloading page ${pageNum}:`, err);
                        // Continue to the next image even if one fails
                        downloadedCount++;
                        downloadBtn.textContent = `Downloading: ${downloadedCount} / ${imagesToDownload.length} (Error)`;
                        resolve();
                    }
                });
            });
        }

        // Final UI State
        downloadBtn.textContent = 'Done!';
        downloadBtn.style.background = '#2ed573'; // Green for success
        
        setTimeout(() => {
            isDownloading = false;
            downloadBtn.textContent = 'Find & Download Images';
            downloadBtn.style.background = '#ff4757'; // Reset to default color
        }, 3000);
    });

})();