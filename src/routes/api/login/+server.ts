import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPassword, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { password } = await request.json();

		if (!password) {
			return json({ error: 'Password is required' }, { status: 400 });
		}

		if (verifyPassword(password)) {
			createSession(cookies);
			return json({ success: true });
		} else {
			return json({ error: 'Invalid password' }, { status: 401 });
		}
	} catch (error) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
