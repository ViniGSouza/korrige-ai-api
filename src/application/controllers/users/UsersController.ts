import { GetProfileUseCase, UpdateProfileUseCase } from '../../usecases/users';

export class UsersController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase
  ) {}

  async getProfile(userId: string) {
    return this.getProfileUseCase.execute({ userId });
  }

  async updateProfile(data: { userId: string; name?: string; phoneNumber?: string }) {
    return this.updateProfileUseCase.execute(data);
  }
}
