import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Verify if the provided password matches the environment password
 */
export function verifyPassword(password: string): boolean {
	return password === env.AUTH_PASSWORD;
}

/**
 * Create a session by setting an HTTP-only cookie
 */
export function createSession(cookies: Cookies): void {
	// Create a simple session token (timestamp-based)
	const sessionToken = Buffer.from(
		JSON.stringify({
			created: Date.now(),
			secret: env.SESSION_SECRET
		})
	).toString('base64');

	cookies.set(SESSION_COOKIE_NAME, sessionToken, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: SESSION_MAX_AGE
	});
}

/**
 * Verify if the session is valid
 */
export function verifySession(cookies: Cookies): boolean {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);

	if (!sessionToken) {
		return false;
	}

	try {
		const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString());

		// Check if session secret matches
		if (session.secret !== env.SESSION_SECRET) {
			return false;
		}

		// Check if session hasn't expired
		const sessionAge = (Date.now() - session.created) / 1000;
		if (sessionAge > SESSION_MAX_AGE) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * Destroy the session by removing the cookie
 */
export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, {
		path: '/'
	});
}
