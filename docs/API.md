# Financial Wallet API - Documentação Completa

Esta documentação descreve todos os endpoints da API Financial Wallet, incluindo exemplos de requisições e respostas.

## Informações Gerais

- **Base URL**: `http://localhost:3001/v1`
- **Versionamento**: URI-based (v1)
- **Formato de Dados**: JSON
- **Autenticação**: AWS Cognito (Bearer Token)

## Autenticação

A maioria dos endpoints requer autenticação via AWS Cognito. O token deve ser enviado no header:

```
Authorization: Bearer <token>
```

O sistema sincroniza automaticamente os usuários do Cognito no banco de dados local quando eles fazem requisições autenticadas.

---

## Endpoints de Usuários

### 1. Criar ou Sincronizar Usuário

Cria um novo usuário no sistema ou sincroniza um usuário existente do Cognito.

**Endpoint**: `POST /v1/users`

**Autenticação**: Não requerida (público)

**Request Body**:
```json
{
  "user_id": "string",
  "name": "string",
  "email": "string"
}
```

**Campos**:
- `user_id` (string, obrigatório): ID único do usuário no Cognito
- `name` (string, obrigatório): Nome completo do usuário
- `email` (string, obrigatório): Email do usuário (deve ser único)

**Response 201 - Sucesso**:
```json
{
  "user_id": "user-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "balance": 0,
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-25T10:00:00.000Z"
}
```

**Response 400 - Erro de Validação**:
```json
{
  "statusCode": 400,
  "message": [
    "user_id should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

**Exemplo de Requisição**:
```bash
curl -X POST http://localhost:3001/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "name": "João Silva",
    "email": "joao@example.com"
  }'
```

---

### 2. Listar Usuários

Retorna uma lista paginada de todos os usuários cadastrados no sistema.

**Endpoint**: `GET /v1/users`

**Autenticação**: Requerida

**Query Parameters**:
- `page` (number, opcional, padrão: 1): Número da página
- `limit` (number, opcional, padrão: 10): Quantidade de itens por página

**Response 200 - Sucesso**:
```json
{
  "users": [
    {
      "user_id": "user-123",
      "name": "João Silva",
      "email": "joao@example.com",
      "balance": 1250.75,
      "createdAt": "2025-11-25T10:00:00.000Z",
      "updatedAt": "2025-11-25T10:00:00.000Z"
    },
    {
      "user_id": "user-456",
      "name": "Maria Santos",
      "email": "maria@example.com",
      "balance": 500.00,
      "createdAt": "2025-11-25T09:00:00.000Z",
      "updatedAt": "2025-11-25T09:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

**Response 401 - Não Autenticado**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Exemplo de Requisição**:
```bash
curl -X GET "http://localhost:3001/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### 3. Buscar Usuário por Email

Retorna os dados de um usuário específico pelo email.

**Endpoint**: `GET /v1/users/email/:email`

**Autenticação**: Requerida

**Path Parameters**:
- `email` (string, obrigatório): Email do usuário a ser buscado

**Response 200 - Sucesso**:
```json
{
  "user_id": "user-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "balance": 1250.75,
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-25T10:00:00.000Z"
}
```

**Response 404 - Usuário Não Encontrado**:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Exemplo de Requisição**:
```bash
curl -X GET http://localhost:3001/v1/users/email/joao@example.com \
  -H "Authorization: Bearer <token>"
```

---

### 4. Buscar Usuário por ID

Retorna os dados de um usuário específico pelo ID.

**Endpoint**: `GET /v1/users/:user_id`

**Autenticação**: Requerida

**Path Parameters**:
- `user_id` (string, obrigatório): ID do usuário a ser buscado

**Response 200 - Sucesso**:
```json
{
  "user_id": "user-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "balance": 1250.75,
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-25T10:00:00.000Z"
}
```

**Response 404 - Usuário Não Encontrado**:
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Exemplo de Requisição**:
```bash
curl -X GET http://localhost:3001/v1/users/user-123 \
  -H "Authorization: Bearer <token>"
```

---

## Endpoints de Carteira

### 1. Depositar Dinheiro

Adiciona dinheiro à carteira do usuário autenticado. Se o saldo estiver negativo, o depósito primeiro corrige o valor negativo e depois adiciona o restante.

**Endpoint**: `POST /v1/wallet/deposit`

**Autenticação**: Requerida

**Request Body**:
```json
{
  "amount": 100.50
}
```

**Campos**:
- `amount` (number, obrigatório): Valor a ser depositado (deve ser positivo)

**Response 200 - Sucesso**:
```json
{
  "message": "Deposit successful",
  "balance": 1250.75
}
```

**Campos da Resposta**:
- `message` (string): Mensagem de confirmação
- `balance` (number): Saldo atualizado após o depósito

**Response 400 - Erro de Validação**:
```json
{
  "statusCode": 400,
  "message": [
    "amount must be a positive number",
    "amount should not be empty"
  ],
  "error": "Bad Request"
}
```

**Response 401 - Não Autenticado**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Exemplo de Requisição**:
```bash
curl -X POST http://localhost:3001/v1/wallet/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00
  }'
```

**Comportamento Especial**:
- Se o saldo atual for negativo (ex: -50) e o depósito for 100:
  - Primeiro corrige o saldo negativo: -50 + 50 = 0
  - Depois adiciona o restante: 0 + 50 = 50
  - Saldo final: 50

---

### 2. Transferir Dinheiro

Transfere dinheiro da carteira do usuário autenticado para outro usuário. Cria duas transações: uma negativa para o remetente e uma positiva para o destinatário.

**Endpoint**: `POST /v1/wallet/transfer`

**Autenticação**: Requerida

**Request Body**:
```json
{
  "toUserId": "user-456",
  "amount": 50.00
}
```

**Campos**:
- `toUserId` (string, obrigatório): ID do usuário destinatário
- `amount` (number, obrigatório): Valor a ser transferido (deve ser positivo)

**Response 200 - Sucesso**:
```json
{
  "message": "Transfer successful",
  "balance": 1200.75
}
```

**Campos da Resposta**:
- `message` (string): Mensagem de confirmação
- `balance` (number): Saldo atualizado do remetente após a transferência

**Response 400 - Erro de Validação ou Regra de Negócio**:
```json
{
  "statusCode": 400,
  "message": "Cannot transfer to yourself",
  "error": "Bad Request"
}
```

**Response 404 - Destinatário Não Encontrado**:
```json
{
  "statusCode": 404,
  "message": "Recipient user not found",
  "error": "Not Found"
}
```

**Response 422 - Saldo Insuficiente**:
```json
{
  "statusCode": 422,
  "message": "Insufficient balance. Current balance: 50, required: 100",
  "error": "Unprocessable Entity"
}
```

**Exemplo de Requisição**:
```bash
curl -X POST http://localhost:3001/v1/wallet/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserId": "user-456",
    "amount": 100.00
  }'
```

**Transações Criadas**:

1. **Transação do Remetente** (negativa):
```json
{
  "id": "tx-remetente-uuid",
  "userId": "user-123",
  "type": "transfer",
  "amount": -100.00,
  "recipientId": "user-456",
  "recipientName": "Maria Santos",
  "createdAt": "2025-11-25T10:00:00.000Z"
}
```

2. **Transação do Destinatário** (positiva):
```json
{
  "id": "tx-destinatario-uuid",
  "userId": "user-456",
  "type": "transfer",
  "amount": 100.00,
  "referenceTransactionId": "tx-remetente-uuid",
  "senderId": "user-123",
  "senderName": "João Silva",
  "createdAt": "2025-11-25T10:00:00.000Z"
}
```

**Regras de Negócio**:
- Não é possível transferir para si mesmo
- O saldo deve ser suficiente para cobrir a transferência
- Ambas as transações são criadas em uma única transação de banco de dados (atomicidade)

---

### 3. Reverter Transação

Reverte uma transação anterior (depósito ou transferência). Todas as operações são reversíveis, exceto reversões.

**Endpoint**: `POST /v1/wallet/revert`

**Autenticação**: Requerida

**Request Body**:
```json
{
  "transactionId": "transaction-uuid"
}
```

**Campos**:
- `transactionId` (string, obrigatório): ID da transação a ser revertida

**Response 200 - Sucesso**:
```json
{
  "message": "Transaction reverted successfully",
  "balance": 1150.75
}
```

**Campos da Resposta**:
- `message` (string): Mensagem de confirmação
- `balance` (number): Saldo atualizado após a reversão

**Response 400 - Erro de Validação ou Regra de Negócio**:
```json
{
  "statusCode": 400,
  "message": "Transaction already reverted",
  "error": "Bad Request"
}
```

ou

```json
{
  "statusCode": 400,
  "message": "Cannot revert a reversal transaction",
  "error": "Bad Request"
}
```

**Response 401 - Não Autorizado**:
```json
{
  "statusCode": 401,
  "message": "Cannot revert transaction from another user",
  "error": "Unauthorized"
}
```

**Response 404 - Transação Não Encontrada**:
```json
{
  "statusCode": 404,
  "message": "Transaction not found",
  "error": "Not Found"
}
```

**Response 422 - Saldo Insuficiente para Reverter**:
```json
{
  "statusCode": 422,
  "message": "Insufficient balance to revert deposit",
  "error": "Unprocessable Entity"
}
```

**Exemplo de Requisição**:
```bash
curl -X POST http://localhost:3001/v1/wallet/revert \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "transaction-uuid"
  }'
```

**Comportamento por Tipo de Transação**:

1. **Reverter Depósito**:
   - Cria uma transação de reversão negativa
   - Reduz o saldo do valor original do depósito
   - Valida se há saldo suficiente

2. **Reverter Transferência (Saída)**:
   - Cria transações de reversão para remetente e destinatário
   - Devolve o dinheiro ao remetente
   - Remove o dinheiro do destinatário
   - Valida saldos em ambos os lados

3. **Reverter Transferência (Entrada)**:
   - Cria transações de reversão para remetente e destinatário
   - Remove o dinheiro do destinatário
   - Devolve o dinheiro ao remetente original
   - Valida saldos em ambos os lados

**Regras de Negócio**:
- Apenas o dono da transação pode revertê-la
- Não é possível reverter uma transação já revertida
- Não é possível reverter uma transação de reversão
- O saldo deve ser suficiente para realizar a reversão

---

### 4. Consultar Saldo

Retorna o saldo atual da carteira do usuário autenticado.

**Endpoint**: `GET /v1/wallet/balance`

**Autenticação**: Requerida

**Response 200 - Sucesso**:
```json
{
  "balance": 1250.75
}
```

**Campos da Resposta**:
- `balance` (number): Saldo atual da carteira (pode ser negativo)

**Response 401 - Não Autenticado**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Exemplo de Requisição**:
```bash
curl -X GET http://localhost:3001/v1/wallet/balance \
  -H "Authorization: Bearer <token>"
```

**Nota**: O saldo é calculado a partir da soma de todas as transações do usuário. Pode ser negativo, mas será corrigido automaticamente no próximo depósito.

---

### 5. Listar Transações

Retorna uma lista paginada de todas as transações do usuário autenticado, ordenadas por data (mais recentes primeiro).

**Endpoint**: `GET /v1/wallet/transactions`

**Autenticação**: Requerida

**Query Parameters**:
- `page` (number, opcional, padrão: 1): Número da página
- `limit` (number, opcional, padrão: 10): Quantidade de itens por página

**Response 200 - Sucesso**:
```json
{
  "transactions": [
    {
      "id": "tx-uuid-1",
      "userId": "user-123",
      "type": "transfer",
      "amount": -100.00,
      "referenceTransactionId": null,
      "senderId": null,
      "senderName": null,
      "recipientId": "user-456",
      "recipientName": "Maria Santos",
      "createdAt": "2025-11-25T10:32:00.000Z"
    },
    {
      "id": "tx-uuid-2",
      "userId": "user-123",
      "type": "deposit",
      "amount": 500.00,
      "referenceTransactionId": null,
      "senderId": null,
      "senderName": null,
      "recipientId": null,
      "recipientName": null,
      "createdAt": "2025-11-25T10:27:00.000Z"
    },
    {
      "id": "tx-uuid-3",
      "userId": "user-123",
      "type": "transfer",
      "amount": 25.00,
      "referenceTransactionId": "tx-reference-uuid",
      "senderId": "user-789",
      "senderName": "Pedro Oliveira",
      "recipientId": null,
      "recipientName": null,
      "createdAt": "2025-11-24T18:19:00.000Z"
    },
    {
      "id": "tx-uuid-4",
      "userId": "user-123",
      "type": "reversal",
      "amount": -500.00,
      "referenceTransactionId": "tx-uuid-2",
      "senderId": null,
      "senderName": null,
      "recipientId": null,
      "recipientName": null,
      "createdAt": "2025-11-24T15:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Campos da Transação**:
- `id` (string): ID único da transação
- `userId` (string): ID do usuário dono da transação
- `type` (string): Tipo da transação (`deposit`, `transfer`, `reversal`)
- `amount` (number): Valor da transação (positivo para créditos, negativo para débitos)
- `referenceTransactionId` (string, opcional): ID da transação de referência (para transferências e reversões)
- `senderId` (string, opcional): ID do remetente (apenas para transferências recebidas)
- `senderName` (string, opcional): Nome do remetente (apenas para transferências recebidas)
- `recipientId` (string, opcional): ID do destinatário (apenas para transferências enviadas)
- `recipientName` (string, opcional): Nome do destinatário (apenas para transferências enviadas)
- `createdAt` (string): Data e hora de criação da transação (ISO 8601)

**Campos da Paginação**:
- `page` (number): Página atual
- `limit` (number): Itens por página
- `total` (number): Total de transações
- `totalPages` (number): Total de páginas

**Response 401 - Não Autenticado**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Exemplo de Requisição**:
```bash
curl -X GET "http://localhost:3001/v1/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

## Códigos de Status HTTP

A API utiliza os seguintes códigos de status HTTP:

- **200 OK**: Requisição bem-sucedida
- **201 Created**: Recurso criado com sucesso
- **400 Bad Request**: Erro de validação ou regra de negócio
- **401 Unauthorized**: Não autenticado ou não autorizado
- **404 Not Found**: Recurso não encontrado
- **422 Unprocessable Entity**: Erro de processamento (ex: saldo insuficiente)
- **500 Internal Server Error**: Erro interno do servidor

---

## Tratamento de Erros

Todos os erros seguem um formato padronizado:

```json
{
  "statusCode": 400,
  "message": "Mensagem de erro descritiva",
  "error": "Tipo do erro"
}
```

Para erros de validação, o campo `message` pode ser um array:

```json
{
  "statusCode": 400,
  "message": [
    "amount must be a positive number",
    "toUserId should not be empty"
  ],
  "error": "Bad Request"
}
```

---

## Limites e Validações

### Validações de Entrada

- **amount**: Deve ser um número positivo maior que zero
- **email**: Deve ser um email válido
- **user_id**: Deve ser uma string não vazia
- **transactionId**: Deve ser um UUID válido

### Limites de Paginação

- **page**: Mínimo 1
- **limit**: Mínimo 1, máximo 100 (recomendado: 10-50)

### Regras de Negócio

- Não é possível transferir para si mesmo
- Não é possível transferir mais do que o saldo disponível
- Não é possível reverter uma transação de reversão
- Não é possível reverter uma transação já revertida
- Apenas o dono da transação pode revertê-la

---

## Swagger UI

Para uma documentação interativa e testes em tempo real, acesse:

- **Swagger UI**: `http://localhost:3001/api`
- **Swagger JSON**: `http://localhost:3001/api-json`

O Swagger UI permite:
- Visualizar todos os endpoints
- Ver esquemas de dados
- Testar requisições diretamente na interface
- Ver exemplos de requisições e respostas

---

## Notas Importantes

1. **Autenticação**: A maioria dos endpoints requer autenticação via AWS Cognito. O token deve ser válido e não expirado.

2. **Versionamento**: A API utiliza versionamento por URI. A versão atual é `v1`. Futuras versões serão disponibilizadas em `/v2`, `/v3`, etc.

3. **Transações Atômicas**: Operações que envolvem múltiplas transações (como transferências e reversões) são executadas em transações de banco de dados para garantir atomicidade.

4. **Saldo Negativo**: O sistema permite saldo negativo, mas ele será automaticamente corrigido no próximo depósito.

5. **Rastreamento de Transferências**: Todas as transferências rastreiam tanto o remetente quanto o destinatário, permitindo visualizar para quem foi enviado ou de quem foi recebido.

6. **Paginação**: Todos os endpoints de listagem suportam paginação para melhor performance e experiência do usuário.

