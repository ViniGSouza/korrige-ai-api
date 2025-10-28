# ADR 004: Integração com Múltiplas IAs (Claude e OpenAI)

## Status
Aceito

## Contexto
Precisamos corrigir redações do ENEM usando IA. Há vários provedores de LLM no mercado, cada um com vantagens e desvantagens:

- **Claude (Anthropic)**: Excelente em análise de texto, bom contexto
- **OpenAI (GPT-4)**: Muito popular, boa qualidade, JSON mode nativo

A dependência de um único provedor pode causar:
- Vendor lock-in
- Indisponibilidade sem fallback
- Falta de flexibilidade para otimizar custo/qualidade

## Decisão
Implementamos **suporte a múltiplos provedores de IA** (Claude e OpenAI) com **seleção por requisição**.

### Arquitetura

```typescript
interface AIService {
  correctEssay(essayText: string): Promise<EssayCorrection>
}

class ClaudeService implements AIService { ... }
class OpenAIService implements AIService { ... }
```

### Formato de Saída Padronizado

Ambos os serviços retornam o mesmo formato:

```typescript
{
  competency1: { score, feedback, strengths, improvements },
  competency2: { ... },
  competency3: { ... },
  competency4: { ... },
  competency5: { ... },
  totalScore: 0-1000,
  overallFeedback: "..."
}
```

### Modelos Utilizados

| Provedor | Modelo | Contexto | Custo/1M tokens |
|----------|--------|----------|-----------------|
| Anthropic | claude-3-5-sonnet-20241022 | 200k | $3/$15 (in/out) |
| OpenAI | gpt-4o | 128k | $2.50/$10 (in/out) |

### Prompt Engineering

Ambos os prompts seguem a mesma estrutura:
1. **System Prompt**: Define papel (corretor ENEM), critérios, formato de saída
2. **User Prompt**: Texto da redação a ser corrigida

**Diferenças**:
- **OpenAI**: Usa `response_format: { type: 'json_object' }` para garantir JSON
- **Claude**: Instruções mais explícitas no prompt para retornar JSON

## Consequências

### Positivas
✅ **Flexibilidade**: Usuário escolhe qual IA usar
✅ **Redundância**: Se um provedor falhar, outro está disponível
✅ **Otimização de custo**: Pode escolher mais barato
✅ **Comparação de qualidade**: Permite testar qual IA performa melhor
✅ **Migração suave**: Fácil adicionar novos provedores

### Negativas
⚠️ **Complexidade**: Manter dois SDKs e prompts sincronizados
⚠️ **Custos**: Precisa de API keys de ambos
⚠️ **Consistência**: Respostas podem variar entre provedores
⚠️ **Testing**: Precisa testar ambos

## Implementação

### Seleção de Provedor

```typescript
// Cliente escolhe ao criar redação
POST /essays
{
  "title": "...",
  "content": "...",
  "aiProvider": "claude" // ou "openai"
}
```

### Processamento

```typescript
// Lambda process-essay
const correction = aiProvider === 'openai'
  ? await openaiService.correctEssay(essayText)
  : await claudeService.correctEssay(essayText);
```

## Alternativas Consideradas

### 1. Apenas um provedor (Claude ou OpenAI)
- ✅ Mais simples
- ❌ Vendor lock-in
- ❌ Sem redundância

### 2. LangChain para abstração
- ✅ Abstração de múltiplos providers
- ❌ Dependência extra pesada
- ❌ Overhead desnecessário para caso simples

### 3. Fallback automático
- ✅ Alta disponibilidade
- ❌ Custo imprevisível
- ❌ Usuário não controla qual IA usa

## Futuras Extensões

### Possíveis adições:
- ✨ **Google Gemini**: Integrar quando API estabilizar
- ✨ **Llama via Bedrock**: Para reduzir custos
- ✨ **Fallback automático**: Se provedor principal falhar
- ✨ **Cache de correções**: Evitar reprocessar mesmo texto
- ✨ **A/B testing**: Comparar qualidade entre modelos

## Monitoramento

### Métricas por provedor:
- Taxa de sucesso/falha
- Tempo médio de processamento
- Custo por correção
- Score médio atribuído
- Satisfação do usuário
