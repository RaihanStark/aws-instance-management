import { json, type RequestHandler } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import { getInstanceHourlyRates } from '$lib/server/pricing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check authentication
	if (!verifySession(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { instances } = await request.json();

		if (!instances || !Array.isArray(instances)) {
			return json({ error: 'instances array is required' }, { status: 400 });
		}

		const region = env.AWS_REGION || 'ap-southeast-1';
		const rates = await getInstanceHourlyRates(instances, region);

		return json({ rates });
	} catch (error) {
		console.error('Error fetching pricing:', error);
		return json({ error: 'Failed to fetch pricing' }, { status: 500 });
	}
};
