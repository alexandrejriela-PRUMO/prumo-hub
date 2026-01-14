import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentManager from '../components/documents/DocumentManager';

export default function DocumentsManager() {
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciador de Documentos</h1>
        <p className="text-gray-600">
          Organize e gerencie todos os seus documentos. Faça upload, categorize e vincule automaticamente a formulários.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Categorias Disponíveis</p>
            <p className="text-2xl font-bold text-gray-900">9</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Busca Avançada</p>
            <p className="text-lg text-gray-700">Por nome, tipo e data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Vinculação Automática</p>
            <p className="text-lg text-gray-700">Em formulários</p>
          </CardContent>
        </Card>
      </div>

      {/* Document Manager */}
      {user ? (
        <DocumentManager userEmail={user.email} />
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-yellow-900">Carregando...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}