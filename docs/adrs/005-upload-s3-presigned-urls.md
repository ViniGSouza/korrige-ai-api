# ADR 005: Upload de Arquivos com Presigned URLs do S3

## Status
Aceito

## Contexto
Usuários precisam enviar redações em diversos formatos:
- **Imagens** (JPG, PNG): Foto da redação escrita à mão
- **PDF**: Redação digitalizada
- **DOCX**: Redação digitada no Word
- **Texto**: Redação digitada direto no app

Fazer upload via API Lambda tem limitações:
- Payload máximo de 6MB (API Gateway)
- Timeout de 30s
- Lambda processa upload, desperdiçando recursos
- Tráfego passa por Lambda (custo e latência)

## Decisão
Implementamos **upload direto para S3** usando **Presigned URLs**.

### Fluxo de Upload

```
1. Cliente solicita URL de upload
   POST /essays/upload-url
   { fileName, fileType, fileSize }

2. API gera Presigned URL do S3
   ← { uploadUrl, fileKey, expiresIn: 300s }

3. Cliente faz upload DIRETO para S3
   PUT uploadUrl
   Body: arquivo binário

4. Cliente cria redação com fileKey
   POST /essays
   { title, fileKey, fileType }

5. Lambda processa arquivo do S3
```

### Configuração

#### Presigned URLs
- **Expiração**: 300 segundos (5 minutos)
- **Operação**: PutObject
- **ContentType**: Validado pelo cliente

#### S3 Bucket
- **Encryption**: AES256 (server-side)
- **Versioning**: Habilitado
- **CORS**: Configurado para permitir upload
- **Public Access**: BLOQUEADO
- **Lifecycle**:
  - Arquivos antigos → Glacier (90 dias)
  - Versões antigas deletadas (30 dias)

#### Validações
- **Tamanho máximo**: 10MB
- **Tipos permitidos**:
  - `image/jpeg`, `image/png`, `image/jpg`
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

#### Estrutura de Chaves
```
essays/{userId}/{ksuid}.{extensão}
```

Exemplo: `essays/user-123/2B9fPTk7r3dVXqV9mLQ7Y8K1zJn.jpg`

## Consequências

### Positivas
✅ **Performance**: Upload direto sem passar por Lambda
✅ **Custo**: Menos processamento em Lambda
✅ **Escalabilidade**: S3 gerencia upload
✅ **Tamanho**: Sem limite de 6MB do API Gateway
✅ **Segurança**: Presigned URL temporária e específica
✅ **UX**: Upload mais rápido

### Negativas
⚠️ **Complexidade**: Dois passos (solicitar URL + upload)
⚠️ **Segurança**: Cliente precisa fazer upload corretamente
⚠️ **Cleanup**: Arquivos podem ficar órfãos se processo falhar
⚠️ **CORS**: Precisa configurar CORS no S3

## Alternativas Consideradas

### 1. Upload via Lambda (base64)
- ❌ Limite de 6MB
- ❌ Lambda processa upload
- ❌ Maior latência
- ✅ Mais simples

### 2. Upload via Lambda (multipart)
- ❌ Limite de 10MB (payload)
- ❌ Timeout de 30s
- ❌ Custo maior
- ✅ Controle total

### 3. Transfer Acceleration
- ❌ Custo adicional
- ✅ Upload mais rápido (otimização de rede)
- ⚠️ Útil apenas para uploads grandes ou globais

## Segurança

### Proteções Implementadas

1. **Validação de tipo de arquivo**
   - Verificado ao gerar Presigned URL
   - ContentType incluído na URL

2. **Validação de tamanho**
   - Máximo 10MB
   - Verificado antes de gerar URL

3. **Expiração curta**
   - URL válida por apenas 5 minutos
   - Previne compartilhamento/reutilização

4. **Bucket privado**
   - Sem acesso público
   - Apenas Presigned URLs funcionam

5. **Encryption at rest**
   - AES256 server-side

6. **HTTPS obrigatório**
   - Bucket policy nega conexões inseguras

### Pontos de Atenção

⚠️ **Arquivos órfãos**: Se usuário solicita URL mas nunca faz upload, não há cleanup automático
- **Solução**: Lifecycle policy deleta arquivos antigos

⚠️ **Upload malicioso**: Cliente pode fazer upload de arquivo diferente do declarado
- **Solução**: Validação de Content-Type e processamento seguro

## Processamento de Arquivos

Após upload, Lambda `process-essay` extrai texto:

| Tipo | Método | Serviço |
|------|--------|---------|
| Imagem | OCR | AWS Textract |
| PDF | Parser | pdf-parse (biblioteca) |
| DOCX | Parser | mammoth (biblioteca) |
| Texto | Direto | - |

## Monitoramento

### Métricas S3
- Tamanho total do bucket
- Número de objetos
- Requests (PUT/GET/DELETE)
- Erros de upload

### Métricas Aplicação
- Taxa de sucesso de upload
- Tempo médio de upload
- Taxa de arquivos órfãos
- Distribuição de tipos de arquivo
