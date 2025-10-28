# ADR 003: Processamento Assíncrono com SQS

## Status
Aceito

## Contexto
A correção de redações envolve:
1. Extração de texto de arquivos (imagens, PDF, DOCX)
2. Chamadas para APIs de IA (Claude/OpenAI) que podem levar 10-60 segundos
3. Processamento pode falhar (API indisponível, erro de parse, etc)

Processar de forma síncrona causaria:
- Timeout em requisições HTTP (API Gateway tem limite de 30s)
- Má experiência do usuário (espera longa)
- Falta de retry em caso de falha

## Decisão
Adotamos **processamento assíncrono** usando **Amazon SQS** com Dead Letter Queue (DLQ).

### Arquitetura

```
Cliente → API (create-essay) → DynamoDB (status: pending)
                              ↓
                              SQS Queue
                              ↓
                        Lambda (process-essay)
                              ↓
                        API de IA (Claude/OpenAI)
                              ↓
                        DynamoDB (status: completed)

[Falha após 3 tentativas] → Dead Letter Queue → SNS → Alarme
```

### Configuração SQS

#### Fila Principal (EssayProcessingQueue)
- **VisibilityTimeout**: 300s (5 min)
- **MessageRetentionPeriod**: 345600s (4 dias)
- **ReceiveMessageWaitTimeSeconds**: 20 (long polling)
- **RedrivePolicy**: Máximo 3 tentativas, depois vai para DLQ

#### Dead Letter Queue (EssayProcessingDLQ)
- **MessageRetentionPeriod**: 1209600s (14 dias)
- **Alarme CloudWatch**: Notifica quando mensagens chegam na DLQ

### Fluxo de Processamento

1. **Criação**: API recebe requisição e salva redação com `status: pending`
2. **Enfileiramento**: Mensagem enviada para SQS
3. **Processamento**: Lambda é acionada pela SQS
   - Extrai texto do arquivo (se necessário)
   - Atualiza status para `processing`
   - Chama API de IA
   - Salva correção e atualiza status para `completed`
4. **Retry automático**: Se falhar, SQS reprocessa até 3 vezes
5. **DLQ**: Após 3 falhas, vai para DLQ e alarme é disparado

## Consequências

### Positivas
✅ **Resiliência**: Retry automático em caso de falha
✅ **Escalabilidade**: SQS processa múltiplas mensagens em paralelo
✅ **Desacoplamento**: API não depende do tempo de processamento
✅ **UX melhor**: Cliente recebe resposta instantânea
✅ **Observabilidade**: DLQ permite identificar e corrigir erros

### Negativas
⚠️ **Complexidade**: Mais componentes para gerenciar
⚠️ **Eventual consistency**: Redação não é corrigida imediatamente
⚠️ **Custo adicional**: SQS + Lambda adicional

## Alternativas Consideradas

### 1. Processamento Síncrono
- ❌ Timeout de API Gateway (30s)
- ❌ Sem retry automático
- ❌ Má UX (espera longa)
- ✅ Mais simples

### 2. Step Functions
- ❌ Custo mais alto
- ❌ Mais complexo para caso de uso simples
- ✅ Melhor visualização de workflow
- ✅ Retry mais sofisticado

### 3. EventBridge
- ❌ Não tem fila (mensagens podem ser perdidas)
- ❌ Menos controle sobre retry
- ✅ Melhor para event-driven architecture

## Monitoramento

### Métricas Importantes
- **ApproximateNumberOfMessagesVisible**: Mensagens na fila
- **ApproximateAgeOfOldestMessage**: Idade da mensagem mais antiga
- **NumberOfMessagesSent**: Taxa de envio
- **NumberOfMessagesDeleted**: Taxa de processamento

### Alarmes
- ✅ Mensagens na DLQ (configurado)
- 📋 Backlog alto na fila (recomendado)
- 📋 Idade de mensagens muito alta (recomendado)
