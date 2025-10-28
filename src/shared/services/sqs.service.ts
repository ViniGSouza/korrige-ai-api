import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../../config/index.js';

const client = new SQSClient({ region: config.aws.region });

export class SQSService {
  constructor(private queueUrl: string = config.sqs.queueUrl) {}

  async sendMessage<T>(messageBody: T, delaySeconds: number = 0): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
      DelaySeconds: delaySeconds,
    });

    const response = await client.send(command);

    if (!response.MessageId) {
      throw new Error('Failed to send message to SQS');
    }

    return response.MessageId;
  }
}
