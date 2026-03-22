import { Auth0Client } from '@auth0/nextjs-auth0/server';

const configuredAppBaseUrl = process.env.APP_BASE_URL;
const invalidProductionAppBaseUrl =
	process.env.NODE_ENV === 'production' && configuredAppBaseUrl?.includes('localhost');

const appBaseUrl = invalidProductionAppBaseUrl
	? undefined
	: configuredAppBaseUrl ??
		(process.env.NODE_ENV === 'production' ? undefined : process.env.AUTH0_BASE_URL);

if (process.env.NODE_ENV === 'production') {
	if (!process.env.APP_BASE_URL && process.env.AUTH0_BASE_URL) {
		console.warn(
			'AUTH0_BASE_URL is deprecated in Auth0 Next.js SDK v4. Set APP_BASE_URL to your deployed origin.'
		);
	}

	if (invalidProductionAppBaseUrl) {
		console.warn(
			'APP_BASE_URL points to localhost in production. Falling back to request host inference; set APP_BASE_URL to your public deployed origin.'
		);
	}
}

export const auth0 = new Auth0Client({
	...(appBaseUrl ? { appBaseUrl } : {}),
});