const { onRequest } = require('firebase-functions/v2/https');
const puppeteer = require('puppeteer');
const logger = require('firebase-functions/logger');

// Reusable browser instance
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
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
  }
  return browserInstance;
}

async function createPage(browser) {
  const page = await browser.newPage();
  
  // Set up page configurations
  await Promise.all([
    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
    page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }),
    page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    })
  ]);

  // Optimize resource loading
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  return page;
}

async function scrapeJobDescription(page, jobUrl) {
  try {
    await page.goto(jobUrl, { 
      waitUntil: 'domcontentloaded', // Changed from networkidle0 for faster loading
      timeout: 15000 // Reduced timeout
    });
    
    // Use a more efficient selector strategy
    const description = await page.$eval('#jobDescriptionText', el => el.innerText.trim())
      .catch(() => '');
    
    return description;
  } catch (error) {
    logger.error(`Error scraping description for ${jobUrl}:`, error);
    return '';
  }
}

async function scrapeIndeedJobs(keywords, location, maxPages = 1) {
  const browser = await getBrowser();
  const jobs = [];
  const descriptionPages = await Promise.all([...Array(3)].map(() => createPage(browser))); // Create multiple pages for parallel scraping
  let descriptionPageIndex = 0;
  
  try {
    const searchPage = await createPage(browser);
    logger.info('Browser and pages initialized');

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const start = pageNum * 10;
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&start=${start}`;
      
      await searchPage.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      // Minimal delay
      await new Promise(r => setTimeout(r, 1000));
      
      const pageJobs = await searchPage.evaluate(() => {
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
      
      // Scrape descriptions in parallel batches
      const batchSize = 3;
      for (let i = 0; i < pageJobs.length; i += batchSize) {
        const batch = pageJobs.slice(i, i + batchSize);
        const descriptionPromises = batch.map(async (job) => {
          if (!job.jobUrl) return '';
          
          // Rotate through description pages
          const page = descriptionPages[descriptionPageIndex];
          descriptionPageIndex = (descriptionPageIndex + 1) % descriptionPages.length;
          
          return scrapeJobDescription(page, job.jobUrl);
        });
        
        const descriptions = await Promise.all(descriptionPromises);
        batch.forEach((job, index) => {
          job.description = descriptions[index];
        });
        
        // Small delay between batches
        await new Promise(r => setTimeout(r, 500));
      }
      
      jobs.push(...pageJobs);
      
      // Check for captcha
      const hasCaptcha = await searchPage.$('.g-recaptcha');
      if (hasCaptcha) {
        logger.warn('Captcha detected - stopping pagination');
        break;
      }
    }

    await searchPage.close();

  } catch (error) {
    logger.error('Scraping error:', error);
    throw error;
  } finally {
    // Close description pages
    await Promise.all(descriptionPages.map(page => page.close()));
    logger.info('Scraping completed', { totalJobs: jobs.length });
  }
  
  return jobs;
}

// Close browser on function termination
process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
});

exports.searchJobs = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 300
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
    logger.error('Function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});