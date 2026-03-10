import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Plus, User, Mail, Shield, Bell } from 'lucide-react';
import { format } from 'date-fns';
import ConsultorAlertPanel from '../notifications/ConsultorAlertPanel';

export default function PropertyUsers({ property, currentUser, onSave, onCancel }) {
  const isConsultor = currentUser?.user_type === 'consultor';
  const [users, setUsers] = useState(() => {
    const au = property?.authorized_users;
    if (!au) return [];
    if (Array.isArray(au)) return au;
    try { const parsed = JSON.parse(au); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  });
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: isConsultor ? 'Visualizador' : 'Proprietário'
  });

  const addUser = () => {
    if (!newUser.email || !newUser.name) {
      alert('Preencha email e nome do usuário');
      return;
    }

    // Verificar se usuário já existe
    if (users.some(u => u.email === newUser.email)) {
      alert('Este usuário já está autorizado');
      return;
    }

    const userToAdd = {
      ...newUser,
      added_date: new Date().toISOString(),
      added_by: currentUser?.email
    };

    setUsers([...users, userToAdd]);
    setNewUser({ email: '', name: '', role: 'Visualizador' });
  };

  const removeUser = (email) => {
    setUsers(users.filter(u => u.email !== email));
  };

  const handleSave = () => {
    onSave(users);
  };

  const roleColors = {
    'Proprietário': 'bg-purple-100 text-purple-700',
    'Gestor': 'bg-blue-100 text-blue-700',
    'Técnico': 'bg-green-100 text-green-700',
    'Visualizador': 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="space-y-6">
      {/* Owner */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Proprietário Principal</h3>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{property?.owner_email}</p>
                <Badge className="bg-purple-100 text-purple-700 mt-1">
                  Proprietário
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultor Alert Panel - Only for Consultors */}
       {isConsultor && users.length > 0 && (
         <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-4">
           <div className="flex items-start justify-between gap-4">
             <div>
               <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                 <Bell className="w-4 h-4 text-emerald-600" />
                 Enviar Alertas
               </h3>
               <p className="text-sm text-gray-600 mt-1">
                 Notifique seus visualizadores sobre prazos críticos, atualizações do PRAD e licenças ambientais
               </p>
             </div>
             <ConsultorAlertPanel propertyId={property?.id} viewers={users} />
           </div>
         </div>
       )}

      {/* Add User Form - Only for Consultors */}
       {isConsultor && (
         <div>
           <h3 className="font-semibold text-gray-900 mb-3">Adicionar Visualizador</h3>
           <Card>
             <CardContent className="p-4 space-y-3">
               <div className="grid md:grid-cols-2 gap-3">
                 <div className="space-y-2">
                   <Label>Email *</Label>
                   <Input
                     type="email"
                     value={newUser.email}
                     onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                     placeholder="usuario@exemplo.com"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Nome *</Label>
                   <Input
                     value={newUser.name}
                     onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                     placeholder="Nome do usuário"
                   />
                 </div>
               </div>
               <div className="flex gap-3">
                 <div className="flex-1">
                   <Badge className="bg-gray-100 text-gray-700">
                     Visualizador
                   </Badge>
                 </div>
                 <Button
                   type="button"
                   onClick={addUser}
                   className="bg-emerald-600 hover:bg-emerald-700"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Adicionar
                 </Button>
               </div>
             </CardContent>
           </Card>
         </div>
       )}

      {/* Users List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Usuários Autorizados ({users.length})
        </h3>
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 text-sm">Nenhum usuário adicional autorizado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map((user, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 text-gray-500" />
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge className={roleColors[user.role]}>
                          {user.role}
                        </Badge>
                        {user.added_date && (
                          <span className="text-xs text-gray-500">
                            Adicionado em {format(new Date(user.added_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUser(user.email)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
         <p className="text-sm text-blue-800">
           {isConsultor ? (
             <>
               <strong>Visualizador:</strong> Clientes do consultor que podem visualizar a propriedade e receber notificações, sem permissão de edição.
             </>
           ) : (
             <>
               <strong>Proprietário:</strong> Você tem acesso total à propriedade. Para adicionar usuários autorizados, você precisa ser um consultor.
             </>
           )}
         </p>
       </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Salvar Usuários
        </Button>
      </div>
    </div>
  );
}