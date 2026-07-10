import { base44 } from '@/api/base44Client';
import LandingShell from '@/components/landing/LandingShell';
import LandingConsultor from '@/components/landing/LandingConsultor';

export default function LandingConsultorPage() {
  const handleLogin = () => base44.auth.redirectToLogin('/');
  return (
    <LandingShell accent="amber">
      <LandingConsultor onLogin={handleLogin} standalone />
    </LandingShell>
  );
}