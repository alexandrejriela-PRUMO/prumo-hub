import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Trees, Leaf, Activity } from 'lucide-react';

export default function PropertyCard({ property }) {
  if (!property) {
    return (
      <Card className="bg-gradient-to-br from-emerald-900 to-emerald-950 border-0 overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center py-8 text-emerald-200">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhuma propriedade cadastrada</p>
            <p className="text-sm text-emerald-400 mt-2">Entre em contato com o suporte</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { 
      label: 'Área Total', 
      value: `${property.total_hectares || 0} ha`, 
      icon: Trees,
      color: 'from-emerald-400 to-emerald-600'
    },
    { 
      label: 'APP', 
      value: `${property.app_hectares || 0} ha`, 
      icon: Leaf,
      color: 'from-teal-400 to-teal-600'
    },
    { 
      label: 'Reserva Legal', 
      value: `${property.legal_reserve_hectares || 0} ha`, 
      icon: Trees,
      color: 'from-green-400 to-green-600'
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-emerald-900 via-emerald-900 to-emerald-950 border-0 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-600/20 to-transparent rounded-full translate-y-24 -translate-x-24" />
      
      <CardContent className="p-6 relative">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Property Info */}
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{property.property_name}</h2>
                <p className="text-emerald-300 flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4" />
                  {property.city}, {property.state}
                </p>
              </div>
            </div>

            {property.main_activity && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm mb-4">
                <Activity className="w-4 h-4" />
                <span>Atividade Principal: {property.main_activity}</span>
              </div>
            )}

            {property.coordinates && (
              <p className="text-emerald-400 text-sm">
                📍 {property.coordinates}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="bg-emerald-800/40 backdrop-blur rounded-2xl p-4 text-center">
                <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-white font-bold text-lg">{stat.value}</p>
                <p className="text-emerald-400 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activities */}
        {property.activities && property.activities.length > 0 && (
          <div className="mt-6 pt-6 border-t border-emerald-800/50">
            <p className="text-emerald-400 text-sm mb-3">Atividades:</p>
            <div className="flex flex-wrap gap-2">
              {property.activities.map((activity, index) => (
                <span key={index} className="px-3 py-1 rounded-full bg-emerald-800/50 text-emerald-200 text-sm">
                  {activity}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}