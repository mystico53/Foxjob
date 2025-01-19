import { writable } from 'svelte/store'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

export const scrapeStore = writable([])
export const isLoading = writable(false)
export const totalJobs = writable(0)
export const currentBatch = writable(0)

function cleanDescription(text) {
  if (!text) return '';
  
  // Remove HTML entities
  text = text.replace(/&#\d+;/g, function(match) {
    return String.fromCharCode(match.match(/\d+/)[0]);
  });
  
  // Add line breaks before sections
  const sections = [
    'Job Summary:', 
    'About the job',
    'Responsibilities:', 
    'Requirements:', 
    'Qualifications:',
    'Minimum Qualifications:',
    'Preferred Qualifications:',
    'Benefits:',
    'Additional Information:'
  ];
  
  sections.forEach(section => {
    text = text.replace(new RegExp(`(${section})`, 'g'), '\n\n$1');
  });

  return text.replace(/\n\s*\n/g, '\n\n').trim();
}

function formatSalaryDisplay(salaryData) {
  if (!salaryData) return null;
  
  const { min, max, currency = 'USD', period = 'YEAR' } = salaryData;
  const formatNumber = num => num?.toLocaleString('en-US');
  
  if (min && max) {
    return `${currency} ${formatNumber(min)} - ${formatNumber(max)} per ${period.toLowerCase()}`;
  } else if (min) {
    return `${currency} ${formatNumber(min)}+ per ${period.toLowerCase()}`;
  } else if (max) {
    return `Up to ${currency} ${formatNumber(max)} per ${period.toLowerCase()}`;
  }
  
  return null;
}

function extractSchedule(description) {
  if (!description) return null;
  
  // Enhanced schedule pattern matching
  const schedulePatterns = [
    /(?:Schedule|Hours|Shift):\s*([^\.]+)/i,
    /(?:This is a|Position is)\s*(full-time|part-time|temporary|contract)/i,
    /(\d{1,2}\s*-\s*\d{1,2}\s*hours?\s*(?:per|a)\s*week)/i
  ];
  
  for (const pattern of schedulePatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

scrapeStore.subscribe(value => {
  console.log('🔄 scrapeStore updated:', value.length, 'jobs')
})

export function initJobListener(db, uid) {
  console.log('🎯 1. Initializing job listener for uid:', uid);
  if (!uid) {
    console.warn('❌ No uid provided to initJobListener');
    return;
  }

  try {
    const scrapedjobsRef = collection(db, 'users', uid, 'scrapedjobs');
    const q = query(scrapedjobsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📥 Snapshot received:', {
          empty: snapshot.empty,
          size: snapshot.size
        });

        if (snapshot.empty) {
          scrapeStore.set([]);
          currentBatch.set(0);
          return;
        }

        const jobs = snapshot.docs
          .filter(doc => doc.data().verificationStatus === 'Success')
          .map(doc => {
            const data = doc.data();
            console.log('Raw job data:', data);
            
            const salaryData = data.details?.salary;
            const description = cleanDescription(data.details?.description?.[0]);
            const schedule = extractSchedule(description);
            
            return {
              // Basic Info
              id: doc.id,
              job_id: data.basicInfo?.job_id,
              title: data.basicInfo?.job_title,
              company: data.basicInfo?.company_name,
              jobUrl: data.basicInfo?.job_link,
              
              // Location
              location: data.details?.location?.[0],
              
              // Schedule
              schedule,
              
              // Salary
              salary: salaryData ? {
                raw: salaryData,
                displayText: formatSalaryDisplay(salaryData)
              } : null,
              
              // Description
              description: description,
              
              // Employment Details
              employmentType: data.details?.employmentType?.[0],
              
              // Dates and Metadata
              datePosted: data.details?.datePosted,
              validThrough: data.details?.validThrough,
              createdAt: data.createdAt,
              lastUpdated: data.lastUpdated
            };
          });

        console.log('✨ Processed jobs:', jobs);
        
        scrapeStore.set(jobs);
        totalJobs.set(jobs.length);
        currentBatch.set(jobs.length);
      },
      (error) => {
        console.error('🚨 Firestore listener error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('💥 Error setting up Firestore listener:', error);
    return () => {};
  }
}

export function clearScrapeStore() {
  console.log('🧹 Clearing scrape store');
  scrapeStore.set([]);
  totalJobs.set(0);
  currentBatch.set(0);
  isLoading.set(false);
}