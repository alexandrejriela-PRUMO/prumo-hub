import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain } from 'lucide-react';

export default function WeatherForecast({ forecast }) {
  if (!forecast || forecast.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Previsão 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {forecast.map((day, idx) => (
            <div key={idx} className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow">
              <p className="font-semibold text-gray-900 mb-2">
                {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
              </p>
              <div className="flex justify-center mb-2">
                {day.precipitation_chance > 50 ? (
                  <CloudRain className="w-8 h-8 text-blue-600" />
                ) : (
                  <Cloud className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{day.description}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Max</span>
                  <span className="font-bold">{day.temp_max}°</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Min</span>
                  <span className="font-bold">{day.temp_min}°</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                  <span className="text-gray-600">Chuva</span>
                  <span className="font-bold">{day.precipitation_chance}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}