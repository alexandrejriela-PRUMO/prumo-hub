import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  Upload, Sparkles, FileText, CheckCircle2, AlertTriangle,
  FileSearch, ChevronRight, X, Loader2
} from 'lucide-react';

const DOC_TYPES = [
  {
    id: 'recibo',
    label: 'Recibo de Inscrição (CAR Completo)',
    description: 'Documento oficial com Nº do CAR, áreas declaradas, matrículas e informações do proprietário',
    icon: '📋',
    color: 'emerald',
    hint: 'Arquivo PDF gerado pelo SICAR — "CAR-XXXX.pdf"',
  },
  {
    id: 'demonstrativo',
    label: 'Demonstrativo de Situação do CAR',
    description: 'Documento com situação atual, cobertura do solo, APP, Reserva Legal e regularidade ambiental',
    icon: '📊',
    color: 'blue',
    hint: 'Arquivo PDF gerado pelo car.gov.br — "Demonstrativo_XX.pdf"',
  },
];

function mapStatusFromDoc(conditionStr) {
  if (!conditionStr) return 'Pendente de análise';
  const c = conditionStr.toLowerCase();
  if (c.includes('aguardando análise') || c.includes('aguardando analise')) return 'Pendente de análise';
  if (c.includes('em análise') || c.includes('em analise')) return 'Em análise pelo órgão ambiental';
  if (c.includes('validado') || c.includes('ativo')) return 'Validado';
  if (c.includes('inconsistência') || c.includes('inconsistencia')) return 'Com inconsistências';
  if (c.includes('cancelado')) return 'Cancelado';
  if (c.includes('retific')) return 'Necessita retificação';
  return 'Pendente de análise';
}

function buildPrompt(docType) {
  if (docType === 'recibo') {
    return `Você é um especialista em Cadastro Ambiental Rural (CAR) do Brasil. Analise este PDF de "Recibo de Inscrição do Imóvel Rural no CAR" emitido pelo SICAR.

Extraia e retorne EXATAMENTE os seguintes dados em JSON:
- car_number: Número/Registro do CAR (ex: "RS-4316709-8F22.BA14.2BB5.4430.911E.E678.C1FF.24C9")
- car_registration_date: Data de Cadastro no formato YYYY-MM-DD (ex: "2016-05-05")
- car_area_hectares: Área Total do Imóvel em hectares como número (ex: 58.09)
- app_hectares: Área de Preservação Permanente (APP) em hectares como número
- legal_reserve_hectares: Área de Reserva Legal em hectares como número
- consolidated_area_hectares: Área Consolidada em hectares como número
- municipality: Município (ex: "Santa Bárbara do Sul")
- state: UF/Estado (ex: "RS")
- owner_name: Nome do Proprietário/Possuidor (ex: "CELSO ALZÍRIO ROOS")
- registration_numbers: Números das matrículas separados por vírgula (ex: "28.356, 29.524")
- coordinates: Coordenadas do centróide no formato "LAT,LNG" em decimais negativos para Sul/Oeste (ex: "-28.3404,-53.3673")
- car_status: Um dos valores: "Validado", "Em análise pelo órgão ambiental", "Pendente de análise", "Com inconsistências", "Cancelado", "Necessita retificação"
- car_notes: Observações relevantes sobre inconsistências ou informações adicionais mencionadas no documento
- environmental_liabilities: Array com passivos identificados. Possíveis valores: ["Déficit de Reserva Legal", "Déficit de APP", "Área degradada", "Uso irregular em APP", "Compensação de Reserva Legal", "Servidão ambiental"]
- ai_analysis: Análise técnica ambiental em português com: situação da propriedade, passivos identificados, recomendações práticas para regularização. Máximo 300 palavras.

Para coordenadas: converta graus/minutos/segundos para decimal (Sul = negativo, Oeste = negativo).
Para datas: formato YYYY-MM-DD.
Para campos não encontrados: use null.`;
  }

  return `Você é um especialista em Cadastro Ambiental Rural (CAR) do Brasil. Analise este PDF de "Demonstrativo da Situação das Informações Declaradas no CAR" emitido pelo car.gov.br.

Extraia e retorne EXATAMENTE os seguintes dados em JSON:
- car_number: Registro de Inscrição no CAR (ex: "RS-4316709-8F22BA142BB54430911EE678C1FF24C9")
- car_registration_date: Data da Inscrição no formato YYYY-MM-DD (ex: "2016-06-06")
- car_last_update: Data da Última Retificação no formato YYYY-MM-DD (ex: "2019-04-11")
- car_area_hectares: Área do Imóvel Rural em hectares como número (ex: 58.09)
- app_hectares: APP total em hectares como número (ex: 2.97)
- legal_reserve_hectares: Área de Reserva Legal Proposta/Declarada em hectares (ex: 2.20)
- consolidated_area_hectares: Área Rural Consolidada em hectares (ex: 58.07)
- native_vegetation_hectares: Área de Remanescente de Vegetação Nativa em hectares
- legal_reserve_to_recover_hectares: Área de Reserva Legal a recompor em hectares
- app_to_recover_hectares: Áreas de Preservação Permanente a recompor em hectares
- municipality: Município (ex: "Santa Bárbara do Sul")
- state: Unidade da Federação (ex: "RS")
- coordinates: Coordenadas no formato "LAT,LNG" em decimais negativos para Sul/Oeste
- car_status: Baseado na "Condição Externa" e "Situação do Cadastro". Mapeie para: "Validado", "Em análise pelo órgão ambiental", "Pendente de análise", "Com inconsistências", "Cancelado", "Necessita retificação"
- environmental_liabilities: Array com passivos identificados com base nos dados de regularidade ambiental. Possíveis: ["Déficit de Reserva Legal", "Déficit de APP", "Área degradada", "Uso irregular em APP", "Compensação de Reserva Legal"]
- car_notes: Resumo das informações de regularidade ambiental (passivos, áreas a recompor)
- ai_analysis: Análise técnica ambiental completa em português: situação cadastral, passivos ambientais encontrados, áreas a recompor, urgência de ações regulatórias. Máximo 300 palavras.

Para coordenadas: converta graus/minutos/segundos para decimal.
Para campos não encontrados: use null.`;
}

export default function CARSmartUpload({ onDataExtracted, onClose }) {
  const [step, setStep] = useState('choose'); // 'choose' | 'upload' | 'analyzing' | 'done'
  const [selectedType, setSelectedType] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('analyzing');
    setError(null);

    try {
      // 1. Upload PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);

      // 2. Extract data with AI vision
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(selectedType),
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            car_number: { type: 'string' },
            car_registration_date: { type: 'string' },
            car_last_update: { type: 'string' },
            car_area_hectares: { type: 'number' },
            app_hectares: { type: 'number' },
            legal_reserve_hectares: { type: 'number' },
            consolidated_area_hectares: { type: 'number' },
            native_vegetation_hectares: { type: 'number' },
            legal_reserve_to_recover_hectares: { type: 'number' },
            app_to_recover_hectares: { type: 'number' },
            municipality: { type: 'string' },
            state: { type: 'string' },
            owner_name: { type: 'string' },
            registration_numbers: { type: 'string' },
            coordinates: { type: 'string' },
            car_status: { type: 'string' },
            environmental_liabilities: { type: 'array', items: { type: 'string' } },
            car_notes: { type: 'string' },
            ai_analysis: { type: 'string' },
          }
        },
        model: 'gemini_3_flash',
      });

      setResult({ ...extracted, _file_url: file_url, _doc_type: selectedType });
      setStep('done');
    } catch (err) {
      setError('Erro ao processar o PDF. Tente novamente.');
      setStep('upload');
    }

    e.target.value = '';
  };

  const handleApply = () => {
    if (!result) return;

    // Map extracted data to CARManagement form fields
    const formData = {
      car_number: result.car_number || '',
      car_status: result.car_status || 'Pendente de análise',
      car_registration_date: result.car_registration_date || '',
      car_last_update: result.car_last_update || '',
      car_area_hectares: result.car_area_hectares || '',
      car_notes: result.car_notes || '',
      environmental_liabilities: result.environmental_liabilities || [],
      // Fields saved directly to CARManagement
      app_hectares: result.app_hectares || '',
      legal_reserve_hectares: result.legal_reserve_hectares || '',
      consolidated_area_hectares: result.consolidated_area_hectares || '',
      legal_reserve_to_recover_hectares: result.legal_reserve_to_recover_hectares || '',
      app_to_recover_hectares: result.app_to_recover_hectares || '',
      owner_name: result.owner_name || '',
      municipality: result.municipality || '',
      state: result.state || '',
      registration_numbers: result.registration_numbers || '',
      coordinates: result.coordinates || '',
      // Extra data passed for property update
      _app_hectares: result.app_hectares,
      _legal_reserve_hectares: result.legal_reserve_hectares,
      _coordinates: result.coordinates,
      _municipality: result.municipality,
      _state: result.state,
      _owner_name: result.owner_name,
      _registration_numbers: result.registration_numbers,
      _ai_analysis: result.ai_analysis,
      _doc_type: result._doc_type,
      _file_url: result._file_url,
      _consolidated_area: result.consolidated_area_hectares,
      _legal_reserve_to_recover: result.legal_reserve_to_recover_hectares,
      _app_to_recover: result.app_to_recover_hectares,
    };

    // If there are liabilities detected from demonstrativo passivos
    if (result.legal_reserve_to_recover_hectares > 0 && !formData.environmental_liabilities.includes('Déficit de Reserva Legal')) {
      formData.environmental_liabilities.push('Déficit de Reserva Legal');
    }
    if (result.app_to_recover_hectares > 0 && !formData.environmental_liabilities.includes('Déficit de APP')) {
      formData.environmental_liabilities.push('Déficit de APP');
    }

    onDataExtracted(formData);
  };

  return (
    <div className="space-y-4">
      {/* Step: Choose document type */}
      {step === 'choose' && (
        <div className="space-y-3">
          <div className="text-center pb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 mb-3">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Preencher com IA</h3>
            <p className="text-sm text-gray-500 mt-1">Faça upload do PDF do CAR e a IA extrai os dados automaticamente</p>
          </div>

          <div className="grid gap-3">
            {DOC_TYPES.map(dt => (
              <button
                key={dt.id}
                onClick={() => { setSelectedType(dt.id); setStep('upload'); }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-${dt.color}-400 hover:bg-${dt.color}-50/50 border-gray-200 bg-white group`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{dt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-emerald-800">{dt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{dt.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1 italic">{dt.hint}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 flex-shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
              Preencher manualmente
            </Button>
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('choose')} className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {DOC_TYPES.find(d => d.id === selectedType)?.label}
            </span>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center cursor-pointer hover:bg-emerald-50 transition-colors">
              <Upload className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-gray-700">Clique para selecionar o PDF</p>
              <p className="text-xs text-gray-400 mt-1">Somente arquivos PDF do SICAR / car.gov.br</p>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
          </label>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <div className="py-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Analisando documento com IA...</p>
            <p className="text-sm text-gray-500 mt-1">Extraindo dados do CAR, áreas ambientais e gerando análise técnica</p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap text-xs text-gray-400">
            <span className="flex items-center gap-1"><FileSearch className="w-3 h-3" /> Lendo PDF</span>
            <span>→</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> IA interpretando</span>
            <span>→</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Preenchendo formulário</span>
          </div>
        </div>
      )}

      {/* Step: Done - Preview extracted data */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Dados extraídos com sucesso!</p>
              <p className="text-xs text-emerald-600">Revise os dados abaixo e clique em "Aplicar ao Formulário"</p>
            </div>
          </div>

          {/* Key extracted fields preview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Dados Extraídos</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Número do CAR', value: result.car_number },
                { label: 'Status', value: result.car_status },
                { label: 'Data de Cadastro', value: result.car_registration_date },
                { label: 'Última Retificação', value: result.car_last_update },
                { label: 'Área Total', value: result.car_area_hectares ? `${result.car_area_hectares} ha` : null },
                { label: 'APP', value: result.app_hectares ? `${result.app_hectares} ha` : null },
                { label: 'Reserva Legal', value: result.legal_reserve_hectares ? `${result.legal_reserve_hectares} ha` : null },
                { label: 'Área Consolidada', value: result.consolidated_area_hectares ? `${result.consolidated_area_hectares} ha` : null },
                { label: 'Município/UF', value: result.municipality && result.state ? `${result.municipality}/${result.state}` : result.municipality },
                { label: 'Proprietário', value: result.owner_name },
                { label: 'Matrículas', value: result.registration_numbers },
                { label: 'RL a recompor', value: result.legal_reserve_to_recover_hectares ? `${result.legal_reserve_to_recover_hectares} ha` : null },
                { label: 'APP a recompor', value: result.app_to_recover_hectares ? `${result.app_to_recover_hectares} ha` : null },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="font-medium text-gray-900 text-xs text-right max-w-[60%] truncate" title={String(value)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental liabilities */}
          {result.environmental_liabilities?.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Passivos Ambientais Identificados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.environmental_liabilities.map(l => (
                  <Badge key={l} className="bg-orange-100 text-orange-800 border border-orange-200 text-[11px]">{l}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {result.ai_analysis && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-semibold text-purple-800">Análise Técnica IA</p>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">{result.ai_analysis}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setStep('choose'); setResult(null); }}
              className="flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Refazer
            </Button>
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApply}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aplicar ao Formulário
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}