const { onRequest } = require('firebase-functions/v2/https');
const puppeteer = require('puppeteer');
const logger = require('firebase-functions/logger');

const jobTypeMap = {
  fulltime: { jt: 'fulltime', sc: 'FCGTU' },
  parttime: { jt: 'parttime', sc: 'PTPTT' },
  contract: { jt: 'contract', sc: 'NJXCK' },
  temporary: { jt: 'temporary', sc: 'TEGKS' },
  internship: { jt: 'internship', sc: 'KO5EV' }
};

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
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
  }
  return browserInstance;
}

async function createPage(browser) {
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
    
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  
  await Promise.all([
    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
    page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }),
    page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    })
  ]);

  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  return page;
}

async function handleCloudflareChallenge(page) {
  try {
    await page.waitForFunction(() => {
      return !document.querySelector('#challenge-running') &&
             !document.querySelector('#cf-spinner');
    }, { timeout: 30000 });
    
    await new Promise(r => setTimeout(r, 2000));
    
    return true;
  } catch (error) {
    logger.error('Error handling Cloudflare challenge:', error);
    return false;
  }
}

async function scrapeJobDescription(page, jobUrl) {
  try {
    await page.goto(jobUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    const description = await page.$eval('#jobDescriptionText', el => el.innerText.trim())
      .catch(() => '');
    
    return description;
  } catch (error) {
    logger.error(`Error scraping description for ${jobUrl}:`, error);
    return '';
  }
}

async function scrapeIndeedJobs(searchParams, maxPages = 1) {
  const browser = await getBrowser();
  const jobs = [];
  const descriptionPages = await Promise.all([...Array(3)].map(() => createPage(browser)));
  let descriptionPageIndex = 0;
  
  try {
    const searchPage = await createPage(browser);
    logger.info('Browser and pages initialized');

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const start = pageNum * 10;
      const url = new URL('https://www.indeed.com/jobs');
      
      url.searchParams.set('q', searchParams.keywords);
      url.searchParams.set('l', searchParams.location || '');
      url.searchParams.set('start', start.toString());
      url.searchParams.set('from', 'searchOnHP');

      if (searchParams.salary) {
        url.searchParams.set('sal', searchParams.salary);
      }

      if (searchParams.datePosted) {
        url.searchParams.set('fromage', searchParams.datePosted);
      }

      if (searchParams.experience) {
        url.searchParams.set('explvl', searchParams.experience);
      }

      if (searchParams.radius) {
        url.searchParams.set('radius', searchParams.radius);
      }

      if (searchParams.jobType && jobTypeMap[searchParams.jobType]) {
        const { jt, sc } = jobTypeMap[searchParams.jobType];
        url.searchParams.set('jt', jt);
        url.searchParams.set('sc', `0kf:attr(${sc});`);
      }

      if (searchParams.remote) {
        const currentSc = url.searchParams.get('sc') || '';
        const remoteSc = '0kf:attr(DSQF7)';
        url.searchParams.set('sc', currentSc ? `${currentSc}${remoteSc};` : `${remoteSc};`);
        url.searchParams.set('rbl', 'Remote');
      }
      
      logger.info('Searching URL:', url.toString());
      
      await searchPage.goto(url.toString(), { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const passedChallenge = await handleCloudflareChallenge(searchPage);
      if (!passedChallenge) {
        logger.error('Failed to pass Cloudflare challenge');
        break;
      }

      await Promise.race([
        searchPage.waitForSelector('.job_seen_beacon'),
        searchPage.waitForSelector('.tapItem'),
        searchPage.waitForSelector('[data-testid="jobsearch-JobCard"]'),
        new Promise(r => setTimeout(r, 10000))
      ]);
      
      const pageJobs = await searchPage.evaluate(() => {
        function getTextContent(element, selector) {
          const el = element.querySelector(selector);
          return el ? el.innerText.trim() : '';
        }

        const selectors = [
          '.job_seen_beacon',
          '.tapItem',
          '[data-testid="jobsearch-JobCard"]'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return Array.from(elements).map(card => ({
              title: getTextContent(card, '[data-testid="jobTitle"], .jobTitle'),
              company: getTextContent(card, '[data-testid="company-name"], .companyName'),
              location: getTextContent(card, '[data-testid="text-location"], .companyLocation'),
              salary: getTextContent(card, '[data-testid="salary-snippet"], .salary-snippet') || null,
              snippet: getTextContent(card, '[data-testid="job-snippet"], .job-snippet'),
              jobUrl: card.querySelector('a[data-testid="job-title-link"], a.jcs-JobTitle')?.href || '',
              scrapedAt: new Date().toISOString()
            }));
          }
        }
        return [];
      });

      logger.info(`Found ${pageJobs.length} jobs on page ${pageNum + 1}`);
      
      if (pageJobs.length === 0) {
        const html = await searchPage.content();
        logger.warn('No jobs found. Page content length:', html.length);
      }

      const batchSize = 3;
      for (let i = 0; i < pageJobs.length; i += batchSize) {
        const batch = pageJobs.slice(i, i + batchSize);
        const descriptionPromises = batch.map(async (job) => {
          if (!job.jobUrl) return '';
          
          const page = descriptionPages[descriptionPageIndex];
          descriptionPageIndex = (descriptionPageIndex + 1) % descriptionPages.length;
          
          return scrapeJobDescription(page, job.jobUrl);
        });
        
        const descriptions = await Promise.all(descriptionPromises);
        batch.forEach((job, index) => {
          job.description = descriptions[index];
        });
        
        await new Promise(r => setTimeout(r, 500));
      }
  
      jobs.push(...pageJobs);
      
      const hasCaptcha = await searchPage.$('.g-recaptcha');
      if (hasCaptcha) {
        logger.warn('Captcha detected - stopping pagination');
        break;
      }

      await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    }

    await searchPage.close();

  } catch (error) {
    logger.error('Scraping error:', error);
    throw error;
  } finally {
    await Promise.all(descriptionPages.map(page => page.close()));
    logger.info('Scraping completed', { totalJobs: jobs.length });
  }
  
  return jobs;
}

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
    const {
      keywords,
      location,
      jobType,
      datePosted,
      radius,
      remote,
      salary,
      experience
    } = req.query;

    if (!keywords) {
      res.status(400).json({ error: 'Missing required parameter: keywords' });
      return;
    }

    const searchParams = {
      keywords: keywords.toString(),
      location: location?.toString() || '',
      jobType: jobType?.toString(),
      datePosted: datePosted?.toString(),
      radius: radius?.toString(),
      remote: remote === 'true',
      salary: salary?.toString(),
      experience: experience?.toString()
    };

    logger.info('Search parameters:', searchParams);

    const jobs = await scrapeIndeedJobs(searchParams);
    res.json({ jobs });
    
  } catch (error) {
    logger.error('Function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});