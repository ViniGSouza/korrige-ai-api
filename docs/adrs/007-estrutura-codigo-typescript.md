# ADR 007: Estrutura de Código e TypeScript

## Status
Aceito

## Contexto
Precisamos definir uma estrutura de código clara, manutenível e escalável para o projeto. O código será escrito em TypeScript e executado em Lambda com Node.js 22.

## Decisão
Adotamos uma estrutura modular baseada no padrão do foodiary-api, com TypeScript e ferramentas modernas.

### Estrutura de Diretórios

```
corrige-ai-api/
├── src/
│   ├── functions/          # Handlers Lambda
│   │   ├── auth/           # Autenticação
│   │   ├── users/          # Usuários
│   │   └── essays/         # Redações
│   ├── shared/             # Código compartilhado
│   │   ├── services/       # Serviços AWS e IA
│   │   ├── schemas/        # Validação Zod
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utilitários
│   │   ├── errors/         # Classes de erro
│   │   └── middlewares/    # Middlewares (futuro)
│   └── config/             # Configurações
├── sls/                    # Configurações Serverless
│   ├── resources/          # CloudFormation resources
│   │   ├── dynamodb.yml
│   │   ├── s3.yml
│   │   ├── sqs.yml
│   │   ├── cognito.yml
│   │   └── sns.yml
│   ├── auth.yml            # Functions de auth
│   ├── users.yml           # Functions de users
│   └── essays.yml          # Functions de essays
├── docs/
│   └── adrs/               # Architecture Decision Records
├── scripts/                # Scripts utilitários
├── .github/
│   └── workflows/          # CI/CD (futuro)
├── serverless.yml          # Config principal
├── tsconfig.json           # TypeScript config
├── eslint.config.mjs       # Linting
├── esbuild.config.mjs      # Build config
└── package.json
```

### Stack Tecnológica

#### Runtime
- **Node.js**: 22.x (LTS mais recente)
- **TypeScript**: 5.7.2
- **ESM**: ES Modules (import/export)

#### Build & Bundling
- **esbuild**: Bundler ultra-rápido
- **serverless-esbuild**: Plugin para Serverless Framework
- **esbuild-plugin-tsc**: Suporte a decorators TypeScript

#### Linting & Formatting
- **ESLint**: 9.x (flat config)
- **typescript-eslint**: Parser e rules TypeScript
- **EditorConfig**: Padronização entre editores

#### Validação
- **Zod**: Schema validation
  - Type-safe
  - Runtime validation
  - Inferência de tipos

#### Gerenciador de Pacotes
- **pnpm**: 10.5.2
  - Mais rápido que npm/yarn
  - Menos espaço em disco
  - Mais seguro (strict mode)

#### Testes (futuro)
- **Vitest**: Framework de testes

### Convenções de Código

#### Naming Conventions

**Arquivos**
```
kebab-case.ts       # Arquivos e diretórios
sign-up.ts
get-profile.ts
```

**Classes**
```typescript
PascalCase          # Classes e interfaces
class CognitoService {}
interface User {}
type Essay {}
```

**Variáveis e Funções**
```typescript
camelCase           # Variáveis e funções
const userId = '...';
function processEssay() {}
```

**Constantes**
```typescript
UPPER_SNAKE_CASE    # Constantes globais
const MAX_FILE_SIZE = 10_000_000;
```

#### Imports

**Ordem**:
1. Node.js built-ins
2. External dependencies
3. AWS SDK
4. Internal services
5. Types
6. Utils

**Sempre usar extensão .js** (para ESM):
```typescript
import { config } from '../../config/index.js';
```

#### Error Handling

Usar classes de erro customizadas:
```typescript
throw new ValidationError('Invalid input');
throw new NotFoundError('User not found');
throw new UnauthorizedError('Invalid token');
```

### TypeScript Configuration

#### Strict Mode
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

#### Module Resolution
```json
{
  "module": "ES2022",
  "moduleResolution": "bundler",
  "target": "ES2022"
}
```

### Build Configuration

#### esbuild
- **Bundle**: true (single file por função)
- **Minify**: false (em dev), true (em prod)
- **Sourcemap**: true
- **Target**: node22
- **Format**: ESM
- **Exclude**: AWS SDK (já disponível em Lambda)

#### Otimizações
- **Tree-shaking**: Remove código não usado
- **Code splitting**: Não usado (cada Lambda é independente)
- **Concurrency**: 10 (build paralelo de funções)

## Consequências

### Positivas
✅ **Type Safety**: TypeScript previne bugs em tempo de desenvolvimento
✅ **Developer Experience**: Autocomplete, refactoring, navegação
✅ **Build rápido**: esbuild é muito mais rápido que webpack/rollup
✅ **Bundle pequeno**: Apenas código usado é incluído
✅ **Modern JS**: ES2022 features (top-level await, etc)
✅ **Linting**: ESLint previne erros comuns
✅ **Validação**: Zod garante dados válidos em runtime

### Negativas
⚠️ **Complexidade inicial**: Curva de aprendizado TypeScript
⚠️ **Build step**: Precisa compilar antes de rodar
⚠️ **Type gymnastics**: Às vezes tipos complexos são difíceis

## Padrões de Design

### Services Layer
```typescript
export class CognitoService {
  async signUp(...) { }
  async signIn(...) { }
}
```

**Por quê?**
- Reutilização entre funções
- Fácil de testar (mock)
- Separação de responsabilidades

### Schema Validation
```typescript
const schema = z.object({ ... });
const body = schema.parse(JSON.parse(event.body));
```

**Por quê?**
- Type-safe
- Validação automática
- Mensagens de erro claras

### Response Helpers
```typescript
return successResponse(data);
return errorResponse(error, 400);
```

**Por quê?**
- Formato consistente
- Headers CORS automáticos
- Menos código duplicado

### Logger Estruturado
```typescript
logger.info('Message', { key: 'value' });
```

**Por quê?**
- Logs em JSON (fácil de parsear)
- CloudWatch Insights queries
- Metadata contextual

## Referências
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [esbuild Documentation](https://esbuild.github.io/)
- [Zod Documentation](https://zod.dev/)
- [AWS Lambda Node.js Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
