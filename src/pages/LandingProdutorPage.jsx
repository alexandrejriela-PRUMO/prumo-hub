import { base44 } from '@/api/base44Client';
import LandingShell from '@/components/landing/LandingShell';
import LandingProdutor from '@/components/landing/LandingProdutor';

export default function LandingProdutorPage() {
  return (
    <LandingShell accent="emerald">
      <LandingProdutor onLogin={() => base44.auth.redirectToLogin('/')} />
    </LandingShell>
  );
}