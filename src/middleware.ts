import { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

// Map app locale codes to Auth0/BCP 47 locale codes
const localeMap: Record<string, string> = {
  en: 'en',
  es: 'es-419',
  zh: 'zh-CN',
  ko: 'ko',
  hi: 'hi',
  ru: 'ru',
};

export async function middleware(request: NextRequest) {
  // Inject ui_locales into /auth/login requests so Auth0's Universal Login
  // page renders in the user's chosen language
  if (request.nextUrl.pathname === '/auth/login' && !request.nextUrl.searchParams.has('ui_locales')) {
    const locale = request.cookies.get('NEXT_LOCALE')?.value;
    const uiLocale = locale && localeMap[locale];
    if (uiLocale) {
      const url = request.nextUrl.clone();
      url.searchParams.set('ui_locales', uiLocale);
      return auth0.middleware(new NextRequest(url, request));
    }
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};