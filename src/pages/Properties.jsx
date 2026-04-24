import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Map as MapIcon,
  TreePine,
  Briefcase,
  User,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import PropertyForm from '../components/properties/PropertyForm';
import PropertyMap from '../components/properties/PropertyMap';
import PropertyUsers from '../components/properties/PropertyUsers';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function Properties() {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  const queryClient = useQueryClient();
  const { effectiveEmail, isEquipe, isConsultor: isConsultorType, isProdutor, memberRole, loading: effectiveLoading, user: effectiveUser } = useEffectiveUser();
  const [user, setUser] = useState(effectiveUser || null);
  const [userMeta, setUserMeta] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.email) {
        base44.entities.UserMetadata.filter({ user_email: u.email }, '-created_date', 1)
          .then(list => { if (list?.length > 0) setUserMeta(list[0]); })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const isConsultor = isConsultorType || isEquipe; // consultor ou equipe gerencia pelo consultor_email

  // Limite de propriedades por plano
  const maxProperties = userMeta?.max_properties ?? 9999;
  const canCreate = (!isEquipe || memberRole === 'Administrador') && properties.length < maxProperties;
  const atPropertyLimit = !isEquipe && properties.length >= maxProperties && maxProperties < 9999;

  const { data: ownerProperties = [] } = useQuery({
    queryKey: ['properties-owner', effectiveEmail],
    queryFn: () => base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && isProdutor
  });

  const { data: consultorProperties = [] } = useQuery({
    queryKey: ['properties-consultor', effectiveEmail],
    queryFn: () => base44.entities.Property.filter({ consultor_email: effectiveEmail }),
    enabled: !!effectiveEmail && (isConsultorType || isEquipe)
  });

  const properties = isProdutor
    ? ownerProperties.filter(p => !p.is_client_only)
    : consultorProperties.filter(p => !p.is_client_only);
  const isLoading = effectiveLoading;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.create({
      ...data,
      owner_email: data.owner_email || effectiveEmail,
      // Consultor/equipe vincula ao consultor; produtor não tem consultor_email próprio
      ...(isConsultorType || isEquipe ? { consultor_email: effectiveEmail } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['properties-owner']);
      queryClient.invalidateQueries(['properties-consultor']);
      queryClient.invalidateQueries(['consultor-properties']);
      setFormDialogOpen(false);
      setEditingProperty(null);
      toast.success('Propriedade criada com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['properties-owner']);
      queryClient.invalidateQueries(['properties-consultor']);
      queryClient.invalidateQueries(['consultor-properties']);
      setFormDialogOpen(false);
      setMapDialogOpen(false);
      setUsersDialogOpen(false);
      setEditingProperty(null);
      setSelectedProperty(null);
      toast.success('Propriedade atualizada com sucesso!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Property.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['properties-owner']);
      queryClient.invalidateQueries(['properties-consultor']);
      queryClient.invalidateQueries(['consultor-properties']);
      toast.success('Propriedade removida com sucesso!');
    }
  });

  const PropertyCard = ({ property }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 sm:w-7 h-6 sm:h-7 text-emerald-700" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-2">{property.property_name}</h3>
            {(property.client_name || property.owner_email) && (
              <p className="text-xs sm:text-sm text-emerald-700 font-medium mt-0.5 flex items-center gap-1 line-clamp-1">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{property.client_name || property.owner_email}</span>
              </p>
            )}
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-1">
              {property.city}{property.city && property.state ? ', ' : ''}{property.state}
            </p>
            
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              {property.total_hectares && (
                <Badge variant="outline" className="text-xs">
                  <TreePine className="w-3 h-3 mr-0.5" />
                  <span className="hidden sm:inline">{property.total_hectares} ha</span>
                  <span className="sm:hidden">{property.total_hectares}ha</span>
                </Badge>
              )}
              {property.main_activity && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="w-3 h-3 mr-0.5" />
                  <span className="hidden sm:inline">{property.main_activity}</span>
                  <span className="sm:hidden truncate">{property.main_activity.substring(0, 8)}</span>
                </Badge>
              )}
              {property.boundaries && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                  <span className="hidden sm:inline">Limites Definidos</span>
                  <span className="sm:hidden">Limites</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto sm:flex-col flex-shrink-0">
            {isConsultor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProperty(property);
                  setUsersDialogOpen(true);
                }}
                title="Gerenciar usuários"
                className="flex-1 sm:flex-none"
              >
                <Users className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingProperty(property);
                setFormDialogOpen(true);
              }}
              className="flex-1 sm:flex-none"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Deseja realmente excluir esta propriedade?')) {
                  deleteMutation.mutate(property.id);
                }
              }}
              className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Propriedades e Empreendimentos</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie suas propriedades rurais e empreendimentos</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {canCreate && <Button 
            onClick={() => {
              setEditingProperty(null);
              setFormDialogOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nova Propriedade ou Empreendimento</span>
            <span className="sm:hidden">Nova Prop.</span>
          </Button>}
          {atPropertyLimit && (
            <p className="text-xs text-red-600">Limite de {maxProperties} propriedade(s) atingido. Faça upgrade do plano.</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Carregando...</p>
          </CardContent>
        </Card>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhuma propriedade cadastrada</h3>
            <p className="text-gray-500 mt-1">Clique em "Nova Propriedade" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={(open) => {
        if (!open && editingProperty) {
          // Apenas fecha o dialog se for edição (sem alerta)
          setFormDialogOpen(false);
          setEditingProperty(null);
        } else if (!open) {
          // Para novo, sempre fecha sem alerta (PropertyForm já tem proteção)
          setFormDialogOpen(false);
        } else {
          setFormDialogOpen(open);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProperty ? 'Editar Propriedade ou Empreendimento' : 'Nova Propriedade ou Empreendimento'}
            </DialogTitle>
          </DialogHeader>
          <PropertyForm
            property={editingProperty}
            user={{ email: effectiveEmail, user_type: isEquipe ? 'equipe' : isConsultorType ? 'consultor' : (effectiveUser?.user_type || 'produtor') }}
            onSubmit={(data) => {
              if (editingProperty) {
                updateMutation.mutate({ id: editingProperty.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setFormDialogOpen(false);
              setEditingProperty(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Definir Limites Geográficos - {selectedProperty?.property_name}
            </DialogTitle>
          </DialogHeader>
          <PropertyMap
            property={selectedProperty}
            onSave={(boundaries) => {
              updateMutation.mutate({
                id: selectedProperty.id,
                data: { ...selectedProperty, boundaries }
              });
            }}
            onCancel={() => setMapDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Users Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Usuários - {selectedProperty?.property_name}
            </DialogTitle>
          </DialogHeader>
          <PropertyUsers
            property={selectedProperty}
            currentUser={effectiveUser || user}
            onSave={(authorizedUsers) => {
              updateMutation.mutate({
                id: selectedProperty.id,
                data: { ...selectedProperty, authorized_users: JSON.stringify(authorizedUsers) }
              });
            }}
            onCancel={() => setUsersDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}