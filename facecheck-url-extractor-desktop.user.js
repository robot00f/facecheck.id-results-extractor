// ==UserScript==
// @name         URL Extractor for FaceCheck Results - Desktop
// @namespace    http://tampermonkey.net/
// @version      2.0.2
// @description  Extracts image URLs from FaceCheck results and sorts them by trust and view rating. show thumbnails
// @author       vin31_ modified by Nthompson096 and perplexity.ai, robot00f
// @match        *://facecheck.id/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // CSS styles for the results container
    const styles = `
        .results-container {
            position: fixed;
            top: 20px;
            left: 20px;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            background: rgba(0,0,0,0.9);
            padding: 15px;
            border-radius: 8px;
            z-index: 9999;
        }
        .result-item {
            display: flex;
            align-items: center;
            margin: 10px 0;
            padding: 8px;
            border-radius: 4px;
            background: rgba(255,255,255,0.1);
        }
        .thumbnail {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            margin-right: 10px;
        }
        .result-info {
            flex: 1;
        }
    `;

    // Add styles to the document
    const addStyles = () => {
        const styleSheet = document.createElement("style");
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    };

    // Helper to determine rating and color based on confidence score
    const getRating = (confidence) => {
        if (confidence >= 90) return { rating: 'Certain Match', color: '#4CAF50' };
        if (confidence >= 83) return { rating: 'Confident Match', color: '#FFC107' };
        if (confidence >= 70) return { rating: 'Uncertain Match', color: '#FF9800' };
        if (confidence >= 50) return { rating: 'Weak Match', color: '#F44336' };
        return { rating: 'No Match', color: '#ffffff' };
    };

    // Function to extract URLs, ratings, and thumbnails
    const extractUrls = (maxResults) => {
        return Array.from({ length: maxResults }, (_, i) => {
            try {
                const fimg = document.querySelector(`#fimg${i}`);
                if (!fimg) return null;

                // Get URL and domain
                const bgImage = window.getComputedStyle(fimg).backgroundImage;
                const base64Match = bgImage.match(/base64,(.*)"/);
                const urlMatch = base64Match ? atob(base64Match[1]).match(/https?:\/\/[^\s"]+/) : null;
                if (!urlMatch) return null;

                const domain = new URL(urlMatch[0]).hostname.replace('www.', '');

                // Get confidence score
                const distSpan = fimg.querySelector('.dist');
                const confidence = distSpan ? parseInt(distSpan.textContent) : 0;
                const { rating, color } = getRating(confidence);

                // Get thumbnail
                const thumbnail = bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');

                return { url: urlMatch[0], domain, confidence, rating, color, thumbnail };
            } catch (error) {
                console.error(`Error extracting URL at index ${i}:`, error);
                return null;
            }
        }).filter(Boolean);
    };

    // Display results in a floating div with thumbnails
    const displayResults = (results, linkDiv) => {
        const resultsList = results.map((result, index) => `
            <li class="result-item">
                <img src="${result.thumbnail}" class="thumbnail">
                <div class="result-info">
                    ${index + 1}. <a href="${result.url}" target="_blank" style="color:#00FFFF;text-decoration:none;">
                    ${result.domain}</a>
                    <span style="color:${result.color};">(${result.confidence}% - ${result.rating})</span>
                </div>
            </li>
        `).join('');

        linkDiv.innerHTML += `<ul style='list-style:none;padding:0;'>${resultsList}</ul>`;
        linkDiv.style.display = "block";
    };

    // Start URL extraction after user prompt
    const initiateExtraction = (linkDiv) => {
        setTimeout(() => {
            const userCount = Math.min(Math.max(parseInt(prompt("How many URLs to extract? (1-150)", "150")) || 150, 1), 150); // from 50 to 150
            setTimeout(() => displayResults(extractUrls(userCount), linkDiv), 1000);
        }, 1000);
    };

    // Create floating div and check for results page
    const createFloatingDiv = () => {
        const linkDiv = document.createElement('div');
        linkDiv.className = 'results-container';
        document.body.appendChild(linkDiv);
        return linkDiv;
    };

    // Add styles and results container on page load
    window.onload = () => {
        addStyles();
        const linkDiv = createFloatingDiv();
        const checkInterval = setInterval(() => {
            if (/https:\/\/facecheck\.id\/(?:[a-z]{2})?\#.+/.test(window.location.href) && document.querySelector("#fimg0")) {
                initiateExtraction(linkDiv);
                clearInterval(checkInterval);
            }
        }, 1000);
    };

})();
