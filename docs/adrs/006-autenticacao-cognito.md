# ADR 006: Autenticação com AWS Cognito

## Status
Aceito

## Contexto
A aplicação precisa de autenticação e autorização para:
- Registrar usuários
- Fazer login
- Proteger endpoints privados
- Recuperar senha
- Gerenciar perfis

Implementar autenticação própria envolve:
- Gerenciar senhas de forma segura (hashing, salt)
- Implementar tokens JWT
- Lidar com refresh tokens
- Implementar recuperação de senha
- Garantir compliance com segurança

## Decisão
Adotamos **AWS Cognito User Pools** para autenticação e autorização.

### Arquitetura

```
Cliente → API (sign-up/sign-in) → Cognito User Pool
                                        ↓
                                   JWT Tokens
                                        ↓
Cliente → API (protected) → API Gateway Authorizer → Lambda
                                ↑ (valida JWT)
```

### Configuração do User Pool

#### Autenticação
- **Username**: Email (único)
- **Attributes**: email, name, phone_number
- **Auto-verify**: Email
- **MFA**: Opcional (TOTP)

#### Políticas de Senha
- Mínimo 8 caracteres
- Requer: maiúscula, minúscula, número, símbolo
- Senha temporária válida por 7 dias

#### Tokens
- **Access Token**: 60 minutos
- **ID Token**: 60 minutos
- **Refresh Token**: 30 dias

#### Recuperação de Conta
- Via email verificado
- Código de confirmação enviado por email

### Fluxos Implementados

#### 1. Registro (Sign Up)
```
POST /auth/sign-up
{ email, password, name, phoneNumber }
→ Cognito: CreateUser
→ DynamoDB: Save user data
← { userId, email, userConfirmed }
```

#### 2. Login (Sign In)
```
POST /auth/sign-in
{ email, password }
→ Cognito: InitiateAuth (USER_PASSWORD_AUTH)
← { accessToken, idToken, refreshToken, expiresIn }
```

#### 3. Refresh Token
```
POST /auth/refresh-token
{ refreshToken }
→ Cognito: InitiateAuth (REFRESH_TOKEN_AUTH)
← { accessToken, idToken, refreshToken, expiresIn }
```

#### 4. Recuperar Senha
```
POST /auth/forgot-password
{ email }
→ Cognito: ForgotPassword
← Email com código enviado

POST /auth/confirm-forgot-password
{ email, confirmationCode, newPassword }
→ Cognito: ConfirmForgotPassword
← Senha alterada
```

#### 5. Alterar Senha (autenticado)
```
POST /auth/change-password
Headers: { Authorization: "Bearer <accessToken>" }
{ oldPassword, newPassword }
→ Cognito: ChangePassword
← Senha alterada
```

### Autorização de Endpoints

Endpoints protegidos usam **Cognito Authorizer** no API Gateway:

```yaml
authorizer:
  name: cognitoAuthorizer
  type: jwt
  identitySource: $request.header.Authorization
  issuerUrl: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
  audience:
    - {userPoolClientId}
```

Lambda recebe informações do usuário em `event.requestContext.authorizer.jwt.claims`:
- `sub`: User ID
- `email`: Email do usuário
- `name`: Nome do usuário

## Consequências

### Positivas
✅ **Segurança**: Cognito gerencia senhas e tokens de forma segura
✅ **Compliance**: HIPAA, PCI DSS, SOC, ISO compliant
✅ **Sem manutenção**: AWS gerencia infraestrutura
✅ **Features prontas**: MFA, recuperação de senha, email verification
✅ **Integração nativa**: API Gateway + Lambda
✅ **Custo**: 50.000 MAUs grátis no free tier
✅ **Escalabilidade**: Milhões de usuários

### Negativas
⚠️ **Vendor lock-in**: Difícil migrar para outro provider
⚠️ **Customização limitada**: UI padrão é básica
⚠️ **Complexidade**: Configuração inicial complexa
⚠️ **Debugging**: Erros podem ser crípticos

## Alternativas Consideradas

### 1. Auth0
- ✅ UI melhor
- ✅ Mais features
- ❌ Custo mais alto
- ❌ Vendor lock-in externo

### 2. JWT + bcrypt manual
- ✅ Controle total
- ❌ Precisa implementar tudo
- ❌ Risco de segurança
- ❌ Mais manutenção

### 3. Firebase Auth
- ✅ Fácil de usar
- ❌ Não integra bem com AWS
- ❌ Vendor lock-in Google

### 4. Keycloak (self-hosted)
- ✅ Open source
- ✅ Muito customizável
- ❌ Precisa hospedar e manter
- ❌ Custo de infraestrutura

## Dados Duplicados

Cognito armazena:
- Email, password (hash), name, phone_number

DynamoDB armazena:
- userId, email, name, phoneNumber, createdAt, updatedAt

**Por quê duplicar?**
- Cognito: Autenticação e autorização
- DynamoDB: Dados de perfil e relacionamentos (redações)

**Sincronização**:
- Sign-up: Cria em ambos
- Update profile: Atualiza ambos

## Segurança

### Proteções Implementadas

1. **Password Policy**: Forte (8+ chars, mixed case, numbers, symbols)
2. **MFA Opcional**: TOTP via app autenticador
3. **Email Verification**: Email deve ser verificado
4. **Account Recovery**: Via email verificado
5. **Token Expiration**: Access token expira em 1h
6. **Refresh Token Rotation**: Refresh token válido por 30 dias
7. **Prevent User Enumeration**: Mensagens genéricas de erro

### Best Practices

✅ Tokens armazenados com segurança no client (não em localStorage)
✅ HTTPS obrigatório para todas as requisições
✅ Tokens incluídos no header Authorization: Bearer <token>
✅ Logout invalida tokens no cliente

## Custos

### Free Tier
- 50.000 MAUs (Monthly Active Users) grátis
- Sem limite de tempo

### Pago (após free tier)
- $0.0055 por MAU (primeiros 50k)
- $0.0046 por MAU (próximos 50k)
- Decrescente com volume

**Exemplo**: 1.000 usuários ativos = Grátis
