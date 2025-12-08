import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  let user;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (error) {
    console.error('Error fetching user:', (error as Error).message);
  }

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/register', '/auth/callback'];
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/api/auth')
  );

  // API routes that don't need onboarding check
  const isApiRoute = pathname.startsWith('/api/');

  // Protect dashboard and onboarding routes
  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Check onboarding status for dashboard routes
  if (user && pathname.startsWith('/dashboard')) {
    try {
      // Usa limit(1) invece di single() per supportare multi-azienda
      const { data: aziende } = await supabase
        .from('Azienda')
        .select('completato_onboarding')
        .eq('super_admin_email', user.email)
        .limit(1);

      // Se ha almeno un'azienda con onboarding completato, può accedere
      const hasCompletedOnboarding = aziende && aziende.length > 0 && aziende[0].completato_onboarding;

      if (!hasCompletedOnboarding) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // If error fetching, redirect to onboarding
      console.error('Error checking onboarding status:', error);
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // If user completed onboarding and tries to access /onboarding
  // Allow access if ?newCompany=true (creating additional company)
  if (user && pathname === '/onboarding') {
    const isNewCompany = request.nextUrl.searchParams.get('newCompany') === 'true';

    if (!isNewCompany) {
      try {
        const { data: aziende } = await supabase
          .from('Azienda')
          .select('completato_onboarding')
          .eq('super_admin_email', user.email)
          .limit(1);

        // Se ha già almeno un'azienda completata e non sta creando una nuova, redirect a dashboard
        if (aziende && aziende.length > 0 && aziende[0].completato_onboarding) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      } catch {
        // Continue to onboarding if error
      }
    }
    // Se isNewCompany=true, permetti l'accesso all'onboarding
  }

  return supabaseResponse;
}
