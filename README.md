# Corrige AI API

API serverless para correção automatizada de redações do ENEM usando inteligência artificial (Claude e GPT-4).

## Visão Geral

Sistema backend construído com AWS Lambda e Serverless Framework que recebe redações (texto, imagem, PDF ou DOCX), extrai o conteúdo, envia para modelos de IA especializados e retorna correção detalhada baseada nas 5 competências do ENEM.

### Principais Funcionalidades

- **Autenticação de usuários** via AWS Cognito (sign-up, sign-in, recuperação de senha)
- **Upload de redações** em múltiplos formatos (texto, imagem, PDF, DOCX)
- **Processamento assíncrono** via SQS com Dead Letter Queue
- **Correção com IA** usando Claude 3.5 Sonnet ou GPT-4o
- **OCR automático** com AWS Textract para imagens
- **Gestão de redações** (listar, buscar, deletar)
- **Perfil de usuário** (visualizar e atualizar)

## Arquitetura

### Stack Tecnológica

- **Runtime**: Node.js 22.x + TypeScript
- **Framework**: Serverless Framework
- **Infraestrutura**: AWS (100% serverless)
- **Build**: esbuild
- **Validação**: Zod
- **Gerenciador**: pnpm

### Serviços AWS

| Serviço | Uso |
|---------|-----|
| **Lambda** | Execução das funções (APIs e processamento) |
| **API Gateway** | HTTP API para endpoints RESTful |
| **DynamoDB** | Banco de dados NoSQL (single table design) |
| **S3** | Armazenamento de arquivos de redações |
| **SQS** | Fila de processamento assíncrono |
| **Cognito** | Autenticação e autorização de usuários |
| **Textract** | OCR para extração de texto de imagens |
| **SNS** | Notificações de alarmes |
| **CloudWatch** | Logs e monitoramento |

### Arquitetura de Processamento

```
┌─────────┐
│ Cliente │
└────┬────┘
     │
     │ POST /essays
     ▼
┌──────────────┐     ┌──────────┐
│ API Gateway  │────▶│ DynamoDB │ (status: pending)
└──────┬───────┘     └──────────┘
       │
       │ enfileira
       ▼
  ┌─────────┐
  │   SQS   │
  └────┬────┘
       │
       │ trigger
       ▼
┌─────────────────┐    ┌────────┐
│ Lambda Process  │───▶│   S3   │ (baixa arquivo)
└────┬────────────┘    └────────┘
     │
     │ extrai texto
     ▼
┌──────────────┐
│ Textract/    │ (se imagem/PDF/DOCX)
│ PDF Parser   │
└──────┬───────┘
       │
       │ corrige
       ▼
┌──────────────┐
│ Claude/      │
│ OpenAI       │
└──────┬───────┘
       │
       │ salva resultado
       ▼
  ┌──────────┐
  │ DynamoDB │ (status: completed)
  └──────────┘
```

## Estrutura do Projeto

```
src/
├── application/          # Camada de aplicação (Clean Architecture)
│   ├── contracts/       # Interfaces (IAIProvider, IStorageProvider, etc)
│   ├── controllers/     # Controllers HTTP
│   ├── entities/        # Entidades de domínio
│   ├── errors/          # Erros customizados
│   └── usecases/        # Casos de uso (regras de negócio)
│
├── infra/               # Camada de infraestrutura
│   ├── ai/             # Providers de IA (Claude, OpenAI)
│   ├── auth/           # Provider de autenticação (Cognito)
│   ├── database/       # Repositórios e serviço DynamoDB
│   ├── file-processor/ # Provider de processamento de arquivos
│   ├── queues/         # Provider de filas (SQS)
│   └── storage/        # Provider de storage (S3)
│
├── kernel/              # Núcleo da aplicação
│   └── di/             # Container de injeção de dependências
│
├── functions/           # Lambda handlers (thin layer)
│   ├── auth/           # Autenticação (sign-up, sign-in, etc)
│   ├── essays/         # Redações (CRUD e processamento)
│   └── users/          # Usuários (perfil)
│
├── shared/              # Código compartilhado
│   ├── config/         # Configurações centralizadas
│   ├── errors/         # Classes de erro
│   ├── schemas/        # Schemas de validação (Zod)
│   ├── services/       # Services legados (em migração)
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilitários (logger, response, etc)
│
└── config/              # Configuração da aplicação
```

### Princípios Arquiteturais

O projeto segue **Clean Architecture** com separação clara de camadas:

1. **Application Layer** - Regras de negócio agnósticas de framework
2. **Infrastructure Layer** - Implementações concretas de interfaces
3. **Presentation Layer** - Lambda handlers (camada fina)

Utiliza **Injeção de Dependências** via DI Container centralizado que resolve todas as dependências.

## Configuração

### Pré-requisitos

- Node.js >= 22.0.0
- pnpm >= 10.5.2
- AWS CLI configurado
- Conta AWS
- API Keys: Anthropic e OpenAI

### Variáveis de Ambiente

Configure as seguintes variáveis via Serverless Dashboard ou `.env`:

```bash
# AWS
AWS_REGION=sa-east-1

# Chaves de IA (obrigatório)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Outras variáveis são injetadas automaticamente pelo CloudFormation
```

### Instalação

```bash
# Instalar dependências
pnpm install

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
```

### Deploy

```bash
# Deploy ambiente de desenvolvimento
pnpm run deploy

# Deploy ambiente de produção
pnpm run deploy:prod

# Remover stack
pnpm run remove
```

### Desenvolvimento Local

```bash
# Executar em modo de desenvolvimento
pnpm run dev
```

## API Endpoints

### Autenticação (Públicos)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/sign-up` | Registrar novo usuário |
| POST | `/auth/sign-in` | Fazer login |
| POST | `/auth/refresh-token` | Renovar access token |
| POST | `/auth/forgot-password` | Solicitar recuperação de senha |
| POST | `/auth/confirm-forgot-password` | Confirmar nova senha |

### Autenticação (Protegidos)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/change-password` | Alterar senha (autenticado) |

### Usuários (Protegidos)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/users/profile` | Obter perfil do usuário |
| PUT | `/users/profile` | Atualizar perfil |

### Redações (Protegidos)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/essays` | Criar nova redação |
| GET | `/essays` | Listar redações do usuário |
| GET | `/essays/{id}` | Obter detalhes de uma redação |
| DELETE | `/essays/{id}` | Deletar redação |
| POST | `/essays/upload-url` | Obter URL pré-assinada para upload |

## Exemplos de Uso

### 1. Registrar Usuário

```bash
POST /auth/sign-up
Content-Type: application/json

{
  "email": "estudante@exemplo.com",
  "password": "SenhaForte123!",
  "name": "João Silva",
  "phoneNumber": "+5511999999999"
}
```

### 2. Fazer Login

```bash
POST /auth/sign-in
Content-Type: application/json

{
  "email": "estudante@exemplo.com",
  "password": "SenhaForte123!"
}

# Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "idToken": "eyJhbGci...",
    "refreshToken": "eyJjdHki...",
    "expiresIn": 3600
  }
}
```

### 3. Criar Redação (com texto direto)

```bash
POST /essays
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "A importância da educação",
  "content": "A educação é fundamental para o desenvolvimento...",
  "aiProvider": "claude"
}
```

### 4. Criar Redação (com arquivo)

**Passo 1: Obter URL de upload**

```bash
POST /essays/upload-url
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fileName": "redacao.jpg",
  "fileType": "image/jpeg",
  "fileSize": 2048000
}

# Response
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "fileKey": "essays/user123/2B9fPTk7r3dVXqV9mLQ7Y8K1zJn.jpg",
    "expiresIn": 300
  }
}
```

**Passo 2: Fazer upload para S3**

```bash
PUT {uploadUrl}
Content-Type: image/jpeg
Body: [arquivo binário]
```

**Passo 3: Criar redação com fileKey**

```bash
POST /essays
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Redação sobre educação",
  "fileKey": "essays/user123/2B9fPTk7r3dVXqV9mLQ7Y8K1zJn.jpg",
  "fileType": "image",
  "aiProvider": "openai"
}
```

### 5. Obter Detalhes da Redação

```bash
GET /essays/{essayId}
Authorization: Bearer {accessToken}

# Response
{
  "success": true,
  "data": {
    "essayId": "2B9fPTk7r3dVXqV9mLQ7Y8K1zJn",
    "userId": "user-123",
    "title": "A importância da educação",
    "status": "completed",
    "correction": {
      "competency1": {
        "score": 180,
        "feedback": "Excelente domínio da norma culta...",
        "strengths": ["Ótima gramática", "Vocabulário rico"],
        "improvements": ["Atenção à pontuação"]
      },
      "competency2": { ... },
      "competency3": { ... },
      "competency4": { ... },
      "competency5": { ... },
      "totalScore": 920,
      "overallFeedback": "Redação muito bem desenvolvida...",
      "processedAt": "2025-10-27T12:00:00Z",
      "processingTimeMs": 15234
    },
    "createdAt": "2025-10-27T11:00:00Z"
  }
}
```

## Modelo de Dados

### User (DynamoDB)

```typescript
{
  PK: "USER#{userId}",
  SK: "USER#{userId}",
  GSI1PK: "USER#EMAIL#{email}",
  userId: string,
  email: string,
  name: string,
  phoneNumber?: string,
  createdAt: string,
  updatedAt: string
}
```

### Essay (DynamoDB)

```typescript
{
  PK: "USER#{userId}",
  SK: "ESSAY#{essayId}",
  GSI1PK: "ESSAY#STATUS#{status}",
  GSI2PK: "ESSAY#USER#{userId}",
  essayId: string,
  userId: string,
  title: string,
  content?: string,
  fileKey?: string,
  fileType?: "image" | "pdf" | "docx" | "text",
  status: "pending" | "processing" | "completed" | "failed",
  extractedText?: string,
  correction?: {
    competency1-5: { score, feedback, strengths, improvements },
    totalScore: number,
    overallFeedback: string
  },
  aiProvider: "claude" | "openai",
  createdAt: string,
  updatedAt: string
}
```

## Monitoramento e Observabilidade

### CloudWatch Logs

Todos os logs são estruturados em JSON para facilitar consultas:

```json
{
  "level": "info",
  "context": "CreateEssay",
  "message": "Redação criada no DynamoDB",
  "essayId": "2B9fPTk7r3dVXqV9mLQ7Y8K1zJn",
  "timestamp": "2025-10-27T12:00:00.000Z"
}
```

### Alarmes CloudWatch

- **DLQ Messages**: Alerta quando mensagens aparecem na Dead Letter Queue

### Métricas Importantes

- Taxa de sucesso/falha de processamento
- Tempo médio de processamento
- Score médio atribuído
- Distribuição por provedor de IA

## Custos Estimados (AWS Free Tier)

| Serviço | Free Tier | Uso Estimado/Mês | Custo |
|---------|-----------|------------------|-------|
| Lambda | 1M requests, 400k GB-s | 10k requests | $0 |
| API Gateway | 1M requests | 10k requests | $0 |
| DynamoDB | 25 GB, 200M requests | 1 GB, 50k requests | $0 |
| S3 | 5 GB | 2 GB | $0 |
| Cognito | 50k MAUs | 1k usuários | $0 |
| SQS | 1M requests | 20k requests | $0 |
| **TOTAL** | | | **~$0** |

**APIs de IA** (não incluído no Free Tier AWS):
- Claude: ~$3-15 por 1M tokens
- OpenAI: ~$2.50-10 por 1M tokens

Estimativa por correção: $0.05-0.15 (dependendo do tamanho da redação)

## Correção de Redações

### Modelos de IA

- **Claude 3.5 Sonnet** (padrão): Modelo mais recente da Anthropic
- **GPT-4o**: Modelo da OpenAI com formato JSON nativo

### Critérios de Avaliação (5 Competências do ENEM)

Cada redação é avaliada em 5 competências (0-200 pontos cada):

1. **Competência 1**: Domínio da norma culta da língua portuguesa
2. **Competência 2**: Compreensão do tema e aplicação de conceitos
3. **Competência 3**: Seleção e organização de argumentos
4. **Competência 4**: Conhecimento de mecanismos linguísticos
5. **Competência 5**: Proposta de intervenção (agente, ação, meio, finalidade, detalhamento)

**Nota Total**: 0-1000 pontos

### Formato da Resposta

```json
{
  "competency1": {
    "score": 160,
    "feedback": "Texto explicativo...",
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "improvements": ["ponto a melhorar 1", "ponto a melhorar 2"]
  },
  "totalScore": 800,
  "overallFeedback": "Feedback geral da redação",
  "processedAt": "2024-01-27T12:00:00Z",
  "processingTimeMs": 3500
}
```

## Banco de Dados

### DynamoDB - Single Table Design

**Tabela**: `corrige-ai-main-table`

#### Padrões de Access

| Entidade | PK | SK | GSI1PK | GSI1SK |
|----------|----|----|--------|--------|
| User | USER#{userId} | USER#{userId} | USER#EMAIL#{email} | USER#EMAIL#{email} |
| Essay | USER#{userId} | ESSAY#{essayId} | ESSAY#STATUS#{status} | ESSAY#{timestamp} |

## Testes

```bash
# Executar testes
pnpm test

# Testes com coverage
pnpm run test:coverage
```

## Monitoramento e Observabilidade

### CloudWatch Logs

Todos os logs são enviados para CloudWatch com retenção de 7 dias.

### Logger Customizado

Utiliza logger estruturado em JSON:

```typescript
logger.info("Mensagem", { metadata });
logger.error("Erro", error, { context });
```

### Dead Letter Queue (DLQ)

Mensagens que falham após múltiplas tentativas são enviadas para DLQ com alarme SNS.

## Segurança

- **Autenticação**: AWS Cognito com JWT
- **Autorização**: HTTP API Gateway com Cognito Authorizer
- **IAM**: Princípio do menor privilégio para Lambda roles
- **Secrets**: API keys via variáveis de ambiente (não commitadas)
- **CORS**: Configurado para origens específicas
- **Validação**: Schemas Zod em todos os endpoints

## Custos Estimados

### Serviços AWS (por mês - uso moderado)

- Lambda: ~$5-10 (1M invocações)
- DynamoDB: ~$1-5 (on-demand)
- S3: ~$1-3 (armazenamento + transferência)
- Cognito: Gratuito até 50k MAU
- SQS: ~$0.40 (1M requests)
- Textract: ~$1.50 por 1k páginas

### APIs de IA (custos variáveis)

- Claude 3.5 Sonnet: ~$3 / 1M input tokens, ~$15 / 1M output tokens
- GPT-4o: ~$2.50 / 1M input tokens, ~$10 / 1M output tokens

**Custo estimado por correção**: $0.02 - $0.05

## Migração de Código Legado

O projeto está em processo de migração para Clean Architecture:

- ✅ **Providers**: Totalmente implementados com DI
- ✅ **Process Essay**: Migrado para usar DI Container
- ⚠️ **Handlers Legados**: Ainda usam Services diretamente (em migração gradual)

Veja [docs/ADR.md](./docs/ADR.md) para detalhes sobre decisões arquiteturais.

## Licença

MIT

## Contato

- **Organização**: vinigsouza
- **App**: corrige-ai-api
- **Região**: sa-east-1 (São Paulo)

---

**Nota**: Este projeto utiliza Clean Architecture e está em processo de migração completa de Services legados para Providers com DI.
