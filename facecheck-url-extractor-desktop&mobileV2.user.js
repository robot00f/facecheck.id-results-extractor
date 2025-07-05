// ==UserScript==
// @name         FaceCheck URL Extractor with Ratings (Mobile and Desktop) + PNG Clipboard (EN, animated copy)
// @namespace    http://tampermonkey.net/
// @version      3.0.1
// @description  Extracts image URLs and ratings from FaceCheck results for both mobile and desktop with automatic overlay on mobile. Adds a button to copy the image from style as PNG (clipboard compatible), button text in English, shows animation on copy success, no alert popup.
// @author       vin31_ modified by Nthompson096, perplexity.ai, 0wn3dg0d, robot00f, Copilot
// @match        https://facecheck.id/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const getCookie = (name) => {
        const cookies = document.cookie.split(';').map(cookie => cookie.trim());
        const targetCookie = cookies.find(cookie => cookie.startsWith(`${name}=`));
        return targetCookie ? targetCookie.split('=')[1] : null;
    };

    const theme = getCookie('theme') || 'dark';

    const getRating = (confidence) => {
        if (confidence >= 90) return { rating: 'Certain Match', color: isMobile ? 'green' : '#4caf50' };
        if (confidence >= 83) return { rating: 'Confident Match', color: isMobile ? 'yellow' : '#ffeb3b' };
        if (confidence >= 70) return { rating: 'Uncertain Match', color: isMobile ? 'orange' : '#ff9800' };
        if (confidence >= 50) return { rating: 'Weak Match', color: isMobile ? 'red' : '#f44336' };
        return { rating: 'No Match', color: isMobile ? 'white' : '#9e9e9e' };
    };

    const isResultsPage = () => /https:\/\/facecheck\.id\/(?:[a-z]{2})?\#.+/.test(window.location.href);

    const extractUrls = (fimg) => {
        const parentAnchor = fimg.closest('a');
        const groupId = parentAnchor ? parentAnchor.getAttribute('data-grp') : null;
        const results = [];

        if (groupId) {
            const groupElements = document.querySelectorAll(`a[data-grp="${groupId}"]`);
            groupElements.forEach(groupElement => {
                const groupFimg = groupElement.querySelector('.facediv') || groupElement.querySelector('[id^="fimg"]');
                if (!groupFimg) return;
                const result = extractSingleUrl(groupFimg);
                if (result) results.push(result);
            });
        } else {
            const result = extractSingleUrl(fimg);
            if (result) results.push(result);
        }

        return results.sort((a, b) => b.confidence - a.confidence);
    };

    const extractSingleUrl = (fimg) => {
        const bgImage = window.getComputedStyle(fimg).backgroundImage;
        const base64Match = bgImage.match(/base64,([^")]+)/);
        let urlMatch = null;
        if (base64Match) {
            try {
                urlMatch = atob(base64Match[1]).match(/https?:\/\/[^\s"]+/);
            } catch (e) {
                urlMatch = null;
            }
        }
        const base64Data = base64Match ? `data:image/webp;base64,${base64Match[1]}` : null;
        if (!urlMatch && !base64Data) return null;

        const domain = urlMatch ? new URL(urlMatch[0]).hostname.replace('www.', '') : '';
        const distSpan = fimg.parentElement.querySelector('.dist');
        const confidence = distSpan ? parseInt(distSpan.textContent) : 0;
        const { rating, color } = getRating(confidence);

        return { url: urlMatch ? urlMatch[0] : '', domain, confidence, rating, color, base64: base64Data };
    };

    // Animation on copy
    function animateCopyButton(btn) {
        // Save original
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="copy-anim-tick">&#10003; Copied!</span>`;
        btn.classList.add('copy-anim-active');
        setTimeout(() => {
            btn.classList.remove('copy-anim-active');
            btn.innerHTML = original;
            btn.disabled = false;
        }, 1400);
    }

    // Convert webp base64 to PNG and copy the image to the clipboard
    const copyImageFromBase64 = async (base64, btn) => {
        try {
            const img = new window.Image();
            img.crossOrigin = "Anonymous";
            img.src = base64;

            img.onload = async function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(async (blob) => {
                    try {
                        await navigator.clipboard.write([
                            new window.ClipboardItem({
                                'image/png': blob,
                            }),
                        ]);
                        if (btn) animateCopyButton(btn);
                    } catch (err) {
                        alert('Could not copy the image: ' + err);
                    }
                }, 'image/png');
            };

            img.onerror = function () {
                alert('Could not load the image for copying.');
            };
        } catch (err) {
            alert('Could not copy the image: ' + err);
        }
    };

    // Add animation CSS
    const animCSS = `
    .copy-anim-tick {
        display: inline-block;
        color: #2ecc40;
        font-weight: bold;
        font-size: 1em;
        transition: color 0.3s;
        margin-right: 2px;
    }
    .copy-anim-active {
        background: #222 !important;
        color: #2ecc40 !important;
        border-color: #2ecc40 !important;
        transition: background 0.3s, color 0.3s, border-color 0.3s;
    }
    `;
    const animStyle = document.createElement("style");
    animStyle.innerText = animCSS;
    document.head.appendChild(animStyle);

    // MOBILE FUNCTIONALITY
    if (isMobile) {
        const mobileStyles = `
            .mobile-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.7), transparent);
                color: white;
                padding: 12px 8px 8px 8px;
                font-size: 14px;
                line-height: 1.4;
                z-index: 1000;
                border-radius: 0 0 8px 8px;
                pointer-events: none;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            }
            .mobile-overlay.visible {
                transform: translateY(0);
            }
            .mobile-overlay a {
                color: #00FFFF;
                text-decoration: none;
                display: block;
                margin-bottom: 4px;
                font-weight: bold;
                pointer-events: all;
                padding: 6px 8px;
                border-radius: 4px;
                background: rgba(0,0,0,0.8);
                font-size: 14px;
            }
            .mobile-overlay a:active {
                background: rgba(0,255,255,0.2);
            }
            .mobile-overlay .rating {
                font-size: 12px;
                font-weight: normal;
            }
            .fimg-container {
                position: relative;
                overflow: hidden;
            }
            .mobile-info-panel {
                position: fixed;
                bottom: 10px;
                left: 10px;
                right: 10px;
                background: rgba(0,0,0,0.95);
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 9999;
                font-size: 16px;
                line-height: 1.5;
                max-height: 70vh;
                overflow-y: auto;
                transform: translateY(120%);
                transition: transform 0.3s ease;
                border: 1px solid rgba(0,255,255,0.3);
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            .mobile-info-panel.visible {
                transform: translateY(0);
            }
            .mobile-info-panel .close-btn {
                position: absolute;
                top: 8px;
                right: 12px;
                background: none;
                border: none;
                color: #00FFFF;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
            }
            .mobile-info-panel a {
                color: #00FFFF;
                text-decoration: none;
                display: block;
                margin: 12px 0;
                padding: 10px 12px;
                background: rgba(0,255,255,0.1);
                border-radius: 6px;
                border: 1px solid rgba(0,255,255,0.2);
                word-break: break-all;
                font-size: 16px;
            }
            .mobile-info-panel a:active {
                background: rgba(0,255,255,0.3);
            }
            .mobile-info-panel .url-item {
                margin-bottom: 16px;
            }
            .mobile-info-panel .confidence {
                font-size: 14px;
                margin-top: 6px;
            }
            .mobile-info-panel .copy-btn {
                background: #222;
                color: #00FFFF;
                border: 1px solid #333;
                border-radius: 4px;
                padding: 6px 10px;
                font-size: 15px;
                cursor: pointer;
                margin-top: 6px;
                margin-bottom: 4px;
                width: 100%;
                transition: background 0.2s, color 0.2s;
                display: block;
            }
            .mobile-info-panel .copy-btn:active {
                background: #00ffff;
                color: #222;
            }
            .mobile-overlay .click-hint {
                font-size: 12px;
                color: #aaa;
                margin-top: 4px;
                font-style: italic;
            }
        `;
        const mobileStyleSheet = document.createElement("style");
        mobileStyleSheet.type = "text/css";
        mobileStyleSheet.innerText = mobileStyles;
        document.head.appendChild(mobileStyleSheet);

        const createMobileOverlay = (fimg, results) => {
            const container = fimg.parentElement;
            if (!container.classList.contains('fimg-container')) {
                container.classList.add('fimg-container');
            }

            const overlay = document.createElement("div");
            overlay.classList.add("mobile-overlay");

            const topResult = results[0];
            overlay.innerHTML = `
                <div style="color:${topResult.color}; pointer-events: none;">
                    ${topResult.domain} (${topResult.confidence}%)
                </div>
                <div class="click-hint" style="pointer-events: none;">Tap to view URLs and copy image</div>
            `;

            container.appendChild(overlay);

            setTimeout(() => {
                overlay.classList.add("visible");
            }, 100);

            return overlay;
        };

        const createInfoPanel = () => {
            const panel = document.createElement("div");
            panel.classList.add("mobile-info-panel");
            panel.innerHTML = `
                <button class="close-btn">×</button>
                <div id="panel-content"></div>
            `;
            document.body.appendChild(panel);

            panel.querySelector('.close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.remove('visible');
            });

            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && panel.classList.contains('visible')) {
                    panel.classList.remove('visible');
                }
            });

            return panel;
        };

        const infoPanel = createInfoPanel();

        const addOverlayClickHandler = (overlay, results) => {
            overlay.style.pointerEvents = 'all';
            overlay.style.cursor = 'pointer';

            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const content = results.map((result, index) => `
                    <div class="url-item">
                        <a href="${result.url}" target="_blank">
                            ${index + 1}. ${result.domain}
                        </a>
                        <div class="confidence" style="color:${result.color};">
                            ${result.confidence}% - ${result.rating}
                        </div>
                        <a href="${result.url}" target="_blank" style="font-size:12px;">
                            ${result.url}
                        </a>
                        ${result.base64 ? `<button class="copy-btn" data-idx="${index}">Copy image</button>` : ''}
                    </div>
                `).join('');

                infoPanel.querySelector('#panel-content').innerHTML = content;
                infoPanel.classList.add('visible');

                infoPanel.querySelectorAll('.copy-btn').forEach(btn => {
                    btn.onclick = async (ev) => {
                        ev.stopPropagation();
                        const idx = parseInt(btn.getAttribute('data-idx'), 10);
                        const base64 = results[idx].base64;
                        if (base64) {
                            await copyImageFromBase64(base64, btn);
                        }
                    };
                });
            });
        };

        const processMobileImages = () => {
            const fimgElements = document.querySelectorAll('[id^="fimg"]');
            fimgElements.forEach(fimg => {
                if (fimg.parentElement.querySelector('.mobile-overlay')) return;
                const results = extractUrls(fimg);
                if (results.length > 0) {
                    const overlay = createMobileOverlay(fimg, results);
                    addOverlayClickHandler(overlay, results);
                }
            });
        };

        setInterval(() => {
            if (isResultsPage() && document.querySelector('[id^="fimg"]')) {
                processMobileImages();
                setTimeout(() => {
                    processMobileImages();
                }, 2000);
            }
        }, 1000);

    } else {
        const desktopStyles = `
            :root {
                --popup-bg: ${theme === 'light' ? '#ffffff' : '#1e1e1e'};
                --popup-color: ${theme === 'light' ? '#007acc' : '#00ffff'};
                --popup-opacity: 0.95;
                --popup-border: 1px solid ${theme === 'light' ? 'rgba(0, 122, 204, 0.2)' : 'rgba(0, 255, 255, 0.2)'};
                --popup-shadow: 0 4px 12px ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)'};
                --popup-radius: 12px;
                --popup-padding: 16px;
                --popup-width: 340px;
                --popup-max-height: 420px;
                --popup-transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .popup {
                position: fixed;
                background: var(--popup-bg);
                color: var(--popup-color);
                opacity: 0;
                border: var(--popup-border);
                box-shadow: var(--popup-shadow);
                border-radius: var(--popup-radius);
                padding: var(--popup-padding);
                width: var(--popup-width);
                max-height: var(--popup-max-height);
                overflow-y: auto;
                pointer-events: auto;
                transition: var(--popup-transition);
                transform: translateY(-10px);
                backdrop-filter: blur(10px);
                z-index: 9999;
            }
            .popup.visible {
                opacity: var(--popup-opacity);
                transform: translateY(0);
            }
            .popup ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .popup li {
                margin: 8px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .popup a {
                color: var(--popup-color);
                text-decoration: none;
                transition: color 0.2s ease;
            }
            .popup a:hover {
                color: #ff6f61;
            }
            .popup .copy-btn {
                background: ${theme === 'light' ? '#e0e0e0' : '#333'};
                color: ${theme === 'light' ? '#007acc' : '#00ffff'};
                border: 1px solid ${theme === 'light' ? '#bbb' : '#444'};
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                margin-left: 4px;
                transition: background 0.2s, color 0.2s, border-color 0.2s;
            }
            .popup .copy-btn:active {
                background: #00ffff;
                color: #222;
            }
        `;
        const desktopStyleSheet = document.createElement("style");
        desktopStyleSheet.type = "text/css";
        desktopStyleSheet.innerText = desktopStyles;
        document.head.appendChild(desktopStyleSheet);

        const createPopup = () => {
            const popup = document.createElement("div");
            popup.classList.add("popup");
            document.body.appendChild(popup);
            return popup;
        };

const displayResultsDesktop = (results, popup, fimg) => {
    const rect = fimg.getBoundingClientRect();
    popup.style.left = `${rect.right - 155}px`;
    popup.style.top = `${rect.top}px`;

    // show Copy image button only if results[0] has base64
    let copyBtnHtml = '';
    if (results[0] && results[0].base64) {
        copyBtnHtml = `<button class="copy-btn" data-idx="0" style="margin-bottom: 8px; width: 100%;">Copy image</button>`;
    }

    const resultsList = results.map((result, idx) => `
        <li>
            <a href="${result.url}" target="_blank">${result.domain}</a>
            <span style="color:${result.color};">(${result.confidence}% - ${result.rating})</span>
        </li>
    `).join('');

    popup.innerHTML = `${copyBtnHtml}<ul>${resultsList}</ul>`;
    popup.classList.add('visible');

    // Add single copy button listener (if present)
    const copyBtn = popup.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.onclick = async (e) => {
            e.stopPropagation();
            const base64 = results[0].base64;
            if (base64) {
                await copyImageFromBase64(base64, copyBtn);
            }
        };
    }
};

        const popup = createPopup();
        const processedFimgs = new WeakSet();
        let hoverTimeout;
        let isPopupHovered = false;

        const addHoverListeners = () => {
            const fimgElements = document.querySelectorAll('[id^="fimg"]');
            fimgElements.forEach(fimg => {
                if (processedFimgs.has(fimg)) return;
                processedFimgs.add(fimg);

                fimg.addEventListener('mouseenter', () => {
                    if (isPopupHovered) return;
                    clearTimeout(hoverTimeout);
                    const results = extractUrls(fimg);
                    if (results.length > 0) {
                        displayResultsDesktop(results, popup, fimg);
                    }
                });

                fimg.addEventListener('mouseleave', () => {
                    if (isPopupHovered) return;
                    hoverTimeout = setTimeout(() => {
                        popup.classList.remove('visible');
                    }, 300);
                });
            });

            popup.addEventListener('mouseenter', () => {
                isPopupHovered = true;
                clearTimeout(hoverTimeout);
            });

            popup.addEventListener('mouseleave', () => {
                isPopupHovered = false;
                popup.classList.remove('visible');
            });
        };

        setInterval(() => {
            if (isResultsPage() && document.querySelector('[id^="fimg"]')) {
                addHoverListeners();
            }
        }, 1000);
    }

})();
