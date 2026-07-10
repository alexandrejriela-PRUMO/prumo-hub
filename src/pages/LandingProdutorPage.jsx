import { base44 } from '@/api/base44Client';
import LandingShell from '@/components/landing/LandingShell';
import LandingProdutor from '@/components/landing/LandingProdutor';

export default function LandingProdutorPage() {
  const handleLogin = () => base44.auth.redirectToLogin('/');
  return (
    <LandingShell accent="emerald">
      <LandingProdutor onLogin={handleLogin} standalone />
    </LandingShell>
  );
}