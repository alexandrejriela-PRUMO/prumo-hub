import { base44 } from '@/api/base44Client';
import LandingShell from '@/components/landing/LandingShell';
import LandingConsultor from '@/components/landing/LandingConsultor';

export default function LandingConsultorPage() {
  return (
    <LandingShell accent="amber">
      <LandingConsultor onLogin={() => base44.auth.redirectToLogin('/')} />
    </LandingShell>
  );
}