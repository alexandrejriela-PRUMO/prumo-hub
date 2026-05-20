import { useEffectiveUser } from '../hooks/useEffectiveUser';
import HomeContent from './HomeContent';

export default function Home() {
  const { user, effectiveEmail, isEquipe, isEquipeProdutor, isConsultor, isLoading } = useEffectiveUser();

  return (
    <HomeContent
      user={user}
      effectiveEmail={effectiveEmail}
      isEquipe={isEquipe}
      isEquipeProdutor={isEquipeProdutor}
      isConsultor={isConsultor}
      effectiveLoading={isLoading}
    />
  );
}