export function formatJobDescription(text) {
	if (!text || typeof text !== 'string') return { sections: [] };

	// Helper function to ensure proper spacing after periods
	const fixPeriodSpacing = (str) => {
		return str
			.replace(/\.(?=[A-Z])/g, '. ') // Add space after period if followed by capital letter
			.replace(/\.\s{2,}/g, '. ') // Replace multiple spaces after period with single space
			.replace(/\.\s*(?=[a-z])/g, '. '); // Add space after period if followed by lowercase letter
	};

	// Clean and decode HTML entities
	let cleanText = text
		.replace(/&apos;/g, "'")
		.replace(/&#x2019;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&#x25CF;/g, '•') // Convert HTML bullet to actual bullet
		.replace(/&#x2013;/g, '–') // Convert HTML en dash to actual en dash
		.replace(/\s*Show\s+(?:more|less)\s*/gi, '')
		.replace(/:\s*(?=[a-zA-Z0-9])/g, ': ')
		.replace(/\s+/g, ' ')
		.trim();

	// Apply period spacing fix to the cleaned text
	cleanText = fixPeriodSpacing(cleanText);

	// Identify main sections
	const sectionMarkers = [
		'Business Leader',
		'People Leader',
		'Operations Leader',
		'Customer Focus',
		'The Essentials',
		'The Responsibilities',
		'Salary'
	];

	// Split text into sections
	const sections = [];
	let currentSection = { header: 'About', content: '' };
	let inBulletList = false;

	// Split into paragraphs while preserving bullet points and proper spacing
	const paragraphs = cleanText.split(/(?:(?<=\.)\s+(?=[A-Z])|(?=•))/);

	for (let i = 0; i < paragraphs.length; i++) {
		let para = paragraphs[i].trim();
		if (!para) continue;

		// Apply period spacing fix to each paragraph
		para = fixPeriodSpacing(para);

		// Check for section headers
		const markerMatch = sectionMarkers.find(
			(marker) => para.includes(marker + ':') || para.startsWith(marker)
		);

		if (markerMatch) {
			// Save previous section if it exists
			if (currentSection.content) {
				sections.push({ ...currentSection });
			}

			// Start new section
			currentSection = {
				header: markerMatch,
				content: fixPeriodSpacing(
					para
						.substring(para.indexOf(markerMatch) + markerMatch.length)
						.replace(/^[:]\s*/, '')
						.trim()
				)
			};
			inBulletList = false;
		} else {
			// Handle bullet points
			if (para.startsWith('•')) {
				if (!inBulletList) {
					currentSection.content += '\n\n'; // Add space before bullet list
					inBulletList = true;
				}
				currentSection.content += para + '\n';
			} else {
				if (inBulletList) {
					currentSection.content += '\n'; // Add space after bullet list
					inBulletList = false;
				}
				if (currentSection.content) {
					currentSection.content += '\n\n';
				}
				currentSection.content += para;
			}
		}
	}

	// Add the last section
	if (currentSection.content) {
		sections.push(currentSection);
	}

	// Post-process sections
	return {
		sections: sections.map((section) => ({
			header: section.header,
			content: fixPeriodSpacing(
				section.content
					.replace(/\n{3,}/g, '\n\n') // Remove extra newlines
					.replace(/•\s*/g, '• ') // Normalize bullet point spacing
					.replace(/\s+$/gm, '') // Remove trailing spaces
					.trim()
			)
		}))
	};
}
