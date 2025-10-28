// Container de Injeção de Dependências
import { CognitoAuthProvider } from '../../infra/auth/cognito';
import { ClaudeAIProvider } from '../../infra/ai/claude';
import { OpenAIProvider } from '../../infra/ai/openai';
import { S3StorageProvider } from '../../infra/storage/s3/S3StorageProvider';
import { SQSQueueProvider } from '../../infra/queues/sqs/SQSQueueProvider';
import { FileProcessorProvider } from '../../infra/file-processor';
import { DynamoDBService } from '../../infra/database/dynamodb/DynamoDBRepository';
import { UserRepository } from '../../infra/database/repositories/UserRepository';
import { EssayRepository } from '../../infra/database/repositories/EssayRepository';

// Use Cases
import * as AuthUseCases from '../../application/usecases/auth';
import * as UserUseCases from '../../application/usecases/users';
import * as EssayUseCases from '../../application/usecases/essays';

// Controllers
import { AuthController } from '../../application/controllers/auth';
import { UsersController } from '../../application/controllers/users';
import { EssaysController } from '../../application/controllers/essays';

class Container {
  private static instance: Container;

  // Providers
  public authProvider: CognitoAuthProvider;
  public claudeProvider: ClaudeAIProvider;
  public openaiProvider: OpenAIProvider;
  public storageProvider: S3StorageProvider;
  public queueProvider: SQSQueueProvider;
  public fileProcessorProvider: FileProcessorProvider;
  public dynamodbService: DynamoDBService;

  // Repositories
  public userRepository: UserRepository;
  public essayRepository: EssayRepository;

  // Use Cases - Auth
  public signUpUseCase: AuthUseCases.SignUpUseCase;
  public signInUseCase: AuthUseCases.SignInUseCase;
  public confirmSignUpUseCase: AuthUseCases.ConfirmSignUpUseCase;
  public refreshTokenUseCase: AuthUseCases.RefreshTokenUseCase;
  public forgotPasswordUseCase: AuthUseCases.ForgotPasswordUseCase;
  public confirmForgotPasswordUseCase: AuthUseCases.ConfirmForgotPasswordUseCase;
  public changePasswordUseCase: AuthUseCases.ChangePasswordUseCase;

  // Use Cases - Users
  public getProfileUseCase: UserUseCases.GetProfileUseCase;
  public updateProfileUseCase: UserUseCases.UpdateProfileUseCase;

  // Use Cases - Essays
  public createEssayUseCase: EssayUseCases.CreateEssayUseCase;
  public listEssaysUseCase: EssayUseCases.ListEssaysUseCase;
  public getEssayUseCase: EssayUseCases.GetEssayUseCase;
  public deleteEssayUseCase: EssayUseCases.DeleteEssayUseCase;
  public getUploadUrlUseCase: EssayUseCases.GetUploadUrlUseCase;
  public processEssayUseCase: EssayUseCases.ProcessEssayUseCase;

  // Controllers
  public authController: AuthController;
  public usersController: UsersController;
  public essaysController: EssaysController;

  private constructor() {
    // Initialize Providers
    this.authProvider = new CognitoAuthProvider();
    this.claudeProvider = new ClaudeAIProvider();
    this.openaiProvider = new OpenAIProvider();
    this.storageProvider = new S3StorageProvider();
    this.queueProvider = new SQSQueueProvider();
    this.fileProcessorProvider = new FileProcessorProvider(this.storageProvider);
    this.dynamodbService = new DynamoDBService();

    // Initialize Repositories
    this.userRepository = new UserRepository(this.dynamodbService);
    this.essayRepository = new EssayRepository(this.dynamodbService);

    // Initialize Auth Use Cases
    this.signUpUseCase = new AuthUseCases.SignUpUseCase(this.authProvider, this.userRepository);
    this.signInUseCase = new AuthUseCases.SignInUseCase(this.authProvider);
    this.confirmSignUpUseCase = new AuthUseCases.ConfirmSignUpUseCase(this.authProvider);
    this.refreshTokenUseCase = new AuthUseCases.RefreshTokenUseCase(this.authProvider);
    this.forgotPasswordUseCase = new AuthUseCases.ForgotPasswordUseCase(this.authProvider);
    this.confirmForgotPasswordUseCase = new AuthUseCases.ConfirmForgotPasswordUseCase(this.authProvider);
    this.changePasswordUseCase = new AuthUseCases.ChangePasswordUseCase(this.authProvider);

    // Initialize User Use Cases
    this.getProfileUseCase = new UserUseCases.GetProfileUseCase(this.userRepository);
    this.updateProfileUseCase = new UserUseCases.UpdateProfileUseCase(this.userRepository);

    // Initialize Essay Use Cases
    this.createEssayUseCase = new EssayUseCases.CreateEssayUseCase(this.essayRepository, this.queueProvider);
    this.listEssaysUseCase = new EssayUseCases.ListEssaysUseCase(this.essayRepository);
    this.getEssayUseCase = new EssayUseCases.GetEssayUseCase(this.essayRepository);
    this.deleteEssayUseCase = new EssayUseCases.DeleteEssayUseCase(this.essayRepository, this.storageProvider);
    this.getUploadUrlUseCase = new EssayUseCases.GetUploadUrlUseCase(this.storageProvider);
    this.processEssayUseCase = new EssayUseCases.ProcessEssayUseCase(
      this.essayRepository,
      this.claudeProvider,
      this.openaiProvider,
      this.fileProcessorProvider
    );

    // Initialize Controllers
    this.authController = new AuthController(
      this.signUpUseCase,
      this.signInUseCase,
      this.confirmSignUpUseCase,
      this.refreshTokenUseCase,
      this.forgotPasswordUseCase,
      this.confirmForgotPasswordUseCase,
      this.changePasswordUseCase
    );

    this.usersController = new UsersController(
      this.getProfileUseCase,
      this.updateProfileUseCase
    );

    this.essaysController = new EssaysController(
      this.createEssayUseCase,
      this.listEssaysUseCase,
      this.getEssayUseCase,
      this.deleteEssayUseCase,
      this.getUploadUrlUseCase,
      this.processEssayUseCase
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }

    return Container.instance;
  }
}

export const container = Container.getInstance();
