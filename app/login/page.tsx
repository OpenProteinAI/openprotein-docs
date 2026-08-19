import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { getPublicSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in with your OpenProtein.AI platform account.',
};

export default async function LoginPage() {
  if (await getPublicSession()) redirect('/');

  return (
    <main className="flex min-h-[62vh] flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="OpenProtein.AI Guide" className="mx-auto mb-7 block w-fit">
          <img src="/logo.svg" alt="" width={34} height={34} className="h-[34px] w-auto" />
        </Link>

        <div className="rounded-[0.75em] border border-fd-border bg-fd-card p-6">
          <h1 className="text-xl font-semibold tracking-[-0.3px] text-fd-foreground">Log in</h1>
          <p className="mt-1.5 mb-6 text-sm text-fd-muted-foreground">
            Use the same username and password as the OpenProtein.AI web app.
          </p>
          <LoginForm />
        </div>

        <p className="mt-5 text-center text-sm text-fd-muted-foreground">
          No access yet?{' '}
          <a
            href="https://openprotein-ai.webflow.io/early-access-form"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-fd-primary underline-offset-4 hover:underline"
          >
            Request early access
          </a>
        </p>
      </div>
    </main>
  );
}
