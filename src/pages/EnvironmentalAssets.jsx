import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus, Edit2, Trash2, AlertCircle, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const BIOMAS = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pantanal', 'Pampas'];

// Lei 12.651/2012 - Código Florestal: Percentuais de Reserva Legal por bioma
const LEGAL_RESERVE_PERCENTAGES = {
  'Amazônia': 80,
  'Cerrado': 35,
  'Mata Atlântica': 20,
  'Caatinga': 20,
  'Pantanal': 20,
  'Pampas': 20
};

export default function EnvironmentalAssets() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('cra');
  const [editingCRA, setEditingCRA] = useState(null);
  const [craFormData, setCRAFormData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Usuário não autenticado');
      }
    };
    loadUser();
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: craOrigins = [], refetch: refetchCRA } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const saveCRAMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.property_id || !data.biome || !data.total_area_hectares) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const total = parseFloat(data.total_area_hectares);
      const existing = parseFloat(data.existing_legal_reserve_hectares) || 0;
      
      if (total <= 0) throw new Error('Área deve ser maior que zero');

      // Calcula RL exigida pela Lei 12.651/2012
      const percentual = LEGAL_RESERVE_PERCENTAGES[data.biome] || 20;
      const required = (total * percentual) / 100;
      const surplus = Math.max(0, existing - required);

      const payload = {
        property_id: data.property_id,
        owner_email: user.email,
        consultor_email: user.email,
        car_number: data.car_number || 'SEM_CAR',
        biome: data.biome,
        state: data.state || '',
        municipality: data.municipality || '',
        total_area_hectares: total,
        required_legal_reserve_hectares: required,
        existing_legal_reserve_hectares: existing,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        status: 'Pendente'
      };

      if (editingCRA?.id) {
        return base44.entities.CRAOrigin.update(editingCRA.id, payload);
      }
      return base44.entities.CRAOrigin.create(payload);
    },
    onSuccess: async () => {
      await refetchCRA();
      setEditingCRA(null);
      setCRAFormData({});
      toast.success('CRA salvo com sucesso!');
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteCRAMutation = useMutation({
    mutationFn: (id) => base44.entities.CRAOrigin.delete(id),
    onSuccess: async () => {
      await refetchCRA();
      toast.success('CRA excluído!');
    },
    onError: () => toast.error('Erro ao excluir')
  });

  const handleEdit = (cra) => {
    setEditingCRA(cra);
    setCRAFormData({
      property_id: cra.property_id,
      car_number: cra.car_number,
      biome: cra.biome,
      state: cra.state,
      municipality: cra.municipality,
      total_area_hectares: cra.total_area_hectares,
      existing_legal_reserve_hectares: cra.existing_legal_reserve_hectares
    });
  };

  const resetForm = () => {
    setEditingCRA(null);
    setCRAFormData({});
  };

  if (!user) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <div className="w-full space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-emerald-900">Ativos Ambientais</h1>
          <p className="text-sm text-emerald-600">Gestão de CRA conforme Lei 12.651/2012</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-emerald-50">
          <TabsTrigger value="cra" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            CRA - Cotas de Reserva ({craOrigins.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Informações Legais
          </TabsTrigger>
        </TabsList>

        {/* CRA TAB */}
        <TabsContent value="cra" className="space-y-4 mt-6">
          {!editingCRA && (
            <Button onClick={() => {
              setEditingCRA({});
              setCRAFormData({
                property_id: '',
                car_number: '',
                biome: '',
                state: '',
                municipality: '',
                total_area_hectares: '',
                existing_legal_reserve_hectares: ''
              });
            }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Registrar nova CRA
            </Button>
          )}

          {editingCRA && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-emerald-900">Registrar Cotas de Reserva Ambiental</CardTitle>
                  <Button size="sm" variant="ghost" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Propriedade *</Label>
                    <Select value={craFormData.property_id || ''} onValueChange={(value) => setCRAFormData({ ...craFormData, property_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Número CAR</Label>
                    <Input value={craFormData.car_number || ''} onChange={(e) => setCRAFormData({ ...craFormData, car_number: e.target.value })} placeholder="123.456.789-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Bioma *</Label>
                    <Select value={craFormData.biome || ''} onValueChange={(value) => setCRAFormData({ ...craFormData, biome: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Estado</Label>
                    <Input value={craFormData.state || ''} onChange={(e) => setCRAFormData({ ...craFormData, state: e.target.value })} placeholder="SP" maxLength="2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Município</Label>
                    <Input value={craFormData.municipality || ''} onChange={(e) => setCRAFormData({ ...craFormData, municipality: e.target.value })} placeholder="São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Área Total (ha) *</Label>
                    <Input type="number" step="0.01" value={craFormData.total_area_hectares || ''} onChange={(e) => setCRAFormData({ ...craFormData, total_area_hectares: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Vegetação Nativa Existente (ha) *</Label>
                    <Input type="number" step="0.01" value={craFormData.existing_legal_reserve_hectares || ''} onChange={(e) => setCRAFormData({ ...craFormData, existing_legal_reserve_hectares: e.target.value })} placeholder="0" />
                  </div>
                  {craFormData.biome && craFormData.total_area_hectares && (
                    <div className="space-y-2">
                      <Label className="font-semibold text-emerald-900">RL Exigida (Lei 12.651) *</Label>
                      <div className="bg-amber-100 p-3 rounded-lg border border-amber-300">
                        <p className="font-bold text-amber-900">{LEGAL_RESERVE_PERCENTAGES[craFormData.biome]}% = {((parseFloat(craFormData.total_area_hectares) * LEGAL_RESERVE_PERCENTAGES[craFormData.biome]) / 100).toFixed(2)} ha</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={() => saveCRAMutation.mutate({ ...editingCRA, ...craFormData })} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveCRAMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveCRAMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {craOrigins.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhuma CRA registrada. Comece registrando a vegetação nativa de sua propriedade.
                </CardContent>
              </Card>
            ) : (
              craOrigins.map(cra => {
                const required = cra.required_legal_reserve_hectares || 0;
                const existing = cra.existing_legal_reserve_hectares || 0;
                const surplus = cra.surplus_native_vegetation_hectares || 0;
                const compliance = existing >= required ? 'Conforme' : 'Não conforme';
                const complianceColor = existing >= required ? 'emerald' : 'red';

                return (
                  <Card key={cra.id} className="hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{properties.find(p => p.id === cra.property_id)?.property_name}</h3>
                            <p className="text-sm text-gray-600">CAR: {cra.car_number} | {cra.bioma}</p>
                          </div>
                          <Badge className={`bg-${complianceColor}-100 text-${complianceColor}-700 border-${complianceColor}-300`}>{compliance}</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium">ÁREA TOTAL</p>
                            <p className="text-lg font-bold text-blue-900">{cra.total_area_hectares}ha</p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg">
                            <p className="text-xs text-amber-600 font-medium">RL EXIGIDA</p>
                            <p className="text-lg font-bold text-amber-900">{required.toFixed(2)}ha</p>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-lg">
                            <p className="text-xs text-emerald-600 font-medium">RL EXISTENTE</p>
                            <p className="text-lg font-bold text-emerald-900">{existing.toFixed(2)}ha</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-xs text-purple-600 font-medium">POTENCIAL CRA</p>
                            <p className="text-lg font-bold text-purple-900">{surplus.toFixed(2)}ha</p>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(cra)}>
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            if (confirm('Excluir este registro?')) deleteCRAMutation.mutate(cra.id);
                          }} disabled={deleteCRAMutation.isPending}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* INFO TAB */}
        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lei 12.651/2012 - Código Florestal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <p className="font-semibold text-emerald-900">Percentual de Reserva Legal por Bioma:</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                  {Object.entries(LEGAL_RESERVE_PERCENTAGES).map(([bioma, percent]) => (
                    <li key={bioma}><strong>{bioma}:</strong> {percent}%</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900">O que é CRA?</p>
                <p className="mt-2 text-sm text-blue-800">
                  Cota de Reserva Ambiental é um ativo de natureza intangível e transferível, 
                  representativo de vegetação nativa existente ou em processo de recuperação. 
                  Pode ser negociada no mercado para fins de regularização de propriedades não 
                  conformes com a Lei 12.651/2012.
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="font-semibold text-purple-900">Como funciona?</p>
                <ol className="mt-2 space-y-2 text-sm text-purple-800 list-decimal list-inside">
                  <li>Propriedade com excedente de vegetação nativa = Pode gerar CRA</li>
                  <li>Propriedade com déficit de RL = Precisa comprar CRA</li>
                  <li>Transação realizada em banco de dados ou mercado</li>
                  <li>Registra-se no CAR após conclusão</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}