import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifySession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	if (!verifySession(cookies)) {
		throw redirect(303, '/');
	}
};
