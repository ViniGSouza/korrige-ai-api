export const config = {
  aws: {
    region: process.env.AWS_REGION || 'sa-east-1',
  },
  dynamodb: {
    tableName: process.env.MAIN_TABLE_NAME!,
  },
  s3: {
    bucketName: process.env.ESSAYS_BUCKET_NAME!,
  },
  sqs: {
    queueUrl: process.env.ESSAY_PROCESSING_QUEUE_URL!,
    dlqUrl: process.env.ESSAY_DLQ_URL!,
  },
  cognito: {
    userPoolId: process.env.USER_POOL_ID!,
    userPoolClientId: process.env.USER_POOL_CLIENT_ID!,
  },
  ai: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as string[],
    presignedUrlExpiration: 300, // 5 minutos
  },
};
