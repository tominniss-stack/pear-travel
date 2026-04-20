'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If user is logged in, onboarding is not complete, and not already on welcome page
    if (session?.user && session.user.onboardingComplete === false && pathname !== '/welcome') {
      router.push('/welcome');
    }
  }, [session, pathname, router]);

  return <>{children}</>;
}
