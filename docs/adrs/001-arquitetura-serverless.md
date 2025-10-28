# ADR 001: Arquitetura Serverless com AWS Lambda

## Status
Aceito

## Contexto
Precisamos construir uma API para correção de redações do ENEM que seja escalável, econômica e de fácil manutenção. O processamento de redações pode ter picos de demanda (períodos próximos ao ENEM) e baixa utilização em outros momentos.

## Decisão
Adotamos uma arquitetura **100% serverless** usando AWS Lambda com o Serverless Framework para gerenciar a infraestrutura.

### Componentes escolhidos:
- **AWS Lambda**: Execução de código sem gerenciar servidores
- **API Gateway (HTTP API)**: Endpoints RESTful
- **DynamoDB**: Banco de dados NoSQL
- **S3**: Armazenamento de arquivos
- **SQS**: Fila de mensagens para processamento assíncrono
- **Cognito**: Autenticação e autorização
- **Textract**: OCR para extração de texto de imagens

## Consequências

### Positivas
✅ **Custo otimizado**: Pagamento apenas pelo uso real (importante para free tier)
✅ **Escalabilidade automática**: Lambda escala automaticamente com a demanda
✅ **Baixa manutenção**: Sem servidores para gerenciar
✅ **Alta disponibilidade**: Gerenciada pela AWS
✅ **Desenvolvimento rápido**: Serverless Framework abstrai complexidade de IaC

### Negativas
⚠️ **Cold starts**: Latência inicial em funções pouco usadas
⚠️ **Vendor lock-in**: Dependência da AWS
⚠️ **Limites de execução**: Lambda tem timeout de 15 minutos (usamos 5 minutos)
⚠️ **Debugging complexo**: Logs distribuídos no CloudWatch

## Alternativas Consideradas

### 1. Containers com ECS/EKS
- ❌ Mais complexo de gerenciar
- ❌ Custo mínimo mais alto
- ✅ Mais controle sobre ambiente de execução

### 2. EC2 tradicional
- ❌ Precisa gerenciar servidores
- ❌ Custo fixo independente do uso
- ❌ Escalabilidade manual

## Notas de Implementação
- Uso de **Node.js 22.x** (runtime mais recente)
- **Memória**: 512MB por padrão, 1024MB para processamento de redações
- **Timeout**: 30s para APIs, 300s (5min) para processamento
- **Logs**: Retenção de 7 dias no CloudWatch
