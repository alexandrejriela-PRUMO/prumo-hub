import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPropertyAccess({ user, onClose }) {
  const queryClient = useQueryClient();
  const [selectedProperties, setSelectedProperties] = useState(
    user.authorized_properties ? JSON.parse(user.authorized_properties) : []
  );

  // Buscar propriedades do consultor principal se for client_consultor
  const { data: properties = [] } = useQuery({
    queryKey: ['consultor-properties', user.primary_consultor_email],
    queryFn: async () => {
      if (!user.primary_consultor_email) return [];
      const res = await base44.entities.Property.filter(
        { consultor_email: user.primary_consultor_email },
        '-created_date',
        100
      );
      return res || [];
    },
    enabled: user.user_type === 'client_consultor' && !!user.primary_consultor_email,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      base44.functions.invoke('adminUpdateUser', {
        userId: user.id,
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-all-users']);
      toast.success('Propriedades autorizadas atualizadas!');
      onClose();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleToggleProperty = (propertyId) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSave = () => {
    mutation.mutate({
      authorized_properties: JSON.stringify(selectedProperties),
    });
  };

  if (user.user_type !== 'client_consultor') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Acesso a Propriedades</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Somente usuários do tipo "Cliente" (client_consultor) podem ter propriedades autorizadas.
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Propriedades Autorizadas</h3>
            <p className="text-sm text-gray-500">{user.full_name || user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {properties.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma propriedade encontrada para o consultor principal.
            </p>
          ) : (
            <div className="space-y-2">
              {properties.map((prop) => (
                <label
                  key={prop.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(prop.id)}
                    onChange={() => handleToggleProperty(prop.id)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {prop.property_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {prop.city && prop.state ? `${prop.city}, ${prop.state}` : 'Sem localização'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 flex gap-3 p-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}