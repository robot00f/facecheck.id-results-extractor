// ==UserScript==
// @name         FaceCheck URL Extractor mobile with Ratings
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Extracts image URLs and ratings from FaceCheck for mobile phones
// @author       vin31_ modified by Nthompson096 with perplexity.ai
// @match        https://facecheck.id/*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    const extractUrls = max => [...Array(max)].map((_, i) => {
        const fimg = document.querySelector(`#fimg${i}`);
        if (!fimg) return null;
        const bg = window.getComputedStyle(fimg).backgroundImage;
        const url = atob(bg.match(/base64,(.*)"/)?.[1] || '').match(/https?:\/\/[^\s"]+/)?.[0];
        if (!url) return null;
        const distSpan = fimg.parentElement.querySelector('.dist');
        const confidence = distSpan ? parseInt(distSpan.textContent) : 0;
        let rating;
        if (confidence >= 90) rating = 'Certain Match';
        else if (confidence >= 83) rating = 'Confident Match';
        else if (confidence >= 70) rating = 'Uncertain Match';
        else if (confidence >= 50) rating = 'Weak Match';
        else rating = 'No Match';
        return {url, domain: new URL(url).hostname.replace('www.', ''), confidence, rating};
    }).filter(Boolean);

    const init = async () => {
        if (document.querySelector('#fimg0')) {
            const div = Object.assign(document.createElement('div'), {
                style: 'position:fixed;left:5%;top:70px;width:90%;max-height:80%;background:rgba(0,0,0,0.8);color:#00FFFF;z-index:9999;padding:10px;border-radius:8px;overflow-y:auto;font-size:14px',
                innerHTML: `
                    <h2 style="color:#FFF;margin:0 0 10px;cursor:pointer" id="resultsToggle">▼ Results:</h2>
                    <div id="resultsList" style="display:block"></div>
                `
            });
            document.body.appendChild(div);

            const urls = extractUrls(Math.min(Math.max(parseInt(prompt('How many URLs to extract? (1-50)', '10')) || 10, 1), 50));
            const resultsList = div.querySelector('#resultsList');
            resultsList.innerHTML = urls.length ? urls.map((item, i) => {
                const ratingColor = item.rating === 'Certain Match' ? 'green' :
                                    item.rating === 'Confident Match' ? 'yellow' :
                                    item.rating === 'Uncertain Match' ? 'orange' :
                                    item.rating === 'Weak Match' ? 'red' : 'white';
                return `<a href="${item.url}" target="_blank" style="color:#00FFFF;text-decoration:none;display:block;margin-bottom:10px">
                    ${i+1}. ${item.domain} <span style="color:${ratingColor};">(${item.confidence}% - ${item.rating})</span>
                </a>`;
            }).join('') : '<p>No URLs found</p>';

            div.querySelector('#resultsToggle').addEventListener('click', () => {
                resultsList.style.display = resultsList.style.display === 'none' ? 'block' : 'none';
                div.querySelector('#resultsToggle').textContent = (resultsList.style.display === 'none' ? '▶' : '▼') + ' Results:';
            });
        }
    };

    const checkInterval = setInterval(() => {
        if (/https:\/\/facecheck\.id\/?(([a-z]{2})?\#.+)/.test(location.href) && document.querySelector('#fimg0')) {
            init();
            clearInterval(checkInterval);
        }
    }, 1000);
})();
