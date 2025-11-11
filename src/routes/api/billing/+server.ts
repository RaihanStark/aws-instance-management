import { json, type RequestHandler } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import { getTotalMonthlyCost } from '$lib/server/billing';

export const GET: RequestHandler = async ({ cookies }) => {
	// Check authentication
	if (!verifySession(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { totalCost, totalHours } = await getTotalMonthlyCost();

		return json({
			totalCost,
			totalHours
		});
	} catch (error) {
		console.error('Error fetching billing data:', error);
		return json({ error: 'Failed to fetch billing data' }, { status: 500 });
	}
};
