<script>
	import { onMount } from 'svelte';
	import {
		scrapeStore,
		isLoading,
		totalJobs,
		currentBatch,
		initJobListener
	} from '$lib/stores/scrapeStore';
	import { authStore } from '$lib/stores/authStore';
	import { slide } from 'svelte/transition';
	import { formatJobDescription } from './job-description-formatter';

	let jobs = [];
	let currentPage = 1;
	const rowsPerPage = 30; // Reduced for better card viewing
	let uid;
	let expandedJobId = null;

	authStore.subscribe((user) => {
		uid = user?.uid;
		if (uid) {
			console.log('🔑 User authenticated, initializing listener with uid:', uid);
			initJobListener(uid);
		}
	});

	scrapeStore.subscribe((value) => {
		// Sort jobs by final score in descending order
		jobs = value.sort((a, b) => {
			const scoreA = a.match?.finalScore ?? -1; // Use -1 for jobs without scores
			const scoreB = b.match?.finalScore ?? -1;
			return scoreB - scoreA; // Descending order
		});
		console.log('💫 Component received jobs update:', value.length);
	});

	onMount(() => {
		console.log('🏁 Component mounted, initializing listener');
		const unsubscribe = initJobListener('test_user');
		return unsubscribe;
	});

	$: totalPages = Math.ceil(jobs.length / rowsPerPage);
	$: paginatedJobs = jobs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	function previousPage() {
		if (currentPage > 1) currentPage--;
	}

	function formatDate(date) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString();
	}

	function toggleJobExpansion(jobId) {
		expandedJobId = expandedJobId === jobId ? null : jobId;
	}

	function getScoreColor(score) {
		if (score >= 8) return 'high-score';
		if (score >= 5) return 'medium-score';
		return 'low-score';
	}
</script>

<div class="container">
	<div class="stats">
		<p>Total Jobs: {$totalJobs}</p>
		<p>Current Batch: {$currentBatch}</p>
	</div>

	<div class="cards-container">
		{#each paginatedJobs as job (job.id)}
			<div class="card" class:expanded={expandedJobId === job.id}>
				<!-- Card Header - Always visible -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div class="card-header" on:click={() => toggleJobExpansion(job.id)}>
					<div class="company-info">
						{#if job.basicInfo?.companyLogo}
							<img
								src={job.basicInfo.companyLogo}
								alt="{job.basicInfo?.company} logo"
								class="company-logo"
							/>
						{/if}
						<div class="title-company">
							<h3>{job.basicInfo?.title || 'No Title'}</h3>
							<p class="company-name">{job.basicInfo?.company || 'Unknown Company'}</p>
						</div>
					</div>
					<div class="job-meta">
						<span class="location">{job.basicInfo?.location || 'Location not specified'}</span>
						<span class="posted-date">Posted: {formatDate(job.searchMetadata?.processingDate)}</span
						>
						<span class="match-score">Match: {job.embeddingMatch?.score ?? 'N/A'}</span>
						<span
							class="status"
							class:status-raw={job.processing?.status === 'raw'}
							class:status-embedded={job.processing?.status === 'embedded'}
						>
							Status: {job.processing?.status || 'N/A'}
						</span>
						<span class="job-id">ID: {job.basicInfo?.jobId || 'N/A'}</span>
					</div>
					<div class="final-score">
						<span>Final Score</span>
						<span class="score-value">{job.match?.finalScore?.toFixed(1) ?? 'N/A'}</span>
					</div>
				</div>

				<!-- Expandable Content -->
				{#if expandedJobId === job.id}
					<div class="card-content" transition:slide>
						<div class="job-details">
							<div class="detail-section">
								<h4>Job Details</h4>
								<p><strong>Employment Type:</strong> {job.details?.employmentType || 'N/A'}</p>
								<p><strong>Applicants:</strong> {job.details?.numApplicants || 'N/A'}</p>
							</div>

							<div class="match-evaluation">
								<h4>Match Evaluation</h4>
								<div class="evaluation-content">
									<div class="evaluator-scores">
										<div class="evaluators-grid">
											{#each Array.from({ length: 5 }, (_, i) => i + 1) as evaluatorNum}
												<div class="evaluator-box">
													<span class="evaluator-label">
														{#if evaluatorNum === 1}
															Industry & Experience
														{:else if evaluatorNum === 2}
															Technical Skills
														{:else if evaluatorNum === 3}
															Role Requirements
														{:else if evaluatorNum === 4}
															Career Progression
														{:else}
															Overall Potential
														{/if}
													</span>
													<span class="evaluator-score"
														>{job.match?.evaluators?.[evaluatorNum]?.score ?? 'N/A'}</span
													>
													<p class="evaluator-reasoning">
														{job.match?.evaluators?.[evaluatorNum]?.reasoning ??
															'No reasoning provided'}
													</p>
												</div>
											{/each}
										</div>
									</div>
									<div class="final-evaluation">
										<div class="final-score">
											<span>Final Score</span>
											<span class="score-value">{job.match?.finalScore?.toFixed(1) ?? 'N/A'}</span>
										</div>
										<div class="summary">
											<span>Summary</span>
											<p>{job.match?.summary ?? 'No summary available'}</p>
										</div>
									</div>
								</div>
							</div>

							<!-- New Qualities Section -->
							<div class="qualities-section">
								<h4>Key Requirements & Matches</h4>
								<div class="qualities-grid">
									{#if job.qualities}
										{#each Object.entries(job.qualities) as [key, quality]}
											{#if quality.primarySkill}
												<div class="quality-card">
													<div class="quality-header">
														<span class="quality-key">{key}</span>
														<span class="quality-criticality"
															>Criticality: {quality.criticality}</span
														>
													</div>
													<p class="quality-skill">{quality.primarySkill}</p>

													{#if quality.evidence}
														<div class="quality-evidence-section">
															<span class="evidence-label">Evidence:</span>
															<p class="quality-evidence">{quality.evidence}</p>
														</div>
													{/if}

													{#if quality.resumeText}
														<div class="quality-resume-section">
															<div class="resume-match-header">
																<span class="resume-match-label">Resume Match:</span>
																{#if quality.finalMatchScore !== undefined}
																	<span
																		class="match-score-badge {getScoreColor(
																			quality.finalMatchScore
																		)}"
																	>
																		{quality.finalMatchScore}/10
																	</span>
																{/if}
															</div>
															<p class="quality-resume">{quality.resumeText}</p>

															{#if quality.finalDecision}
																<span class="final-decision {quality.finalDecision}">
																	Selected: {quality.finalDecision === 'junior'
																		? "Junior's match"
																		: quality.finalDecision === 'senior'
																			? "Senior's match"
																			: 'No match'}
																</span>
															{/if}
														</div>
													{/if}

													{#if quality.juniorRecruiterNotes || quality.seniorRecruiterNotes || quality.headOfRecruitingNotes}
														<div class="recruiter-notes-section">
															<span class="recruiter-notes-label">Recruiter Analysis:</span>
															{#if quality.juniorRecruiterNotes}
																<div class="recruiter-note junior">
																	<div class="recruiter-header">
																		<span class="recruiter-title">Junior Recruiter:</span>
																		{#if quality.juniorMatchScore !== undefined}
																			<span
																				class="recruiter-score {getScoreColor(
																					quality.juniorMatchScore
																				)}"
																			>
																				Score: {quality.juniorMatchScore}/10
																			</span>
																		{/if}
																	</div>
																	<p class="note-content">{quality.juniorRecruiterNotes}</p>
																	{#if quality.juniorSelection}
																		<div class="selection-text">
																			<span class="selection-label">Selected text:</span>
																			<p class="selection-quote">"{quality.juniorSelection}"</p>
																		</div>
																	{/if}
																</div>
															{/if}
															{#if quality.seniorRecruiterNotes}
																<div class="recruiter-note senior">
																	<div class="recruiter-header">
																		<span class="recruiter-title">Senior Recruiter:</span>
																		{#if quality.seniorMatchScore !== undefined}
																			<span
																				class="recruiter-score {getScoreColor(
																					quality.seniorMatchScore
																				)}"
																			>
																				Score: {quality.seniorMatchScore}/10
																			</span>
																		{/if}
																	</div>
																	<p class="note-content">{quality.seniorRecruiterNotes}</p>
																	{#if quality.seniorSelection}
																		<div class="selection-text">
																			<span class="selection-label">Selected text:</span>
																			<p class="selection-quote">"{quality.seniorSelection}"</p>
																		</div>
																	{/if}
																</div>
															{/if}
															{#if quality.headOfRecruitingNotes}
																<div class="recruiter-note head">
																	<div class="recruiter-header">
																		<span class="recruiter-title">Head of Recruiting:</span>
																		{#if quality.finalMatchScore !== undefined}
																			<span
																				class="recruiter-score {getScoreColor(
																					quality.finalMatchScore
																				)}"
																			>
																				Final Score: {quality.finalMatchScore}/10
																			</span>
																		{/if}
																	</div>
																	<p class="note-content">{quality.headOfRecruitingNotes}</p>
																</div>
															{/if}
														</div>
													{/if}
												</div>
											{/if}
										{/each}
									{/if}
								</div>
							</div>

							<div class="description-section">
								<h4>Job Description</h4>
								{#if job.details?.description}
									<div class="formatted-description">
										{#each formatJobDescription(job.details.description).sections as section}
											{#if section.header}
												<h5 class="section-header">{section.header}</h5>
											{/if}
											{#if section.content}
												<p class="section-content">
													{#each section.content
														.split('\n')
														.filter((line) => line && line.trim()) as line}
														<span class="content-line">
															{line}
														</span>
													{/each}
												</p>
											{/if}
										{/each}
									</div>
								{:else}
									<p>No description available</p>
								{/if}
							</div>
							{#if job.basicInfo?.applyLink}
								<a href={job.basicInfo.applyLink} class="apply-button" target="_blank">Apply Now</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="pagination">
		<span class="pagination-info">
			Showing {Math.min((currentPage - 1) * rowsPerPage + 1, jobs.length)} - {Math.min(
				currentPage * rowsPerPage,
				jobs.length
			)} of {jobs.length} entries
		</span>
		<div class="pagination-controls">
			<button on:click={previousPage} disabled={currentPage === 1}> Previous </button>
			<span>Page {currentPage} of {totalPages}</span>
			<button on:click={nextPage} disabled={currentPage === totalPages}> Next </button>
		</div>
	</div>
</div>

<style>
	.container {
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.stats {
		margin-bottom: 1rem;
		display: flex;
		gap: 1rem;
	}

	.cards-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
		cursor: pointer;
	}

	.card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.card.expanded {
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
	}

	.card-header {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.company-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}

	.company-logo {
		width: 48px;
		height: 48px;
		border-radius: 4px;
		object-fit: contain;
	}

	.title-company {
		flex: 1;
	}

	.title-company h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #2c3e50;
	}

	.company-name {
		margin: 0.25rem 0 0;
		color: #666;
	}

	.job-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		color: #666;
		font-size: 0.9rem;
	}

	.job-id {
		font-family: monospace;
		background: #f5f5f5;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.card-content {
		padding: 1rem;
		border-top: 1px solid #eee;
		width: 100%;
		box-sizing: border-box;
	}

	.job-details {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.detail-section h4,
	.description-section h4 {
		margin: 0 0 0.5rem;
		color: #2c3e50;
	}

	.apply-button {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #0066cc;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		margin-top: 1rem;
		text-align: center;
		transition: background 0.3s ease;
	}

	.apply-button:hover {
		background: #0052a3;
	}

	.pagination {
		margin-top: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
	}

	.pagination-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	button {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: #f8f9fa;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-info {
		color: #666;
	}

	.formatted-description {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-header {
		color: #2c3e50;
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #eee;
	}

	.section-content {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		padding-right: 1rem;
	}

	.content-line {
		display: block;
		line-height: 1.5;
	}

	.content-line:first-letter {
		margin-left: 1rem;
	}

	@media (max-width: 768px) {
		.card-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.job-meta {
			align-items: flex-start;
			margin-top: 0.5rem;
		}
	}

	.qualities-section {
		margin: 1rem 0;
	}

	.qualities-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.quality-card {
		background: #f8f9fa;
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid #e9ecef;
	}

	.quality-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.quality-key {
		font-weight: 600;
		color: #495057;
	}

	.quality-criticality {
		background: #e9ecef;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		color: #495057;
	}

	.quality-skill {
		font-weight: 500;
		color: #2c3e50;
		margin: 0.5rem 0;
	}

	.quality-evidence {
		font-size: 0.9rem;
		color: #6c757d;
		margin: 0;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.qualities-grid {
			grid-template-columns: 1fr;
		}
	}

	.quality-evidence-section,
	.quality-resume-section,
	.recruiter-notes-section {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dashed #e9ecef;
	}

	.evidence-label,
	.resume-match-label,
	.recruiter-notes-label {
		display: block;
		font-weight: 600;
		font-size: 0.85rem;
		color: #495057;
		margin-bottom: 0.5rem;
	}

	.recruiter-note {
		margin-bottom: 0.75rem;
		background: #f1f3f5;
		border-radius: 4px;
		padding: 0.75rem;
	}

	.recruiter-note:last-child {
		margin-bottom: 0;
	}

	.recruiter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.recruiter-title {
		font-weight: 500;
		font-size: 0.8rem;
		color: #495057;
	}

	.note-content {
		margin: 0;
		font-size: 0.85rem;
		color: #495057;
		line-height: 1.4;
	}

	/* Different colors for different recruiters */
	.recruiter-note.junior {
		border-left: 3px solid #74c0fc; /* Junior - Light blue */
	}

	.recruiter-note.senior {
		border-left: 3px solid #4dabf7; /* Senior - Medium blue */
	}

	.recruiter-note.head {
		border-left: 3px solid #228be6; /* Head - Darker blue */
	}

	.final-decision {
		display: inline-block;
		margin-top: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.final-decision.junior {
		background-color: #e3f2fd;
		color: #0d47a1;
		border: 1px solid #bbdefb;
	}

	.final-decision.senior {
		background-color: #e8f5e9;
		color: #1b5e20;
		border: 1px solid #c8e6c9;
	}

	.final-decision.none {
		background-color: #ffebee;
		color: #b71c1c;
		border: 1px solid #ffcdd2;
	}

	.resume-match-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.resume-match-label {
		display: inline-block;
		margin-bottom: 0;
	}

	.selection-text {
		margin-top: 0.5rem;
		background-color: rgba(0, 0, 0, 0.03);
		padding: 0.5rem;
		border-radius: 4px;
	}

	.selection-label {
		font-size: 0.75rem;
		color: #6c757d;
		display: block;
		margin-bottom: 0.25rem;
	}

	.selection-quote {
		margin: 0;
		font-style: italic;
		font-size: 0.85rem;
		color: #495057;
	}

	/* Updated styles for better recruiter note visualization */
	.recruiter-note.junior {
		border-left: 3px solid #74c0fc; /* Junior - Light blue */
		background-color: #f8fbff;
	}

	.recruiter-note.senior {
		border-left: 3px solid #4dabf7; /* Senior - Medium blue */
		background-color: #f5f9fc;
	}

	.recruiter-note.head {
		border-left: 3px solid #228be6; /* Head - Darker blue */
		background-color: #f0f7ff;
	}

	/* Match score styling */
	.match-score-badge,
	.recruiter-score {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.high-score {
		background-color: #e6fcf5;
		color: #0ca678;
		border: 1px solid #96f2d7;
	}

	.medium-score {
		background-color: #fff9db;
		color: #f59f00;
		border: 1px solid #ffe066;
	}

	.low-score {
		background-color: #fff5f5;
		color: #fa5252;
		border: 1px solid #ffc9c9;
	}

	.match-evaluation {
		background: #f8f9fa;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
	}

	.match-evaluation h4 {
		margin: 0 0 1rem 0;
		color: #2c3e50;
	}

	.evaluation-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.evaluators-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.evaluator-box {
		background: white;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #e9ecef;
		display: flex;
		flex-direction: column;
	}

	.evaluator-label {
		font-size: 0.9rem;
		font-weight: 600;
		color: #495057;
		margin-bottom: 0.5rem;
	}

	.evaluator-score {
		font-size: 1.2rem;
		font-weight: 600;
		color: #2c3e50;
		margin-bottom: 0.5rem;
	}

	.evaluator-reasoning {
		font-size: 0.85rem;
		color: #6c757d;
		margin: 0;
		font-style: italic;
		line-height: 1.4;
	}

	.summary {
		background: white;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #e9ecef;
		flex: 1;
	}

	.summary span {
		font-weight: 500;
		color: #495057;
		display: block;
		margin-bottom: 0.5rem;
	}

	.summary p {
		margin: 0;
		color: #2c3e50;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.evaluators-grid {
			grid-template-columns: 1fr;
		}
	}

	.final-evaluation {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.final-score {
		background: white;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #e9ecef;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 150px;
	}

	.final-score .score-value {
		font-size: 2rem;
		font-weight: bold;
		color: #2c3e50;
	}

	.verdict {
		background: white;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #e9ecef;
		flex: 1;
	}

	@media (max-width: 768px) {
		.evaluators-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.final-evaluation {
			flex-direction: column;
		}
	}
</style>
