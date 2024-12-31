const { onRequest } = require('firebase-functions/v2/https');
const puppeteer = require('puppeteer');
const logger = require('firebase-functions/logger');

async function scrapeJobDescription(page, jobUrl) {
  try {
    await page.goto(jobUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    const description = await page.evaluate(() => {
      const descriptionElement = document.querySelector('#jobDescriptionText');
      return descriptionElement ? descriptionElement.innerText.trim() : '';
    });
    
    return description;
  } catch (error) {
    logger.error(`Error scraping description for ${jobUrl}:`, error);
    return '';
  }
}

async function scrapeIndeedJobs(keywords, location, maxPages = 1) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });
  
  const jobs = [];
  
  try {
    const page = await browser.newPage();
    logger.info('Browser and page initialized');
    
    // Enhanced evasion setup
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    
    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
    
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
      
      logger.info(`Navigating to page ${pageNum + 1}`, { url });
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Random delay between 2-3 seconds
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      
      // Debug page content
      const pageContent = await page.evaluate(() => ({
        title: document.title,
        jobCardsCount: document.querySelectorAll('.job_seen_beacon').length,
        bodyPreview: document.body.innerText.slice(0, 200)
      }));
      logger.info('Page content:', pageContent);
      
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

      logger.info(`Found ${pageJobs.length} jobs on page ${pageNum + 1}`);
      
      // Get descriptions for each job
      for (let i = 0; i < pageJobs.length; i++) {
        const job = pageJobs[i];
        if (job.jobUrl) {
          logger.info(`Fetching description for job ${i + 1}/${pageJobs.length}: ${job.title}`);
          job.description = await scrapeJobDescription(page, job.jobUrl);
          // Add a small delay between job description scrapes
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        }
      }
      
      jobs.push(...pageJobs);
      
      // Check for captcha
      const hasCaptcha = await page.$('.g-recaptcha') !== null;
      if (hasCaptcha) {
        logger.warn('Captcha detected - stopping pagination');
        break;
      }
    }

  } catch (error) {
    logger.error('Scraping error:', { 
      error: error.message, 
      errorStack: error.stack 
    });
    throw error;
  } finally {
    await browser.close();
    logger.info('Browser closed. Scraping completed', { 
      totalJobs: jobs.length,
      searchParams: { keywords, location }
    });
  }
  
  return jobs;
}

exports.searchJobs = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 300
}, async (req, res) => {
  try {
    logger.info('Received search request', { 
      query: req.query,
      userAgent: req.headers['user-agent']
    });

    const { keywords, location } = req.query;

    if (!keywords || !location) {
      logger.warn('Missing parameters', { keywords, location });
      res.status(400).json({ error: 'Missing required parameters: keywords or location' });
      return;
    }

    const jobs = await scrapeIndeedJobs(keywords.toString(), location.toString());
    
    logger.info('Search completed', {
      jobsFound: jobs.length,
      sampleJob: jobs[0] || 'No jobs found'
    });
    
    res.json({ jobs });
    
  } catch (error) {
    logger.error('Function error:', { 
      error: error.message,
      errorStack: error.stack,
      query: req.query 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});