import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';

export default function ChecklistProgress({ checklist }) {
  const total = checklist.items?.length || 0;
  const completed = checklist.completed_tasks || 0;
  const pending = checklist.pending_tasks || 0;
  const delayed = checklist.delayed_tasks || 0;
  const progress = checklist.overall_progress || 0;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {/* Progress Bar */}
      <Card className="col-span-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Progresso Geral</span>
            <span className="text-sm font-bold text-emerald-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Concluídas</p>
              <p className="text-2xl font-bold">{completed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold">{pending}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delayed */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Atrasadas</p>
              <p className="text-2xl font-bold">{delayed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}