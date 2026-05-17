import { useEffectiveUser } from '../hooks/useEffectiveUser';
import HomeContent from './HomeContent';

export default function Home() {
  const { user, effectiveEmail, isEquipe, isConsultor, isLoading } = useEffectiveUser();

  return (
    <HomeContent
      user={user}
      effectiveEmail={effectiveEmail}
      isEquipe={isEquipe}
      isConsultor={isConsultor}
      effectiveLoading={isLoading}
    />
  );
}