import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  Upload, Sparkles, FileText, CheckCircle2, AlertTriangle,
  FileSearch, ChevronRight, X, Loader2, Info
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

const SCHEMA_PROPERTIES = {
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
  passive_rl_balance_hectares: { type: 'number' },
  use_restriction_to_recover_hectares: { type: 'number' },
  car_situation: { type: 'string' },
  owner_cpf_cnpj: { type: 'string' },
  last_rectification_date: { type: 'string' },
  registration_details: { type: 'string' },
};

function buildPrompt(docType) {
  if (docType === 'recibo') {
    return `Você é um especialista em Cadastro Ambiental Rural (CAR) do Brasil. Analise este PDF de "Recibo de Inscrição do Imóvel Rural no CAR" emitido pelo SICAR.

Extraia e retorne EXATAMENTE os seguintes dados em JSON:
- car_number: Número/Registro do CAR (ex: "RS-4316709-8F22.BA14.2BB5.4430.911E.E678.C1FF.24C9")
- car_registration_date: Data de Cadastro no formato YYYY-MM-DD (ex: "2016-05-05")
- car_area_hectares: Área Total do Imóvel em hectares como número (ex: 58.09)
- app_hectares: Área de Preservação Permanente (APP) em hectares como número
- legal_reserve_hectares: Área de Reserva Legal em hectares como número (área declarada pelo proprietário como RL)
- consolidated_area_hectares: Área Consolidada em hectares como número
- native_vegetation_hectares: Remanescente de Vegetação Nativa em hectares — área com cobertura de mata nativa existente no imóvel. Extrair de 'Área de Remanescente de Vegetação Nativa' na seção Cobertura do Solo.
- municipality: Município (ex: "Santa Bárbara do Sul")
- state: UF/Estado (ex: "RS")
- owner_name: Nome do Proprietário/Possuidor (ex: "CELSO ALZÍRIO ROOS")
- owner_cpf_cnpj: CPF ou CNPJ do proprietário/possuidor, com ou sem formatação
- registration_numbers: Números das matrículas separados por vírgula (ex: "28.356, 29.524")
- registration_details: Matrículas detalhadas em texto — inclua número, data, livro, folha e município do cartório para cada matrícula, uma por linha
- coordinates: Coordenadas do centróide no formato "LAT,LNG" em decimais negativos para Sul/Oeste (ex: "-28.3404,-53.3673")
- car_status: Um dos valores: "Validado", "Em análise pelo órgão ambiental", "Pendente de análise", "Com inconsistências", "Cancelado", "Necessita retificação"
- car_notes: Observações relevantes sobre inconsistências ou informações adicionais mencionadas no documento
- environmental_liabilities: Array com passivos identificados. Possíveis valores: ["Déficit de Reserva Legal", "Déficit de APP", "Área degradada", "Uso irregular em APP", "Compensação de Reserva Legal", "Servidão ambiental"]
- ai_analysis: Análise técnica em português (máx 300 palavras) considerando: 1. Situação cadastral e status do CAR; 2. Passivo/Excedente de RL: diferença entre RL exigida por lei (20% da área) e RL declarada — valor negativo indica que falta DECLARAR mais área de RL; 3. RL a Recompor: área declarada como RL mas SEM vegetação nativa efetiva conforme SICAR — indica necessidade de recomposição/plantio dentro da RL já declarada; 4. APP a Recompor: área de APP sem cobertura vegetal — necessidade de restauração das margens e encostas; 5. Veg. Nativa Remanescente: total de mata nativa existente no imóvel (pode ser usada para justificar RL por compensação). NÃO confundir Passivo de RL com RL a Recompor — são passivos de naturezas diferentes.

ATENÇÃO: O Recibo de Inscrição NÃO contém data de retificação, regularidade ambiental, passivo/excedente de RL, RL a recompor, APP a recompor. Para estes campos, retorne null.
Para coordenadas: converta graus/minutos/segundos para decimal (Sul = negativo, Oeste = negativo).
Para datas: formato YYYY-MM-DD.
Para campos não encontrados: use null.`;
  }

  return `Você é um especialista em Cadastro Ambiental Rural (CAR) do Brasil. Analise este PDF de "Demonstrativo da Situação das Informações Declaradas no CAR" emitido pelo car.gov.br.

Extraia e retorne EXATAMENTE os seguintes dados em JSON:
- car_number: Registro de Inscrição no CAR (ex: "RS-4316709-8F22BA142BB54430911EE678C1FF24C9")
- car_registration_date: Data da Inscrição no formato YYYY-MM-DD (ex: "2016-06-06")
- car_last_update: Data da Última Retificação no formato YYYY-MM-DD (ex: "2019-04-11")
- last_rectification_date: Data da Última Retificação no formato YYYY-MM-DD. Disponível APENAS no Demonstrativo, não no Recibo. Extrair do campo "Data da Última Retificação".
- car_area_hectares: Área do Imóvel Rural em hectares como número (ex: 58.09)
- app_hectares: APP total em hectares como número (ex: 2.97)
- legal_reserve_hectares: Área de Reserva Legal Proposta/Declarada em hectares (área declarada pelo proprietário como RL)
- consolidated_area_hectares: Área Rural Consolidada em hectares (ex: 58.07)
INSTRUÇÕES CRÍTICAS PARA EXTRAÇÃO DA REGULARIDADE AMBIENTAL:
- passive_rl_balance_hectares: Extrair EXCLUSIVAMENTE do campo "Passivo / Excedente de Reserva Legal" da tabela de Regularidade Ambiental. Valor NEGATIVO = déficit (falta declarar mais RL). Valor POSITIVO = excedente. Exemplo: "-16,05" → extrair como -16.05. NÃO confundir com "RL a Recompor" — são campos DIFERENTES na mesma tabela.
- legal_reserve_to_recover_hectares: Extrair EXCLUSIVAMENTE do campo "Área de Reserva Legal a recompor" da tabela de Regularidade Ambiental. Significa: área que FOI declarada como RL, mas que o SICAR identificou SEM vegetação nativa efetiva. Pode ser 0,00 mesmo quando há passivo — significa que toda a RL declarada tem vegetação, mas a área declarada é insuficiente. NÃO usar o valor do Passivo/Excedente aqui.
- app_to_recover_hectares: Extrair EXCLUSIVAMENTE do campo "Áreas de Preservação Permanente a recompor" da tabela de Regularidade Ambiental. Significa: área de APP que o SICAR identificou SEM cobertura vegetal.
- use_restriction_to_recover_hectares: Extrair EXCLUSIVAMENTE do campo "Área de Uso Restrito a recompor" da tabela de Regularidade Ambiental.
- native_vegetation_hectares: Extrair de "Área de Remanescente de Vegetação Nativa" na seção Cobertura do Solo. Este valor é INDEPENDENTE da RL — é toda a vegetação nativa do imóvel, podendo ser maior ou menor que a RL declarada.
ATENÇÃO: Estes 5 campos têm linhas SEPARADAS na tabela do Demonstrativo. Leia cada linha individualmente. NÃO some nem misture valores entre linhas.
- car_situation: Situação do Cadastro: "Ativo", "Cancelado" ou "Pendente de análise". Extrair do campo "Situação do Cadastro" no Demonstrativo.
- municipality: Município (ex: "Santa Bárbara do Sul")
- state: Unidade da Federação (ex: "RS")
- coordinates: Coordenadas no formato "LAT,LNG" em decimais negativos para Sul/Oeste
- car_status: Baseado na "Condição Externa" e "Situação do Cadastro". Mapeie para: "Validado", "Em análise pelo órgão ambiental", "Pendente de análise", "Com inconsistências", "Cancelado", "Necessita retificação"
- environmental_liabilities: Array com passivos identificados com base nos dados de regularidade ambiental. Possíveis: ["Déficit de Reserva Legal", "Déficit de APP", "Área degradada", "Uso irregular em APP", "Compensação de Reserva Legal"]
- car_notes: Resumo das informações de regularidade ambiental (passivos, áreas a recompor)
- ai_analysis: Análise técnica em português (máx 300 palavras) considerando: 1. Situação cadastral e status do CAR; 2. Passivo/Excedente de RL: diferença entre RL exigida por lei (20% da área) e RL declarada — valor negativo indica que falta DECLARAR mais área de RL; 3. RL a Recompor: área declarada como RL mas SEM vegetação nativa efetiva conforme SICAR — indica necessidade de recomposição/plantio dentro da RL já declarada; 4. APP a Recompor: área de APP sem cobertura vegetal — necessidade de restauração das margens e encostas; 5. Veg. Nativa Remanescente: total de mata nativa existente no imóvel (pode ser usada para justificar RL por compensação). NÃO confundir Passivo de RL com RL a Recompor — são passivos de naturezas diferentes.

ATENÇÃO: O Demonstrativo NÃO contém CPF/CNPJ do proprietário nem matrículas detalhadas. Para estes campos, retorne null.
Para coordenadas: converta graus/minutos/segundos para decimal.
Para campos não encontrados: use null.`;
}

function buildPromptCompleto(hasRecibo, hasDemonstrativo) {
  const docsDesc = hasRecibo && hasDemonstrativo
    ? 'O PRIMEIRO documento é o Recibo de Inscrição do CAR (dados cadastrais, proprietário, matrículas). O SEGUNDO é o Demonstrativo de Situação (regularidade ambiental, áreas a recompor, data de retificação).'
    : hasRecibo
    ? 'O documento fornecido é o Recibo de Inscrição do CAR.'
    : 'O documento fornecido é o Demonstrativo de Situação do CAR.';

  return `Você é um especialista em Cadastro Ambiental Rural (CAR) do Brasil. ${docsDesc}

Extraia e consolide em um único JSON todos os campos disponíveis nos documentos fornecidos:

DO RECIBO DE INSCRIÇÃO (quando presente):
- car_number: Número/Registro do CAR
- car_registration_date: Data de Cadastro no formato YYYY-MM-DD
- car_area_hectares: Área Total em hectares
- app_hectares: APP em hectares
- legal_reserve_hectares: Reserva Legal declarada em hectares
- consolidated_area_hectares: Área Consolidada em hectares
- native_vegetation_hectares: Extrair de "Área de Remanescente de Vegetação Nativa" na seção Cobertura do Solo. Este valor é INDEPENDENTE da RL — é toda a vegetação nativa do imóvel.
- municipality: Município
- state: UF/Estado
- owner_name: Nome do Proprietário/Possuidor
- owner_cpf_cnpj: CPF ou CNPJ do proprietário
- registration_numbers: Números de matrículas separados por vírgula
- registration_details: Matrículas completas — número, data, livro, folha, município do cartório, uma por linha
- coordinates: Coordenadas "LAT,LNG" decimais negativas para Sul/Oeste

DO DEMONSTRATIVO DE SITUAÇÃO (quando presente):
- last_rectification_date: Data da Última Retificação no formato YYYY-MM-DD
- car_last_update: Data da Última Retificação no formato YYYY-MM-DD (mesmo valor)
- car_situation: Situação do Cadastro ("Ativo", "Cancelado", "Pendente de análise")

INSTRUÇÕES CRÍTICAS PARA EXTRAÇÃO DA REGULARIDADE AMBIENTAL:
- passive_rl_balance_hectares: Extrair EXCLUSIVAMENTE do campo "Passivo / Excedente de Reserva Legal" da tabela de Regularidade Ambiental. Valor NEGATIVO = déficit (falta declarar mais RL). Valor POSITIVO = excedente. Exemplo: "-16,05" → extrair como -16.05. NÃO confundir com "RL a Recompor" — são campos DIFERENTES na mesma tabela.
- legal_reserve_to_recover_hectares: Extrair EXCLUSIVAMENTE do campo "Área de Reserva Legal a recompor" da tabela de Regularidade Ambiental. Significa: área que FOI declarada como RL, mas que o SICAR identificou SEM vegetação nativa efetiva. Pode ser 0,00 mesmo quando há passivo — significa que toda a RL declarada tem vegetação, mas a área declarada é insuficiente. NÃO usar o valor do Passivo/Excedente aqui.
- app_to_recover_hectares: Extrair EXCLUSIVAMENTE do campo "Áreas de Preservação Permanente a recompor" da tabela de Regularidade Ambiental. Significa: área de APP que o SICAR identificou SEM cobertura vegetal.
- use_restriction_to_recover_hectares: Extrair EXCLUSIVAMENTE do campo "Área de Uso Restrito a recompor" da tabela de Regularidade Ambiental.
ATENÇÃO: Estes 4 campos têm linhas SEPARADAS na tabela do Demonstrativo. Leia cada linha individualmente. NÃO some nem misture valores entre linhas.

CAMPOS COMUNS (preencher com base nos documentos disponíveis):
- car_status: "Validado", "Em análise pelo órgão ambiental", "Pendente de análise", "Com inconsistências", "Cancelado", "Necessita retificação"
- environmental_liabilities: Array — ["Déficit de Reserva Legal", "Déficit de APP", "Área degradada", "Uso irregular em APP", "Compensação de Reserva Legal", "Servidão ambiental"]
- car_notes: Resumo das observações e regularidade ambiental
- ai_analysis: Análise técnica em português (máx 400 palavras) considerando: 1. Situação cadastral e status do CAR; 2. Passivo/Excedente de RL: diferença entre RL exigida por lei (20% da área) e RL declarada — valor negativo indica que falta DECLARAR mais área de RL; 3. RL a Recompor: área declarada como RL mas SEM vegetação nativa efetiva conforme SICAR — indica necessidade de recomposição/plantio dentro da RL já declarada; 4. APP a Recompor: área de APP sem cobertura vegetal — necessidade de restauração das margens e encostas; 5. Veg. Nativa Remanescente: total de mata nativa existente no imóvel (pode ser usada para justificar RL por compensação). NÃO confundir Passivo de RL com RL a Recompor — são passivos de naturezas diferentes.

Para coordenadas: converta graus/minutos/segundos para decimal (Sul/Oeste = negativo).
Para datas: formato YYYY-MM-DD.
Para campos não encontrados nos documentos disponíveis: use null.`;
}

function buildFormData(result, docType) {
  const liabilities = [...(result.environmental_liabilities || [])];
  if (result.legal_reserve_to_recover_hectares > 0 && !liabilities.includes('Déficit de Reserva Legal')) {
    liabilities.push('Déficit de Reserva Legal');
  }
  if (result.app_to_recover_hectares > 0 && !liabilities.includes('Déficit de APP')) {
    liabilities.push('Déficit de APP');
  }

  return {
    car_number: result.car_number || '',
    car_status: result.car_status || 'Pendente de análise',
    car_registration_date: result.car_registration_date || '',
    car_last_update: result.car_last_update || '',
    car_area_hectares: result.car_area_hectares || '',
    car_notes: result.car_notes || '',
    ai_analysis: result.ai_analysis || '',
    environmental_liabilities: liabilities,
    app_hectares: result.app_hectares || '',
    legal_reserve_hectares: result.legal_reserve_hectares || '',
    consolidated_area_hectares: result.consolidated_area_hectares || '',
    legal_reserve_to_recover_hectares: (() => {
      const raw = result.legal_reserve_to_recover_hectares;
      if (raw === null || raw === undefined) return '';
      const parsed = parseFloat(String(raw).replace(',', '.'));
      return isNaN(parsed) ? '' : parsed;
    })(),
    app_to_recover_hectares: (() => {
      const raw = result.app_to_recover_hectares;
      if (raw === null || raw === undefined) return '';
      const parsed = parseFloat(String(raw).replace(',', '.'));
      return isNaN(parsed) ? '' : parsed;
    })(),
    owner_name: result.owner_name || '',
    municipality: result.municipality || '',
    state: result.state || '',
    registration_numbers: result.registration_numbers || '',
    coordinates: result.coordinates || '',
    native_vegetation_hectares: (() => {
      const raw = result.native_vegetation_hectares;
      if (raw === null || raw === undefined) return '';
      const parsed = parseFloat(String(raw).replace(',', '.'));
      return isNaN(parsed) ? '' : parsed;
    })(),
    passive_rl_balance_hectares: (() => {
      const raw = result.passive_rl_balance_hectares;
      if (raw === null || raw === undefined) return '';
      const normalized = String(raw).replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? '' : parsed;
    })(),
    use_restriction_to_recover_hectares: (() => {
      const raw = result.use_restriction_to_recover_hectares;
      if (raw === null || raw === undefined) return '';
      const parsed = parseFloat(String(raw).replace(',', '.'));
      return isNaN(parsed) ? '' : parsed;
    })(),
    car_situation: result.car_situation || '',
    owner_cpf_cnpj: result.owner_cpf_cnpj || '',
    last_rectification_date: result.last_rectification_date || '',
    registration_details: result.registration_details || '',
    // Internal fields for property update
    _app_hectares: result.app_hectares,
    _legal_reserve_hectares: result.legal_reserve_hectares,
    _coordinates: result.coordinates,
    _municipality: result.municipality,
    _state: result.state,
    _owner_name: result.owner_name,
    _registration_numbers: result.registration_numbers,
    _ai_analysis: result.ai_analysis,
    _doc_type: docType,
    _file_url: result._file_url || '',
    _consolidated_area: result.consolidated_area_hectares,
    _legal_reserve_to_recover: result.legal_reserve_to_recover_hectares,
    _app_to_recover: result.app_to_recover_hectares,
    _missing_demonstrativo: docType === 'recibo',
    _missing_recibo: docType === 'demonstrativo',
  };
}

export default function CARSmartUpload({ onDataExtracted, onClose }) {
  const [step, setStep] = useState('choose'); // 'choose' | 'upload' | 'analyzing' | 'done'
  const [selectedType, setSelectedType] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Completo mode state
  const [reciboFile, setReciboFile] = useState(null);
  const [demonstrativoFile, setDemonstrativoFile] = useState(null);
  const reciboInputRef = useRef(null);
  const demonstrativoInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('analyzing');
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(selectedType),
        file_urls: [file_url],
        response_json_schema: { type: 'object', properties: SCHEMA_PROPERTIES },
        model: 'gemini_3_flash',
      });

      setResult({
        ...extracted,
        _file_url: file_url,
        _doc_type: selectedType,
        _missing_demonstrativo: selectedType === 'recibo',
        _missing_recibo: selectedType === 'demonstrativo',
      });
      setStep('done');
    } catch (err) {
      setError('Erro ao processar o PDF. Tente novamente.');
      setStep('upload');
    }

    e.target.value = '';
  };

  const handleUploadCompleto = async () => {
    if (!reciboFile && !demonstrativoFile) return;
    setStep('analyzing');
    setError(null);

    try {
      const fileUrls = [];
      let primaryUrl = null;

      if (reciboFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: reciboFile });
        fileUrls.push(file_url);
        primaryUrl = file_url;
      }
      if (demonstrativoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: demonstrativoFile });
        fileUrls.push(file_url);
        if (!primaryUrl) primaryUrl = file_url;
      }

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: buildPromptCompleto(!!reciboFile, !!demonstrativoFile),
        file_urls: fileUrls,
        response_json_schema: { type: 'object', properties: SCHEMA_PROPERTIES },
        model: 'gemini_3_flash',
      });

      setResult({
        ...extracted,
        _file_url: primaryUrl,
        _doc_type: 'completo',
        _missing_demonstrativo: false,
        _missing_recibo: false,
      });
      setStep('done');
    } catch (err) {
      setError('Erro ao processar os PDFs. Tente novamente.');
      setStep('upload');
    }
  };

  const handleApply = () => {
    if (!result) return;
    const formData = buildFormData(result, result._doc_type);
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

          <div className="space-y-2">
            {/* Opção destacada: Completo */}
            <div
              onClick={() => { setSelectedType('completo'); setStep('upload'); }}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-emerald-800">Recibo + Demonstrativo (Dados Completos)</p>
                  <span className="text-[10px] bg-emerald-600 text-white rounded px-1.5 py-0.5 font-semibold flex-shrink-0">RECOMENDADO</span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">Envie os dois PDFs de uma vez para extração integral — proprietário, matrículas, regularidade ambiental e áreas a recompor</p>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            </div>

            {/* Opções individuais */}
            {DOC_TYPES.map(dt => (
              <button
                key={dt.id}
                onClick={() => { setSelectedType(dt.id); setStep('upload'); }}
                className="w-full text-left p-4 rounded-xl border-2 transition-all hover:border-gray-300 hover:bg-gray-50 border-gray-200 bg-white group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{dt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-gray-800">{dt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{dt.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1 italic">{dt.hint}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 mt-0.5" />
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

      {/* Step: Upload — single PDF */}
      {step === 'upload' && selectedType !== 'completo' && (
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

      {/* Step: Upload — dual PDFs (completo) */}
      {step === 'upload' && selectedType === 'completo' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => { setStep('choose'); setReciboFile(null); setDemonstrativoFile(null); }} className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <span className="text-sm font-medium text-gray-700">Recibo + Demonstrativo (Dados Completos)</span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">Selecione os dois arquivos PDF do CAR para extração completa</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Dropzone Recibo */}
              <div
                onClick={() => reciboInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${reciboFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
              >
                <input
                  ref={reciboInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setReciboFile(e.target.files[0] || null)}
                />
                {reciboFile
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  : <Upload className="w-6 h-6 text-gray-400" />
                }
                <p className="text-xs font-semibold text-center text-gray-700">
                  {reciboFile ? reciboFile.name : 'Recibo de Inscrição'}
                </p>
                <p className="text-[10px] text-gray-400 text-center">CAR-XXXX.pdf</p>
              </div>

              {/* Dropzone Demonstrativo */}
              <div
                onClick={() => demonstrativoInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${demonstrativoFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
              >
                <input
                  ref={demonstrativoInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setDemonstrativoFile(e.target.files[0] || null)}
                />
                {demonstrativoFile
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  : <Upload className="w-6 h-6 text-gray-400" />
                }
                <p className="text-xs font-semibold text-center text-gray-700">
                  {demonstrativoFile ? demonstrativoFile.name : 'Demonstrativo de Situação'}
                </p>
                <p className="text-[10px] text-gray-400 text-center">Demonstrativo_XX.pdf</p>
              </div>
            </div>

            <Button
              type="button"
              disabled={!reciboFile && !demonstrativoFile}
              onClick={handleUploadCompleto}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {reciboFile && demonstrativoFile
                ? 'Extrair dados completos (2 PDFs)'
                : 'Extrair dados disponíveis (1 PDF)'}
            </Button>

            {(reciboFile || demonstrativoFile) && !(reciboFile && demonstrativoFile) && (
              <p className="text-[10px] text-amber-600 text-center">
                {!reciboFile
                  ? '⚠ Sem o Recibo, CPF/CNPJ e matrículas não serão extraídos'
                  : '⚠ Sem o Demonstrativo, RL/APP a Recompor não serão extraídos'}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <div className="py-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {selectedType === 'completo' && (reciboFile && demonstrativoFile)
                ? 'Analisando 2 documentos com IA...'
                : 'Analisando documento com IA...'}
            </p>
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
              <p className="text-sm font-semibold text-emerald-800">
                {result._doc_type === 'completo' ? 'Dados extraídos e mesclados com sucesso!' : 'Dados extraídos com sucesso!'}
              </p>
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
                { label: 'Situação', value: result.car_situation },
                { label: 'Data de Cadastro', value: result.car_registration_date },
                { label: 'Última Retificação', value: result.last_rectification_date || result.car_last_update },
                { label: 'Área Total', value: result.car_area_hectares ? `${result.car_area_hectares} ha` : null },
                { label: 'APP', value: result.app_hectares ? `${result.app_hectares} ha` : null },
                { label: 'Reserva Legal', value: result.legal_reserve_hectares ? `${result.legal_reserve_hectares} ha` : null },
                { label: 'Área Consolidada', value: result.consolidated_area_hectares ? `${result.consolidated_area_hectares} ha` : null },
                { label: 'Veg. Nativa Remanescente', value: result.native_vegetation_hectares ? `${result.native_vegetation_hectares} ha` : null },
                { label: 'Passivo/Excedente RL', value: result.passive_rl_balance_hectares != null && result.passive_rl_balance_hectares !== '' ? `${result.passive_rl_balance_hectares} ha` : null },
                { label: 'RL a recompor', value: result.legal_reserve_to_recover_hectares ? `${result.legal_reserve_to_recover_hectares} ha` : null },
                { label: 'APP a recompor', value: result.app_to_recover_hectares ? `${result.app_to_recover_hectares} ha` : null },
                { label: 'Uso Restrito a Recompor', value: result.use_restriction_to_recover_hectares ? `${result.use_restriction_to_recover_hectares} ha` : null },
                { label: 'Município/UF', value: result.municipality && result.state ? `${result.municipality}/${result.state}` : result.municipality },
                { label: 'Proprietário', value: result.owner_name },
                { label: 'CPF/CNPJ', value: result.owner_cpf_cnpj },
                { label: 'Matrículas', value: result.registration_numbers },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="font-medium text-gray-900 text-xs text-right max-w-[60%] truncate" title={String(value)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {result._missing_demonstrativo && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Dados de Regularidade Ambiental indisponíveis</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Você enviou o Recibo de Inscrição. Para obter RL a Recompor, APP a Recompor e Passivo Ambiental calculado pelo SICAR,
                  adicione também o <strong>Demonstrativo de Situação</strong> (disponível em car.gov.br com o número do CAR).
                </p>
              </div>
            </div>
          )}
          {result._missing_recibo && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800">Dados do proprietário e matrículas indisponíveis</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Você enviou o Demonstrativo. Para obter CPF/CNPJ do proprietário e matrículas detalhadas,
                  adicione também o <strong>Recibo de Inscrição</strong>.
                </p>
              </div>
            </div>
          )}

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
              onClick={() => { setStep('choose'); setResult(null); setReciboFile(null); setDemonstrativoFile(null); }}
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
