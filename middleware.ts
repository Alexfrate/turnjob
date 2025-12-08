import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'it'],

  // Used when no locale matches
  defaultLocale: 'it'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(it|en)/:path*']
};
