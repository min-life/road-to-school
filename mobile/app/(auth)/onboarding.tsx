import { OnboardingCarousel } from '@/components/onboarding/OnboardingCarousel';
import { useOnboarding } from '@/context/onboarding-context';

export default function OnboardingScreen() {
  const { saving, error, complete, continueWithoutSaving } = useOnboarding();
  return <OnboardingCarousel saving={saving} error={error} onComplete={complete} onContinueWithoutSaving={continueWithoutSaving} />;
}
