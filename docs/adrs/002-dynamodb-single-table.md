# ADR 002: Single Table Design no DynamoDB

## Status
Aceito

## Contexto
Precisamos armazenar dados de usuários e redações de forma eficiente e econômica. DynamoDB cobra por leitura/escrita e armazenamento, então o design da tabela é crucial para custos e performance.

## Decisão
Adotamos o padrão **Single Table Design** no DynamoDB, armazenando diferentes entidades (Users, Essays) em uma única tabela.

### Estrutura da Tabela

#### Chaves Primárias
- **PK (Partition Key)**: Chave de partição
- **SK (Sort Key)**: Chave de ordenação

#### Índices Secundários Globais (GSI)
- **GSI1**: Para buscar por email ou status de redações
- **GSI2**: Para buscar redações por usuário e data

### Padrões de Acesso

| Entidade | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|----------|----|----|---------|---------|---------|---------|
| User | USER#{userId} | USER#{userId} | USER#EMAIL#{email} | USER#EMAIL#{email} | - | - |
| Essay | USER#{userId} | ESSAY#{essayId} | ESSAY#STATUS#{status} | ESSAY#{createdAt} | ESSAY#USER#{userId} | ESSAY#{createdAt} |

### Queries Suportadas
1. Buscar usuário por ID: `PK = USER#{userId}, SK = USER#{userId}`
2. Buscar usuário por email: `GSI1PK = USER#EMAIL#{email}` (GSI1)
3. Buscar redação por ID: `PK = USER#{userId}, SK = ESSAY#{essayId}`
4. Listar redações de um usuário: `GSI2PK = ESSAY#USER#{userId}` (GSI2)
5. Listar redações por status: `GSI1PK = ESSAY#STATUS#{status}` (GSI1)

## Consequências

### Positivas
✅ **Custo reduzido**: Uma tabela é mais barato que múltiplas
✅ **Performance**: Menos queries entre tabelas
✅ **Escalabilidade**: DynamoDB distribui dados automaticamente
✅ **Flexibilidade**: Fácil adicionar novos tipos de entidades

### Negativas
⚠️ **Complexidade**: Requer planejamento cuidadoso de access patterns
⚠️ **Menos intuitivo**: Diferente de bancos relacionais
⚠️ **Dificulta queries ad-hoc**: Precisa planejar todos os padrões de acesso

## Alternativas Consideradas

### 1. Multi-Table Design
- ❌ Custo mais alto (múltiplas tabelas)
- ❌ Queries complexas entre tabelas
- ✅ Mais intuitivo para desenvolvedores

### 2. Banco Relacional (RDS)
- ❌ Custo mais alto
- ❌ Precisa gerenciar conexões
- ❌ Menos escalável
- ✅ Queries SQL flexíveis

## Referências
- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [The DynamoDB Book by Alex DeBrie](https://www.dynamodbbook.com/)
