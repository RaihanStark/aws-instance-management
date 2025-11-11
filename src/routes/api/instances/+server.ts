import { json, type RequestHandler } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import { listInstances } from '$lib/server/ec2';

export const GET: RequestHandler = async ({ cookies }) => {
	// Check authentication
	if (!verifySession(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const instances = await listInstances();
		return json({ instances });
	} catch (error) {
		console.error('Error fetching instances:', error);
		return json({ error: 'Failed to fetch instances' }, { status: 500 });
	}
};
