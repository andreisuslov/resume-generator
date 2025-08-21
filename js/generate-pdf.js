// generate-pdf.js

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { createServer } = require('http-server');

(async () => {
    // Define the server and port
    const port = 8080;
    // Serve files from the parent directory to access index.html
    const server = createServer({ root: path.join(__dirname, '..') });

    // Start the server in the background
    await new Promise(resolve => server.listen(port, 'localhost', resolve));
    console.log(`🚀 Local server started at http://localhost:${port}`);

    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        const pageUrl = `http://localhost:${port}/index.html`;

        console.log(`Navigating to ${pageUrl}...`);
        await page.goto(pageUrl, {
            waitUntil: 'networkidle0'
        });
        console.log('Page loaded. Waiting for dynamic content to finish rendering...');

        // Wait for the signal from script.js that all resizing logic is complete
        await page.waitForSelector('body[data-rendering-complete="true"]', {
            timeout: 15000 // 15-second timeout
        });
        console.log('Content rendering complete.');

        console.log('Applying print media styles for PDF generation...');
        await page.emulateMediaType('print');
        // -------------------------------------------------------------------------

        console.log('Generating PDF...');

        // Read the YAML file to dynamically name the output PDF
        const yamlText = fs.readFileSync('resume-data.yaml', 'utf8');
        const resumeData = yaml.load(yamlText);
        const resumeName = resumeData.name;

        if (!resumeName) {
            throw new Error('Could not find "name" field in resume-data.yaml to name the file.');
        }

        // Create the output directory if it doesn't exist
        const dir = './generated-content';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        // Define the full path for the generated PDF
        const pdfPath = path.join(dir, `${resumeName} Resume.pdf`);

        // Generate the PDF from the page's print-styled layout
        // Note: 'format' and 'margin' are no longer needed here because they
        // are now controlled by the '@page' rule in your CSS file.
        await page.pdf({
            path: pdfPath,
            printBackground: true // Ensures any background colors specified in the CSS are included
        });

        console.log(`✅ PDF successfully generated at: ${pdfPath}`);

    } catch (err) {
        // Log any errors that occur during the process
        console.error("An error occurred during PDF generation:", err);
        process.exit(1); // Exit with an error code to signal failure

    } finally {
        // Ensure the browser and server are always closed, even if errors occur
        if (browser) {
            await browser.close();
        }
        server.close();
        console.log('Server and browser closed.');
    }
})();
