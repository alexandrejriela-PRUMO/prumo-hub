import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle2, XCircle, Maximize2, Maximize, Crosshair } from 'lucide-react';

export default function MapDrawingToolbar({ 
  isDrawing, 
  onStartDraw, 
  onFinishDraw, 
  onCancelDraw, 
  onClearAll,
  isFullscreen,
  onToggleFullscreen,
  measurements
}) {
  return (
    <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 border border-gray-200">
      <div className="flex items-center gap-1.5">
        <Crosshair className="w-4 h-4 text-gray-600" />
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Desenhar</span>
      </div>
      
      <div className="flex flex-col gap-1">
        {!isDrawing ? (
          <Button
            size="sm"
            variant={isDrawing ? "default" : "outline"}
            onClick={onStartDraw}
            className="h-8 text-xs gap-1.5 justify-start"
            title="Clique no mapa para criar vértices, clique novamente no primeiro ponto para fechar"
          >
            <Pencil className="w-3 h-3" />
            Desenhar Área
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              onClick={onFinishDraw}
              className="h-8 text-xs gap-1.5 justify-start bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-3 h-3" />
              Finalizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelDraw}
              className="h-8 text-xs gap-1.5 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-3 h-3" />
              Cancelar
            </Button>
          </>
        )}
      </div>

      {measurements && (
        <div className="text-xs text-gray-600 border-t border-gray-200 pt-2 mt-2 space-y-1">
          {measurements.area && <p>Área: <strong>{measurements.area}</strong></p>}
          {measurements.perimeter && <p>Perímetro: <strong>{measurements.perimeter}</strong></p>}
          {measurements.vertices && <p>Vértices: <strong>{measurements.vertices}</strong></p>}
        </div>
      )}

      <div className="border-t border-gray-200 pt-2 mt-2 flex flex-col gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleFullscreen}
          className="h-8 text-xs gap-1.5 justify-start"
        >
          {isFullscreen ? (
            <>
              <Maximize className="w-3 h-3" />
              Sair Tela Cheia
            </>
          ) : (
            <>
              <Maximize2 className="w-3 h-3" />
              Tela Cheia
            </>
          )}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onClearAll}
          className="h-8 text-xs gap-1.5 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
          Limpar Tudo
        </Button>
      </div>
    </div>
  );
}