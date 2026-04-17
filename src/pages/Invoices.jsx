import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreditCard, Headphones, ExternalLink } from 'lucide-react';

export default function Invoices() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);



  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assinatura e Boletos</h1>
          <p className="text-gray-500 mt-1">Gerencie sua assinatura e acompanhe seus pagamentos</p>
        </div>
        <Link to="/Support">
          <Button className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
            <Headphones className="w-4 h-4" />
            Fale com um Especialista
          </Button>
        </Link>
      </div>

      {/* Info Card Nexano */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-7 h-7 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 text-lg">Gerencie sua assinatura no PRUMO Hub</h3>
              <p className="text-emerald-700 text-sm mt-1">
                Assine ou gerencie seu plano diretamente em nosso portal de pagamentos. Escolha o plano ideal para o seu perfil.
              </p>
            </div>
            <a
              href="https://hub.prumo.site/landing"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 shrink-0 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Acessar Portal
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}