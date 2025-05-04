require('dotenv').config(); // Load environment variables from .env file
// map-screenshot-service.js
const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const cuid = require('cuid'); // Correct import for cuid
const app = express();
const port = process.env.PORT || 3000;

// Read timeout from environment variables or use default
const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;

// Set up rate limiting if enabled
const rateLimitRequests = parseInt(process.env.RATE_LIMIT_REQUESTS) || 0;
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;

// Configure Puppeteer launch options
const puppeteerOptions = {
    executablePath: '/usr/bin/chromium', // Specify system Chromium path
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
};

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Create the public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required.');
    // Optionally exit or disable Supabase functionality
    // process.exit(1);
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const supabaseBucket = 'map-screenshots';

// Log if Supabase is configured
if (supabase) {
    console.log(`Supabase client initialized. Uploading to bucket: ${supabaseBucket}`);
} else {
    console.warn('Supabase client not initialized due to missing environment variables. Upload functionality disabled.');
}

// Implement rate limiting if enabled
if (rateLimitRequests > 0) {
    const requestCounts = {};

    app.use((req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        // Initialize or clean up old requests
        if (!requestCounts[ip]) {
            requestCounts[ip] = [];
        }

        // Remove requests outside the current window
        requestCounts[ip] = requestCounts[ip].filter(timestamp => now - timestamp < rateLimitWindowMs);

        // Check if the request limit is reached
        if (requestCounts[ip].length >= rateLimitRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit of ${rateLimitRequests} requests per ${rateLimitWindowMs / 1000} seconds exceeded`
            });
        }

        // Add the current request timestamp
        requestCounts[ip].push(now);
        next();
    });

    console.log(`Rate limiting enabled: ${rateLimitRequests} requests per ${rateLimitWindowMs / 1000} seconds`);
}

// Create the client HTML file in the public directory
const clientHtmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(clientHtmlPath)) {
    fs.writeFileSync(clientHtmlPath, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenStreetMap Screenshot Service</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
        .input-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"], input[type="number"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .tabs {
            display: flex;
            margin-bottom: 20px;
        }
        .tab {
            padding: 10px 15px;
            cursor: pointer;
            background-color: #f1f1f1;
            border: 1px solid #ddd;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
        }
        .tab.active {
            background-color: white;
            border-bottom: 1px solid white;
        }
        .tab-content {
            display: none;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 0 4px 4px 4px;
        }
        .tab-content.active {
            display: block;
        }
        #result {
            margin-top: 20px;
            text-align: center;
        }
        img {
            max-width: 100%;
            border: 1px solid #ddd;
        }
        .loading {
            text-align: center;
            padding: 20px;
            display: none;
        }
    </style>
</head>
<body>
    <h1>OpenStreetMap Screenshot Service</h1>
    
    <div class="tabs">
        <div class="tab active" onclick="switchTab('coordinates')">Search by Coordinates</div>
        <div class="tab" onclick="switchTab('location')">Search by Location</div>
    </div>
    
    <div id="coordinates-tab" class="tab-content active">
        <div class="input-group">
            <label for="latitude">Latitude:</label>
            <input type="text" id="latitude" placeholder="e.g., 59.911491">
        </div>
        
        <div class="input-group">
            <label for="longitude">Longitude:</label>
            <input type="text" id="longitude" placeholder="e.g., 10.757933">
        </div>
        
        <div class="input-group">
            <label for="zoom">Zoom Level (1-19):</label>
            <input type="number" id="zoom" min="1" max="19" value="15">
        </div>
        
        <button onclick="getMapScreenshot()">Get Screenshot</button>
    </div>
    
    <div id="location-tab" class="tab-content">
        <div class="input-group">
            <label for="location">Location Query:</label>
            <input type="text" id="location" placeholder="e.g., Nedre Slottsgate, Oslo">
        </div>
        
        <div class="input-group">
            <label for="location-zoom">Zoom Level (1-19):</label>
            <input type="number" id="location-zoom" min="1" max="19" value="15">
        </div>
        
        <button onclick="getLocationScreenshot()">Get Screenshot</button>
    </div>
    
    <div class="loading" id="loading">
        <p>Loading map screenshot...</p>
    </div>
    
    <div id="result"></div>
    
    <script>
        function switchTab(tabId) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Deactivate all tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Activate the selected tab
            document.getElementById(\`\${tabId}-tab\`).classList.add('active');
            document.querySelector(\`.tab:nth-child(\${tabId === 'coordinates' ? 1 : 2})\`).classList.add('active');
        }
        
        function getMapScreenshot() {
            const lat = document.getElementById('latitude').value;
            const lon = document.getElementById('longitude').value;
            const zoom = document.getElementById('zoom').value;
            
            if (!lat || !lon) {
                alert('Please enter both latitude and longitude');
                return;
            }
            
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').innerHTML = '';
            
            // Call to the backend service
            const url = \`/map-screenshot?lat=\${lat}&lon=\${lon}&zoom=\${zoom}\`;
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        // Try to parse error JSON
                        return response.json().then(err => { throw new Error(err.message || 'Network response was not ok'); });
                    }
                    return response.json(); // Expect JSON response
                })
                .then(data => { // data contains { imageUrl: "..." }
                    document.getElementById('loading').style.display = 'none';
                    if (!data.imageUrl) {
                        throw new Error('Image URL not found in response');
                    }
                    document.getElementById('result').innerHTML = \`
                        <h3>Map Screenshot</h3>
                        <p>Coordinates: \${lat}, \${lon} (Zoom: \${zoom})</p>
                        <img src="\${data.imageUrl}" alt="Map Screenshot"> 
                    \`;
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('result').innerHTML = \`
                        <h3>Error</h3>
                        <p>Failed to get map screenshot: \${error.message}</p>
                    \`;
                });
        }
        
        function getLocationScreenshot() {
            const query = document.getElementById('location').value;
            const zoom = document.getElementById('location-zoom').value;
            
            if (!query) {
                alert('Please enter a location query');
                return;
            }
            
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').innerHTML = '';
            
            // Call to the backend service
            const url = \`/location-screenshot?query=\${encodeURIComponent(query)}&zoom=\${zoom}\`;
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        // Try to parse error response from backend
                        return response.json().then(err => { throw new Error(err.message || 'Network response was not ok'); });
                    }
                    return response.json(); // Expect JSON response
                })
                .then(data => { // data contains { imageUrl: "..." }
                    document.getElementById('loading').style.display = 'none';
                     if (!data.imageUrl) {
                        throw new Error('Image URL not found in response');
                    }
                    document.getElementById('result').innerHTML = \`
                        <h3>Map Screenshot for Location</h3>
                        <p>Query: "\${query}" (Zoom: \${zoom})</p>
                        <img src="\${data.imageUrl}" alt="Location Screenshot">
                    \`;
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('result').innerHTML = \`
                        <h3>Error</h3>
                        <p>Failed to get location screenshot: \${error.message}</p>
                    \`;
                });
        }
    </script>
</body>
</html>`);
}

// Route to handle map screenshot requests
app.get('/map-screenshot', async (req, res) => {
    try {
        // Get latitude and longitude from query parameters
        const { lat, lon, zoom = 15, width = 1200, height = 800 } = req.query;

        // Validate parameters
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
        }

        // Launch puppeteer
        const browser = await puppeteer.launch(puppeteerOptions);

        const page = await browser.newPage();

        // Set request timeout
        await page.setDefaultNavigationTimeout(requestTimeout);

        // Set viewport size for the screenshot
        await page.setViewport({ width: parseInt(width), height: parseInt(height) });

        // Navigate to OpenStreetMap with the provided coordinates
        const mapUrl = `http://leaflet-map-viewer:3118/?zoom=${zoom}&lat=${lat}&lon=${lon}`;
        console.log("Navigating to:", mapUrl); // Log the URL for debugging
        await page.goto(mapUrl, { waitUntil: 'networkidle0' }); // Wait until network settles

        // Wait for the map container to be ready
        await page.waitForSelector('.leaflet-container', { visible: true });
        await page.waitForTimeout(2000); // Additional wait for map tiles to load

        // Take screenshot
        const screenshot = await page.screenshot({ type: 'png' });

        // Close browser
        await browser.close();

        // Check if Supabase is configured before attempting upload
        if (!supabase) {
            console.error('Supabase client not available. Cannot upload screenshot.');
            // Fallback: Send the image directly (or handle error differently)
            res.set('Content-Type', 'image/png');
            return res.send(screenshot);
        }

        // Generate a unique filename using cuid
        const fileName = `${cuid()}.png`;
        const filePath = `public/${fileName}`; // Define path within the bucket

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from(supabaseBucket)
            .upload(filePath, screenshot, {
                contentType: 'image/png',
                upsert: true, // Overwrite if file exists (optional)
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            throw new Error(`Failed to upload screenshot to Supabase: ${uploadError.message}`);
        }

        // Get the public URL for the uploaded file
        const { data: urlData } = supabase.storage.from(supabaseBucket).getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
            console.error('Could not get public URL from Supabase.');
            throw new Error('Screenshot uploaded, but failed to retrieve public URL.');
        }

        console.log('Screenshot uploaded to Supabase:', urlData.publicUrl);

        // Send the public URL as response
        res.json({ imageUrl: urlData.publicUrl });

    } catch (error) {
        console.error('Error capturing map screenshot:', error);
        res.status(500).json({ error: 'Failed to capture map screenshot', details: error.message });
    }
});

// Route to accept location query string instead of coordinates
app.get('/location-screenshot', async (req, res) => {
    try {
        // Get location query from parameters
        const { query, zoom = 15, width = 1200, height = 800 } = req.query;

        // Validate parameters
        if (!query) {
            return res.status(400).json({ error: 'Location query parameter is required' });
        }

        let browser;
        try {
            // First, use Nominatim API to convert the query to coordinates
            const encodedQuery = encodeURIComponent(query);
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;
            console.log("Querying Nominatim:", nominatimUrl); // Log Nominatim request
            const nominatimRes = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'MapScreenshotService/1.0' } // Nominatim requires a User-Agent
            });
            if (!nominatimRes.ok) {
                throw new Error(`Nominatim API request failed with status: ${nominatimRes.status}`);
            }
            const locations = await nominatimRes.json();

            if (!locations || locations.length === 0) {
                return res.status(404).json({ error: 'Location not found', message: `Could not find coordinates for query: "${query}"` });
            }

            const { lat, lon } = locations[0];
            console.log(`Found coordinates for "${query}": lat=${lat}, lon=${lon}`);

            // Now launch puppeteer to screenshot the internal viewer
            browser = await puppeteer.launch(puppeteerOptions);
            const page = await browser.newPage();

            // Set request timeout
            await page.setDefaultNavigationTimeout(requestTimeout);

            // Set viewport size for the screenshot
            await page.setViewport({ width: parseInt(width), height: parseInt(height) });

            // Navigate to the internal leaflet viewer with found coordinates
            const mapUrl = `http://leaflet-map-viewer:3118/?lat=${lat}&lon=${lon}&zoom=${zoom}`;
            console.log("Navigating to:", mapUrl); // Log the URL for debugging
            await page.goto(mapUrl, { waitUntil: 'networkidle0' }); // Wait until network settles

            // Wait for the map container to be ready in the React app
            await page.waitForSelector('.leaflet-container', { visible: true });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Take screenshot
            const screenshot = await page.screenshot({ type: 'png' });

            // Close browser
            await browser.close();
            browser = null; // Ensure browser is marked as closed

            // Check if Supabase is configured before attempting upload
            if (!supabase) {
                console.error('Supabase client not available. Cannot upload screenshot.');
                // Fallback: Send the image directly (or handle error differently)
                res.set('Content-Type', 'image/png');
                return res.send(screenshot);
            }

            // Generate a unique filename using cuid
            const fileName = `${cuid()}.png`;
            const filePath = `public/${fileName}`; // Define path within the bucket

            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from(supabaseBucket)
                .upload(filePath, screenshot, {
                    contentType: 'image/png',
                    upsert: true, // Overwrite if file exists (optional)
                });

            if (uploadError) {
                console.error('Supabase upload error:', uploadError);
                throw new Error(`Failed to upload screenshot to Supabase: ${uploadError.message}`);
            }

            // Get the public URL for the uploaded file
            const { data: urlData } = supabase.storage.from(supabaseBucket).getPublicUrl(filePath);

            if (!urlData || !urlData.publicUrl) {
                console.error('Could not get public URL from Supabase.');
                throw new Error('Screenshot uploaded, but failed to retrieve public URL.');
            }

            console.log('Screenshot uploaded to Supabase:', urlData.publicUrl);

            // Send the public URL as response
            res.json({ imageUrl: urlData.publicUrl });

        } catch (error) {
            console.error('Error capturing location screenshot:', error);
            if (browser) {
                try {
                    await browser.close(); // Attempt to close browser on error
                } catch (closeError) {
                    console.error('Error closing browser after failure:', closeError);
                }
            }
            // Ensure response is sent within the catch block
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to capture location screenshot', message: error.message });
            }
        }
    } catch (error) {
        console.error('Error capturing location screenshot:', error);
        res.status(500).json({ error: 'Failed to capture location screenshot', message: error.message });
    }
});

// Add health check endpoint for monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'map-screenshot-service',
        uptime: process.uptime()
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Map screenshot service running on port ${port}`);
});