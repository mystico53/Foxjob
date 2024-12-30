const { onRequest } = require('firebase-functions/v2/https');
const puppeteer = require('puppeteer');
const logger = require('firebase-functions/logger');

async function scrapeJobDescription(page, jobUrl, jobTitle) {
  try {
    logger.info('Starting to scrape description', { jobUrl, jobTitle });
    await page.goto(jobUrl, { waitUntil: 'networkidle0' });
    
    const delay = 2000 + Math.random() * 1000;
    logger.debug(`Waiting ${delay.toFixed(0)}ms before scraping description`);
    await new Promise(r => setTimeout(r, delay));
    
    const description = await page.evaluate(() => {
      const descriptionElement = document.querySelector('#jobDescriptionText');
      return descriptionElement ? descriptionElement.innerText.trim() : '';
    });
    
    const descriptionLength = description.length;
    logger.info('Successfully scraped description', { 
      jobTitle, 
      descriptionLength,
      previewText: description.substring(0, 100) + '...'
    });
    
    return description;
  } catch (error) {
    logger.error('Error scraping description', { 
      jobUrl, 
      jobTitle, 
      error: error.message,
      errorStack: error.stack
    });
    return '';
  }
}

async function scrapeIndeedJobs(keywords, location, maxPages = 1) {
  logger.info('Starting job search', { keywords, location, maxPages });
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const jobs = [];
  let totalJobsScraped = 0;
  
  try {
    const page = await browser.newPage();
    logger.info('Browser and page initialized');
    
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
      
      logger.info(`Scraping page ${pageNum + 1}`, { url });
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      const delay = 2000 + Math.random() * 1000;
      logger.debug(`Waiting ${delay.toFixed(0)}ms before scraping page`);
      await new Promise(r => setTimeout(r, delay));
      
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
      
      // Scrape descriptions for each job
      logger.info(`Starting to scrape descriptions for ${pageJobs.length} jobs`);
      for (let i = 0; i < pageJobs.length; i++) {
        const job = pageJobs[i];
        logger.info(`Scraping description ${i + 1}/${pageJobs.length}`, {
          jobTitle: job.title,
          company: job.company
        });
        
        if (job.jobUrl) {
          job.description = await scrapeJobDescription(page, job.jobUrl, job.title);
          // Add a small delay between job description scrapes
          const delay = 1000 + Math.random() * 1000;
          logger.debug(`Waiting ${delay.toFixed(0)}ms before next description`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
      
      jobs.push(...pageJobs);
      totalJobsScraped += pageJobs.length;
      
      // Check for captcha
      const hasCaptcha = await page.$('.g-recaptcha') !== null;
      if (hasCaptcha) {
        logger.warn('Captcha detected - stopping pagination');
        break;
      }
      
      logger.info(`Completed page ${pageNum + 1}. Total jobs so far: ${totalJobsScraped}`);
    }

  } catch (error) {
    logger.error('Scraping error', { 
      error: error.message, 
      errorStack: error.stack,
      totalJobsScraped
    });
    throw error;
  } finally {
    await browser.close();
    logger.info('Browser closed. Scraping completed', { 
      totalJobsScraped,
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
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const { keywords, location } = req.query;

    if (!keywords || !location) {
      logger.warn('Missing parameters', { keywords, location });
      res.status(400).json({ error: 'Missing required parameters: keywords or location' });
      return;
    }

    const startTime = Date.now();
    const jobs = await scrapeIndeedJobs(keywords.toString(), location.toString());
    const duration = Date.now() - startTime;
    
    logger.info('Search completed successfully', {
      jobsFound: jobs.length,
      durationSeconds: duration / 1000,
      searchParams: { keywords, location }
    });
    
    res.json({ jobs });
    
  } catch (error) {
    logger.error('Function error', { 
      error: error.message,
      errorStack: error.stack,
      query: req.query
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});