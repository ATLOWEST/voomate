import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  // Old bookmarks and stale auth redirects land in the single signup/workspace route.
  redirect('/sign-up?setup=workspace');
}
