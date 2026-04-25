import { useQueryClient } from '@tanstack/react-query';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import HomeContent from './HomeContent';

export default function Home() {
  const queryClient = useQueryClient();
  const { user, effectiveEmail, isEquipe, isConsultor, isLoading } = useEffectiveUser();

  return (
    <HomeContent
      queryClient={queryClient}
      user={user}
      effectiveEmail={effectiveEmail}
      isEquipe={isEquipe}
      isConsultor={isConsultor}
      effectiveLoading={isLoading}
    />
  );
}