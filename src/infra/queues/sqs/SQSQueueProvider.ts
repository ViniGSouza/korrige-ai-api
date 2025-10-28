import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  IQueueProvider,
  SendMessageParams,
} from "../../../application/contracts";
import { config } from "src/config";

export class SQSQueueProvider implements IQueueProvider {
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({ region: config.aws.region });
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    const { queueUrl, messageBody, delaySeconds = 0 } = params;

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      DelaySeconds: delaySeconds,
    });

    await this.client.send(command);
  }
}
