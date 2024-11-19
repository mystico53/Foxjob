<script>

    import { getFirestore, doc, getDoc } from 'firebase/firestore';
    import CardDetails from '$lib/Jobcards/CardDetails.svelte';
    export let feedback;

    const db = getFirestore();
    let job = null;
    let loading = true;
    let error = null;
    
    // Function to get the userId from the feedback
    // Make sure it handles both cases where userId might be stored
    function getUserId() {
        // Log the feedback object to debug
        console.log('Feedback object:', feedback);
        
        // Check different possible locations of userId
        return feedback?.userId || feedback?.user?.uid || feedback?.user || null;
    }

    async function loadJobData() {
        const userId = getUserId();
        console.log('UserId from feedback:', userId);
        console.log('JobId from feedback:', feedback?.jobId);

        if (!feedback?.jobId || !userId) {
            console.log('Missing required IDs:', { jobId: feedback?.jobId, userId });
            loading = false;
            error = 'Missing required job or user information';
            return;
        }

        try {
            loading = true;
            error = null;
            
            // Construct the full path
            const fullPath = `users/${userId}/jobs/${feedback.jobId}`;
            console.log('Attempting to load from path:', fullPath);
            
            const jobRef = doc(db, 'users', userId, 'jobs', feedback.jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (jobDoc.exists()) {
                console.log('Job data found:', jobDoc.data());
                const jobData = jobDoc.data();
                
                // Process Firestore timestamp
                if (jobData.generalData?.timestamp) {
                    jobData.generalData.timestamp = jobData.generalData.timestamp;
                }

                job = {
                    id: jobDoc.id,
                    generalData: {
                        status: jobData.generalData?.status || 'read',
                        timestamp: jobData.generalData?.timestamp,
                        url: jobData.generalData?.url
                    },
                    companyInfo: {
                        name: jobData.summarized?.companyInfo?.name || 'N/A',
                        industry: jobData.summarized?.companyInfo?.industry || 'N/A',
                        companyFocus: jobData.summarized?.companyInfo?.companyFocus || 'N/A'
                    },
                    jobInfo: {
                        jobTitle: jobData.summarized?.jobInfo?.jobTitle || 'N/A',
                        remoteType: jobData.summarized?.jobInfo?.remoteType || 'N/A',
                        jobSummary: jobData.summarized?.jobInfo?.jobSummary || 'N/A'
                    },
                    compensation: jobData.compensation || 'N/A',
                    AccumulatedScores: {
                        accumulatedScore: jobData.AccumulatedScores?.accumulatedScore || 0,
                        requirementScore: jobData.AccumulatedScores?.requirementScore || 0,
                        domainScore: jobData.AccumulatedScores?.domainScore || 0,
                        hardSkillScore: jobData.AccumulatedScores?.hardSkillScore || 0,
                        verdictScore: jobData.AccumulatedScores?.verdictScore || 0
                    },
                    verdict: jobData.verdict || {
                        keyStrengths: jobData.verdict?.keyStrengths || {},
                        keyGaps: jobData.verdict?.keyGaps || {}
                    },
                    SkillAssessment: {
                        DomainExpertise: jobData.SkillAssessment?.DomainExpertise || {},
                        Hardskills: {
                            hardSkillScore: jobData.SkillAssessment?.Hardskills?.hardSkillScore || {
                                totalScore: 0,
                                summary: ''
                            },
                            ...jobData.SkillAssessment?.Hardskills || {}
                        },
                        Softskills: {
                            softSkillScore: jobData.SkillAssessment?.Softskills?.softSkillScore || {
                                totalScore: 0,
                                summary: ''
                            },
                            ...jobData.SkillAssessment?.Softskills || {}
                        }
                    },
                    matchResult: jobData.matchResult || { keySkills: [] }
                };
            } else {
                console.log('No job document found');
                error = 'Job not found';
            }
        } catch (err) {
            console.error('Error loading job:', err);
            error = 'Failed to load job data';
        } finally {
            loading = false;
        }
    }

    // Function to open job link
    function openJobLink(url) {
        if (url) {
            window.open(url, '_blank');
        }
    }

    // Handle UI state
    let isHiding = false;

    // Reload job data when feedback changes
    $: if (feedback) {
        console.log('Feedback changed, reloading job data');
        loadJobData();
    }
</script>

<div class="space-y-8"> 

    <!-- Feedback Information -->
    <div class="card p-4 variant-ghost-warning">
        <h3 class="h3 mb-4">Feedback Details</h3>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="font-bold">Type:</span>
                <span class="badge {feedback.type === 'upvote' ? 'variant-filled-success' : 'variant-filled-error'} ml-2">
                    {feedback.type}
                </span>
            </div>
            <div>
                <span class="font-bold">Date:</span>
                <span class="ml-2">
                    {feedback.timestamp?.toLocaleString() || 'N/A'}
                </span>
            </div>
            <div>
                <span class="font-bold">Job ID:</span>
                <span class="ml-2">{feedback.jobId || 'N/A'}</span>
            </div>
            <div>
                <span class="font-bold">User ID:</span>
                <span class="ml-2">{getUserId() || 'N/A'}</span>
            </div>
            <div>
                <span class="font-bold">Item:</span>
                <span class="ml-2">{feedback.itemId || 'N/A'}</span>
            </div>
            {#if feedback.reason}
                <div class="col-span-2">
                    <span class="font-bold">Reason:</span>
                    <p class="mt-2">{feedback.reason}</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Job Details -->
    {#if loading}
        <div class="flex justify-center p-4">
            <span class="loading loading-spinner loading-lg text-primary-500" />
        </div>
    {:else if error}
        <div class="alert variant-filled-error">
            <span>{error}</span>
        </div>
    {:else if job}
        <CardDetails
            {job}
            handleNext={() => {}}
            previousJob={() => {}}
            isFirstJob={true}
            isLastJob={true}
            toggleBookmark={() => {}}
            {openJobLink}
        />
    {:else}
        <div class="alert variant-filled-warning">
            <span>No associated job data found</span>
        </div>
    {/if}
</div>