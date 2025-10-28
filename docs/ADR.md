# Architecture Decision Records (ADRs)

Este documento contém as principais decisões arquiteturais do projeto Corrige AI API.

## Índice

1. [ADR-001: Clean Architecture com Injeção de Dependências](#adr-001-clean-architecture-com-injeção-de-dependências)
2. [ADR-002: Serverless com AWS Lambda](#adr-002-serverless-com-aws-lambda)
3. [ADR-003: Single Table Design no DynamoDB](#adr-003-single-table-design-no-dynamodb)
4. [ADR-004: Processamento Assíncrono com SQS](#adr-004-processamento-assíncrono-com-sqs)
5. [ADR-005: Múltiplos Provedores de IA](#adr-005-múltiplos-provedores-de-ia)
6. [ADR-006: Upload via Presigned URLs](#adr-006-upload-via-presigned-urls)
7. [ADR-007: Autenticação com AWS Cognito](#adr-007-autenticação-com-aws-cognito)
8. [ADR-008: TypeScript com ESM](#adr-008-typescript-com-esm)

---

## ADR-001: Clean Architecture com Injeção de Dependências

**Status**: Aceito (em migração gradual)

**Data**: 2025-10-27

### Contexto

O projeto inicialmente foi construído com Services instanciados diretamente nos Lambda handlers, resultando em:
- Forte acoplamento entre camadas
- Dificuldade para testes unitários
- Duplicação de código entre Services e Providers
- Lógica de negócio misturada com infraestrutura

### Decisão

Adotar **Clean Architecture** com três camadas claramente definidas:

1. **Application Layer** (`src/application/`)
   - `contracts/` - Interfaces (IAIProvider, IStorageProvider, etc)
   - `usecases/` - Casos de uso com regras de negócio
   - `entities/` - Entidades de domínio
   - `controllers/` - Controllers HTTP

2. **Infrastructure Layer** (`src/infra/`)
   - Implementações concretas das interfaces
   - Providers: ClaudeAIProvider, OpenAIProvider, S3StorageProvider, etc
   - Repositórios: EssayRepository, UserRepository

3. **Presentation Layer** (`src/functions/`)
   - Lambda handlers (camada fina)
   - Apenas recebe request, chama use case, retorna response

### DI Container

Criado `src/kernel/di/container.ts` que:
- Instancia todos os Providers e Repositories
- Injeta dependências nos Use Cases
- Resolve todo o grafo de dependências
- Segue pattern Singleton

### Benefícios

- **Testabilidade**: Use Cases podem ser testados com mocks
- **Desacoplamento**: Dependências são injetadas via interfaces
- **Flexibilidade**: Trocar implementações sem alterar lógica de negócio
- **Manutenibilidade**: Separação clara de responsabilidades
- **Eliminação de duplicação**: Código consolidado nos Providers

### Status de Migração

- ✅ **Providers**: Totalmente implementados
- ✅ **FileProcessorProvider**: Criado e integrado
- ✅ **ProcessEssayUseCase**: Migrado para usar DI
- ✅ **Lambda process-essay.ts**: Refatorado para Clean Architecture (110+ linhas → 25 linhas)
- ⚠️ **Handlers Legados**: Auth, Users e alguns Essays ainda usam Services diretamente

### Consequências

**Positivas**:
- Código mais limpo e testável
- Lambda handlers extremamente simples
- Fácil adicionar novos provedores de IA
- Redução de ~80% no código dos handlers

**Negativas**:
- Curva de aprendizado inicial
- Migração gradual em andamento
- Alguns handlers ainda usam Services legados

---

## ADR-002: Serverless com AWS Lambda

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Necessidade de uma API escalável que possa lidar com cargas de trabalho variáveis sem gerenciamento de servidores.

### Decisão

Utilizar arquitetura 100% serverless com:
- **AWS Lambda** para execução de código
- **API Gateway** (HTTP API) para endpoints REST
- **Serverless Framework** para IaC e deployment

### Benefícios

- **Escalabilidade automática**: Lambda escala de 0 a milhares de instâncias
- **Custo otimizado**: Pay-per-use, sem custo fixo
- **Zero manutenção**: Sem servidores para gerenciar
- **Alta disponibilidade**: Multi-AZ por padrão
- **Deploy simples**: Um comando (`serverless deploy`)

### Configuração

- **Runtime**: Node.js 22.x (ESM)
- **Timeout**: 30 segundos
- **Memory**: 512 MB
- **Logs**: CloudWatch com retenção de 7 dias
- **Cold start**: Mitigado com código otimizado

### Consequências

**Positivas**:
- Infraestrutura elástica
- Custo ~$0 em free tier
- Operação simplificada

**Negativas**:
- Cold starts podem adicionar latência inicial
- Limites de timeout (15 min no Lambda)
- Vendor lock-in com AWS

---

## ADR-003: Single Table Design no DynamoDB

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Necessidade de um banco de dados NoSQL performático e escalável, mas sem complexidade de múltiplas tabelas.

### Decisão

Usar **Single Table Design** no DynamoDB com uma única tabela para todas as entidades.

### Estrutura

**Tabela**: `corrige-ai-main-table`

| Entidade | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|----------|----|----|--------|--------|--------|--------|
| User | USER#{userId} | USER#{userId} | USER#EMAIL#{email} | USER#EMAIL#{email} | - | - |
| Essay | USER#{userId} | ESSAY#{essayId} | ESSAY#STATUS#{status} | ESSAY#{timestamp} | ESSAY#USER#{userId} | ESSAY#{timestamp} |

### Índices

- **Primary Key**: PK + SK (acesso direto por ID)
- **GSI1**: GSI1PK + GSI1SK (busca por email, filtro por status)
- **GSI2**: GSI2PK + GSI2SK (redações por usuário ordenadas por data)

### Benefícios

- **Performance**: Acesso em milissegundos
- **Escalabilidade**: Auto-scaling ilimitado
- **Custo**: Modelo on-demand eficiente
- **Simplicidade**: Uma única tabela para gerenciar

### Consequências

**Positivas**:
- Queries extremamente rápidas
- Baixo custo operacional
- Fácil de entender o modelo

**Negativas**:
- Curva de aprendizado para Single Table Design
- Mudanças de schema requerem planejamento
- Difícil fazer queries ad-hoc complexas

---

## ADR-004: Processamento Assíncrono com SQS

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Correção de redações pode levar 10-60 segundos (dependendo da IA), o que excede o timeout recomendado para APIs síncronas.

### Decisão

Implementar **processamento assíncrono** usando SQS:

1. **Endpoint `/essays` (POST)**: Salva redação no DynamoDB com status `pending` e enfileira mensagem no SQS
2. **Lambda process-essay**: Triggered por SQS, executa ProcessEssayUseCase
3. **Cliente**: Faz polling em `/essays/{id}` para verificar status

### Arquitetura

```
POST /essays → DynamoDB (pending) → SQS → Lambda process-essay → IA → DynamoDB (completed)
```

### Dead Letter Queue (DLQ)

- Mensagens que falham após 3 tentativas vão para DLQ
- Alarme CloudWatch notifica via SNS quando há mensagens na DLQ

### Benefícios

- **Desacoplamento**: API responde imediatamente
- **Resiliência**: Retry automático em caso de falha
- **Escalabilidade**: SQS absorve picos de demanda
- **Observabilidade**: Fácil identificar falhas via DLQ

### Consequências

**Positivas**:
- API sempre responsiva (< 1s)
- Tolerância a falhas
- Processamento pode escalar independentemente

**Negativas**:
- Cliente precisa fazer polling
- Complexidade adicional no fluxo
- Custo adicional do SQS (mínimo)

---

## ADR-005: Múltiplos Provedores de IA

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Diferentes modelos de IA têm diferentes características de qualidade, custo e latência.

### Decisão

Suportar **múltiplos provedores de IA** via interface `IAIProvider`:

1. **ClaudeAIProvider** - Anthropic Claude 3.5 Sonnet
   - Melhor qualidade de correção
   - Mais caro (~$0.05/correção)
   - API simples

2. **OpenAIProvider** - OpenAI GPT-4o
   - Boa qualidade
   - Custo intermediário (~$0.03/correção)
   - Suporte nativo a JSON mode

### Interface Comum

```typescript
interface IAIProvider {
  correctEssay(params: CorrectEssayParams): Promise<EssayCorrection>;
}
```

### Seleção do Provider

Cliente escolhe via campo `aiProvider` no request:

```json
{
  "title": "Minha redação",
  "content": "...",
  "aiProvider": "claude" // ou "openai"
}
```

### Benefícios

- **Flexibilidade**: Cliente escolhe custo vs qualidade
- **Resiliência**: Fallback se um provider falhar
- **Competição**: Melhores preços e qualidade
- **Experimentação**: Fácil adicionar novos modelos (Gemini, Llama, etc)

### Consequências

**Positivas**:
- Não dependemos de um único vendor
- Podemos otimizar custo
- Fácil adicionar novos providers

**Negativas**:
- Manutenção de múltiplas integrações
- Custo de 2 API keys

---

## ADR-006: Upload via Presigned URLs

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Uploads de imagens/PDFs grandes (até 10MB) via API Gateway têm limitações:
- Payload máximo de 10MB
- Timeout de API Gateway
- Consumo de Lambda memory/CPU

### Decisão

Usar **Presigned URLs** do S3 para upload direto:

1. Cliente chama `POST /essays/upload-url` com metadata do arquivo
2. API gera presigned URL (válida por 5 minutos)
3. Cliente faz `PUT` direto para S3 usando a URL
4. Cliente cria redação com o `fileKey` retornado

### Fluxo

```
1. POST /essays/upload-url → API retorna presignedUrl + fileKey
2. PUT {presignedUrl} (direto para S3)
3. POST /essays com fileKey
```

### Benefícios

- **Performance**: Upload direto para S3 (rápido)
- **Custo**: Sem processamento via Lambda
- **Escalabilidade**: S3 absorve qualquer carga
- **Segurança**: URL expira em 5 minutos

### Consequências

**Positivas**:
- Uploads rápidos e confiáveis
- Lambda não processa bytes do arquivo
- Custo otimizado

**Negativas**:
- Fluxo em 3 passos (mais complexo)
- Cliente precisa implementar upload S3

---

## ADR-007: Autenticação com AWS Cognito

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Necessidade de autenticação segura sem implementar sistema próprio de gerenciamento de usuários.

### Decisão

Usar **AWS Cognito** com JWT tokens:

- **User Pool**: Gerencia usuários, senhas e MFA
- **JWT Authorizer**: API Gateway valida tokens automaticamente
- **Políticas de senha**: Mínimo 8 caracteres, maiúscula, número, símbolo

### Fluxo de Autenticação

1. `POST /auth/sign-up` → Cria usuário no Cognito
2. `POST /auth/confirm-sign-up` → Confirma email
3. `POST /auth/sign-in` → Retorna tokens (access, id, refresh)
4. Request com header `Authorization: Bearer {accessToken}`
5. API Gateway valida token automaticamente

### Benefícios

- **Segurança**: Implementação battle-tested da AWS
- **Zero manutenção**: AWS gerencia tudo
- **Compliance**: GDPR, HIPAA ready
- **Features prontas**: Password reset, MFA, email verification
- **Custo**: Free tier até 50k usuários ativos

### Consequências

**Positivas**:
- Não precisamos implementar auth
- Segurança de nível enterprise
- Escalável e confiável

**Negativas**:
- Vendor lock-in
- Customização limitada
- UI do Cognito não é muito amigável

---

## ADR-008: TypeScript com ESM

**Status**: Aceito

**Data**: 2025-10-27

### Contexto

Necessidade de type safety e módulos modernos do JavaScript.

### Decisão

Usar **TypeScript** com **ES Modules** (ESM):

- `"type": "module"` no package.json
- Imports com `.js` extension (mesmo sendo `.ts`)
- Target: ES2022
- Node.js 22.x (LTS com suporte nativo a ESM)

### Build

- **esbuild**: Transpilação e bundling extremamente rápido
- **serverless-esbuild**: Plugin para Serverless Framework
- Minificação desabilitada para melhor debugging
- Source maps habilitados

### Validação

- **Zod**: Schemas de validação runtime
- **TypeScript**: Validação em compile time
- Separação entre tipos de domínio e DTOs

### Benefícios

- **Type Safety**: Erros em compile time
- **DX**: Autocompleção e refactoring
- **Performance**: ESM é mais rápido que CommonJS
- **Modernidade**: Usa features mais recentes do JS

### Consequências

**Positivas**:
- Menos bugs em produção
- Melhor manutenibilidade
- Build rápido (~2-3s)

**Negativas**:
- Necessário especificar `.js` nos imports
- Algumas bibliotecas ainda não suportam ESM bem
- Curva de aprendizado para ESM

---

## Futuras Decisões a Documentar

À medida que o projeto evolui, novas ADRs devem ser criadas para:

- [ ] **ADR-009**: Estratégia de testes (unit, integration, e2e)
- [ ] **ADR-010**: CI/CD pipeline com GitHub Actions
- [ ] **ADR-011**: Estratégia de versionamento de API
- [ ] **ADR-012**: Monitoramento e observabilidade avançada
- [ ] **ADR-013**: Caching de correções
- [ ] **ADR-014**: Rate limiting e throttling

---

## Como Usar Este Documento

1. **Ao tomar decisões arquiteturais importantes**, documente aqui
2. **Formato**: Contexto → Decisão → Consequências
3. **Mantenha atualizado**: Revise quando arquitetura mudar
4. **Compartilhe**: Use como onboarding para novos desenvolvedores

## Referências

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [DynamoDB Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
