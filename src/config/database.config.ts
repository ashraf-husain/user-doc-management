import { User } from '../entities/user.entity';
import { Document } from '../entities/document.entity';
import { IngestionProcess } from '../entities/ingestion-process.entity';

export const databaseConfig = (configService) => ({
  type: 'postgres' as const,
  host: configService.get('DB_HOST', 'localhost'),
  port: parseInt(configService.get('DB_PORT', '5432')),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'user_doc_management'),
  entities: [User, Document, IngestionProcess],
  synchronize: configService.get('NODE_ENV') !== 'production',
  logging: true,
});
