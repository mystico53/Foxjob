const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const puppeteer = require('puppeteer');

// Set global options for all functions
setGlobalOptions({
  maxInstances: 2,
  timeoutSeconds: 120,
  memory: '1GiB',
});

async function scrapeIndeedJobs(keywords, location, maxPages = 1) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const jobs = [];
  
  try {
    const page = await browser.newPage();
    
    // Basic evasion setup
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Optimize performance
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const start = pageNum * 10;
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&start=${start}`;
      
      await page.goto(url, { waitUntil: 'networkidle0' });
      // Random delay between 2-3 seconds
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      
      const pageJobs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.job_seen_beacon')).map(card => ({
          title: card.querySelector('.jobTitle')?.innerText?.trim() || '',
          company: card.querySelector('.companyName')?.innerText?.trim() || '',
          location: card.querySelector('.companyLocation')?.innerText?.trim() || '',
          salary: card.querySelector('.salary-snippet')?.innerText?.trim() || null,
          snippet: card.querySelector('.job-snippet')?.innerText?.trim() || '',
          jobUrl: card.querySelector('a.jcs-JobTitle')?.href || '',
          scrapedAt: new Date().toISOString()
        }));
      });
      
      jobs.push(...pageJobs);
      
      // Check for captcha
      const hasCaptcha = await page.$('.g-recaptcha') !== null;
      if (hasCaptcha) {
        console.log('Captcha detected - stopping pagination');
        break;
      }
    }

  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  return jobs;
}

exports.searchJobs = onRequest({
  cors: true  // Enable CORS for frontend access
}, async (req, res) => {
  try {
    const { keywords, location } = req.query;

    if (!keywords || !location) {
      res.status(400).json({ error: 'Missing required parameters: keywords or location' });
      return;
    }

    const jobs = await scrapeIndeedJobs(keywords.toString(), location.toString());
    res.json({ jobs });
    
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});