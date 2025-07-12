import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Create admin user
    const adminUser = await usersService.create({
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    });
    console.log('Admin user created:', adminUser.email);

    // Create editor user
    const editorUser = await usersService.create({
      email: 'editor@example.com',
      password: 'editor123',
      firstName: 'Editor',
      lastName: 'User',
      role: UserRole.EDITOR,
    });
    console.log('Editor user created:', editorUser.email);

    // Create viewer user
    const viewerUser = await usersService.create({
      email: 'viewer@example.com',
      password: 'viewer123',
      firstName: 'Viewer',
      lastName: 'User',
      role: UserRole.VIEWER,
    });
    console.log('Viewer user created:', viewerUser.email);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
