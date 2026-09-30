import { getUserBusinesses } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const businesses = await getUserBusinesses();
  if (businesses.length > 0) {
    redirect('/dashboard');
  }

  return <OnboardingForm />;
}
