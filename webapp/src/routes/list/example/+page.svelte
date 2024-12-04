<script>
	import { goto } from '$app/navigation';

	function goBack() {
		// Use browser's history to go back
		window.history.back();
	}
</script>

<div class="container mx-auto px-4 py-8">
	<button class="btn variant-filled-surface mb-6" on:click={goBack}> ← Back </button>

	<div class="card p-6">
		<h1 class="h1 mb-4 pb-4">Scan your first job description now</h1>

		<div class="prose">
			<div class="mb-6">
				<h2 class="mb-2 text-2xl font-bold">President of the United States of America</h2>
				<p class="font-bold text-gray-600">
					Employer: The People of the United States of America
					<br />
					Location: 1600 Pennsylvania Avenue, Washington, D.C. 20500
					<br />
					Department: Executive Branch
					<br />
					Term: 4 years (renewable once)
					<br />
					Compensation: $400,000 annually
				</p>
			</div>

			<p class="mb-6">
				The People of the United States seek an exceptional leader to serve as the next President of
				the United States and Chief Executive of the federal government. This position represents
				the highest office in the American political system and demands an individual of
				extraordinary capability, unimpeachable integrity, and unprecedented diplomatic acumen. The
				successful candidate will be responsible for leading the world's largest economy and most
				powerful military while navigating complex domestic and international challenges.
			</p>

			<h3 class="mb-2 font-bold">Primary Responsibilities:</h3>
			<ul class="mb-6 list-disc pl-6">
				<li>
					Serve as Commander in Chief of the U.S. Armed Forces and direct national security strategy
				</li>
				<li>Develop and implement comprehensive domestic and foreign policy initiatives</li>
				<li>
					Nominate federal judges, including Supreme Court Justices, and key executive officials
				</li>
				<li>Negotiate and execute treaties with foreign nations</li>
				<li>Present annual budget proposals and State of the Union addresses to Congress</li>
				<li>Lead federal response to national emergencies and natural disasters</li>
				<li>Shape legislative agenda and work with Congress to pass crucial legislation</li>
				<li>Represent the nation at international summits and diplomatic functions</li>
			</ul>

			<h3 class="mb-2 font-bold">Required Qualifications:</h3>
			<ul class="mb-6 list-disc pl-6">
				<li>Natural-born U.S. citizen aged 35 or older</li>
				<li>14+ years residency within the United States</li>
				<li>Exceptional leadership abilities and strategic decision-making skills</li>
				<li>Mastery of constitutional law, international relations, and economic policy</li>
				<li>Demonstrated experience in crisis management and conflict resolution</li>
				<li>Superior diplomatic skills and ability to build international coalitions</li>
				<li>Comprehensive understanding of military strategy and national security</li>
				<li>Proven track record of successful public policy implementation</li>
				<li>Extraordinary communication and public speaking abilities</li>
			</ul>

			<h3 class="mb-2 font-bold">Preferred Qualifications:</h3>
			<ul class="mb-6 list-disc pl-6">
				<li>Previous executive experience in government or large organizations</li>
				<li>Advanced degree in law, public policy, or related field</li>
				<li>Multilingual capabilities for international diplomacy</li>
				<li>Deep understanding of emerging technologies and their policy implications</li>
				<li>Experience managing large-scale budgets and complex organizations</li>
			</ul>

			<h3 class="mb-2 font-bold">Benefits Package:</h3>
			<ul class="mb-6 list-disc pl-6">
				<li>Executive residence in the White House with full staff</li>
				<li>Access to Air Force One and secure transportation</li>
				<li>Comprehensive security detail (Secret Service protection)</li>
				<li>Presidential pension and lifetime healthcare post-service</li>
				<li>Access to Presidential retreat at Camp David</li>
				<li>State-of-the-art medical facilities and personal physician</li>
				<li>Presidential library and museum establishment opportunity</li>
			</ul>

			<p class="mt-6 text-sm">
				The role of President requires extraordinary dedication, resilience, and commitment to
				public service. The successful candidate must be prepared to face unprecedented challenges
				while maintaining the highest standards of ethical conduct and democratic principles. This
				position demands 24/7 availability and the ability to make critical decisions under extreme
				pressure.
			</p>

			<p class="mt-4 text-sm font-semibold">
				Selection Process: Candidates must succeed in primary elections, secure party nomination,
				and win the general election through the Electoral College system. The position is subject
				to the democratic process and constitutional requirements.
			</p>
		</div>
	</div>
</div>
