# Mapa Interativo - Guia de Funcionalidades

## 🎯 Visão Geral

O Mapa Interativo foi aprimorado para funcionar como uma ferramenta de nível Google Earth, focada em cadastro técnico de propriedades rurais e áreas ambientais.

## ✨ Funcionalidades Principais

### 1. **Delimitação de Áreas** (Core Principal)
- **Desenho Manual de Polígonos**: Clique no mapa para criar vértices
- **Fechamento Automático**: Ao desenhar, clique no primeiro ponto ou use a opção "Finalizar"
- **Medições em Tempo Real**:
  - Área em hectares
  - Perímetro em km
  - Número de vértices
  - Distâncias em metros

#### Como Usar:
1. Clique em "Desenhar Área" na barra de ferramentas
2. Clique no mapa para adicionar vértices (pontos)
3. Clique novamente no primeiro ponto para fechar o polígono
4. Ou use o botão "Finalizar" após completar
5. Use "Salvar" para persistir a área na propriedade

### 2. **Inserção por Coordenadas**
- **Latitude/Longitude Decimal**: -15.7801, -47.9292
- **Suporte para UTM**: Planejado para versões futuras
- **Validação Automática**: Verifica coordenadas inválidas
- **Criação Automática de Polígono**: A partir de 3+ pontos

#### Como Usar:
1. Clique em "Coordenadas" na barra superior do mapa
2. Insira latitude e longitude
3. Clique em "Adicionar Ponto"
4. Repita para múltiplos pontos (mínimo 3)
5. Clique em "Criar Polígono"
6. Use "Salvar" para persistir

### 3. **Importação de Dados Geoespaciais**
- **Formatos Suportados**: KML, KMZ
- **Renderização Automática**: Arquivos importados aparecem imediatamente no mapa
- **Múltiplas Camadas**: Importe vários arquivos simultaneamente
- **Cores Dinâmicas**: Cada KML recebe uma cor única

#### Como Usar:
1. Na seção "KML", clique em "Importar KML"
2. Selecione arquivo(s) .kml ou .kmz
3. A camada aparece automaticamente no mapa
4. Clique na chip da camada para alternar visibilidade
5. Use o "X" para remover a camada

### 4. **Sistema de Camadas (Layers)**

#### Camadas Disponíveis:
| Camada | Cores | Descrição |
|--------|-------|-----------|
| **Satélite Google** | 🛰️ | Base cartográfica |
| **CAR** | 🟡 Amarelo | Limite da propriedade |
| **APP** | 🔵 Azul | Área de Preservação Permanente |
| **Reserva Legal** | 🟢 Verde | Reserva Legal obrigatória |
| **Recuperação** | 🔴 Vermelho | Área em recuperação (PRAD) |
| **Consolidada** | 🟣 Roxo | Área consolidada |
| **KML Importado** | 🎨 Cores dinâmicas | Arquivos do usuário |

#### Como Usar:
1. Na barra de controle, alterne cada camada
2. Múltiplas camadas podem estar ativas simultaneamente
3. A **Legenda** no canto inferior esquerdo mostra camadas ativas

### 5. **Ferramentas de Medição**

#### Medições Disponíveis:
- **Área do Polígono**: em hectares (ha)
- **Perímetro**: em quilômetros (km) e metros (m)
- **Número de Vértices**: contagem de pontos
- **Estatísticas Detalhadas**: Perímetro total

#### Como Usar:
1. Desenhe ou importe uma área
2. Clique em "Medir" na barra superior
3. Veja medições em tempo real

### 6. **Visualização em Tela Cheia**
- **Modo Imersivo**: Expande o mapa para a tela inteira
- **Preserva Ferramentas**: Todas as funcionalidades continuam disponíveis

#### Como Usar:
1. Clique em "Tela Cheia" na barra de ferramentas
2. Use "Sair Tela Cheia" para voltar ao modo normal

### 7. **Exportação de Dados**
- **Exportar como KML**: Compatível com Google Earth
- **Compatibilidade**: Áreas desenhadas, CAR, APP, Reserva Legal, etc.

#### Como Usar:
1. Na seção "KML", procure "Exportar:"
2. Clique no botão da camada desejada (ex: CAR, APP)
3. Arquivo é baixado automaticamente

## 📊 Análise Visual

### Informações da Propriedade
O mapa exibe automaticamente:
- **Nome da Propriedade**
- **Localização**: Cidade, Estado
- **Área Total**: em hectares
- **Números de CAR**: Se disponíveis
- **Status do CAR**: Validado, Pendente, etc.

### Medições Rápidas (Cards Inferiores)
- **Reserva Legal**: ha obrigatória
- **APP**: ha de preservação
- **Área Total**: ha total da propriedade

## 🔄 Salvamento Automático

- **Desenhos**: Salvos ao clicar "Salvar"
- **Camadas KML**: Salvas automaticamente ao importar
- **Visibilidade de Camadas**: Mantida durante a sessão

## 💡 Dicas de Uso

1. **Desenho Preciso**: Faça zoom antes de desenhar áreas pequenas
2. **Validação**: Todas as coordenadas são validadas antes de criar polígonos
3. **Múltiplas Propriedades**: Use o seletor no topo para alternar entre propriedades
4. **Importar CAR**: Importe o KML do SICAR para referenciar o limite oficial
5. **Análise NDVI**: Após desenhar, você pode analisar vegetação com Google Earth Engine

## ⚠️ Limitações Conhecidas

- UTM: Suporte planejado para versão futura
- GeoJSON: Importação direta ainda não implementada
- Shapefile: Requer conversão prévia para KML
- Performance: Otimizada para até 10-15 polígonos simultâneos

## 🚀 Próximas Versões

- [ ] Suporte a coordenadas UTM
- [ ] Importação de GeoJSON
- [ ] Ferramenta de medição de distância livre
- [ ] Cálculo de sobreposição entre áreas
- [ ] Integração com dados de satélite Sentinel-2
- [ ] Exportação para múltiplos formatos
- [ ] Versão mobile otimizada com toque

## 📞 Suporte

Para dúvidas ou bugs, entre em contato com o suporte através da página "Suporte" da plataforma.