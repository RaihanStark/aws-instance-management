import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifySession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	// Redirect to dashboard if already authenticated
	if (verifySession(cookies)) {
		throw redirect(303, '/dashboard');
	}
};
