import { json, type RequestHandler } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import { stopInstance } from '$lib/server/ec2';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check authentication
	if (!verifySession(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { instanceId } = await request.json();

		if (!instanceId) {
			return json({ error: 'Instance ID is required' }, { status: 400 });
		}

		await stopInstance(instanceId);
		return json({ success: true });
	} catch (error) {
		console.error('Error stopping instance:', error);
		return json({ error: 'Failed to stop instance' }, { status: 500 });
	}
};
