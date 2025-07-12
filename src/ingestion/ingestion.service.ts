import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IngestionProcess,
  IngestionStatus,
} from '../entities/ingestion-process.entity';
import { Document, DocumentStatus } from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  CreateIngestionProcessDto,
  IngestionProcessQueryDto,
} from '../dto/ingestion.dto';
import { DocumentsService } from '../documents/documents.service';
import * as fs from 'fs';

@Injectable()
export class IngestionService {
  constructor(
    @InjectRepository(IngestionProcess)
    private ingestionRepository: Repository<IngestionProcess>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private documentsService: DocumentsService,
  ) {}

  async createIngestionProcess(
    createIngestionDto: CreateIngestionProcessDto,
    user: User,
  ) {
    const document = await this.documentsService.findById(
      createIngestionDto.documentId,
      user,
    );

    if (document.status === DocumentStatus.PROCESSING) {
      throw new BadRequestException('Document is already being processed');
    }

    // Check if there's already a running process for this document
    const existingProcess = await this.ingestionRepository.findOne({
      where: {
        document: { id: createIngestionDto.documentId },
        status: IngestionStatus.RUNNING,
      },
    });

    if (existingProcess) {
      throw new BadRequestException(
        'There is already a running ingestion process for this document',
      );
    }

    const ingestionProcess = this.ingestionRepository.create({
      document,
      configuration: createIngestionDto.configuration,
      status: IngestionStatus.PENDING,
    });

    const savedProcess = await this.ingestionRepository.save(ingestionProcess);

    // Update document status
    await this.documentsService.updateStatus(
      createIngestionDto.documentId,
      DocumentStatus.PROCESSING,
    );

    this.processDocument(savedProcess.id);

    return savedProcess;
  }

  async findAll(query: IngestionProcessQueryDto, user: User) {
    const {
      documentId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.ingestionRepository
      .createQueryBuilder('process')
      .leftJoinAndSelect('process.document', 'document')
      .leftJoinAndSelect('document.createdBy', 'user');

    if (user.role !== UserRole.ADMIN) {
      queryBuilder.where('user.id = :userId', { userId: user.id });
    }

    if (documentId) {
      queryBuilder.andWhere('document.id = :documentId', { documentId });
    }

    if (status) {
      queryBuilder.andWhere('process.status = :status', { status });
    }

    queryBuilder.orderBy(`process.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [processes, total] = await queryBuilder.getManyAndCount();

    return { processes, total };
  }

  async findById(id: string, user: User): Promise<IngestionProcess> {
    const process = await this.ingestionRepository.findOne({
      where: { id },
      relations: ['document'],
    });

    if (!process) {
      throw new NotFoundException('Ingestion process not found');
    }

    if (
      user.role !== UserRole.ADMIN &&
      process.document.createdBy.id !== user.id
    ) {
      throw new BadRequestException(
        'You do not have permission to access this process',
      );
    }

    return process;
  }

  async cancelProcess(id: string, user: User): Promise<IngestionProcess> {
    const process = await this.findById(id, user);

    if (
      process.status !== IngestionStatus.PENDING &&
      process.status !== IngestionStatus.RUNNING
    ) {
      throw new BadRequestException(
        'Cannot cancel a process that is not pending or running',
      );
    }

    process.status = IngestionStatus.FAILED;
    process.errorMessage = 'Process cancelled by user';
    process.completedAt = new Date();

    await this.documentsService.updateStatus(
      process.document.id,
      DocumentStatus.PENDING,
    );

    return this.ingestionRepository.save(process);
  }

  private async processDocument(processId: string): Promise<void> {
    try {
      const process = await this.ingestionRepository.findOne({
        where: { id: processId },
        relations: ['document'],
      });

      if (!process) {
        return;
      }

      process.status = IngestionStatus.RUNNING;
      process.startedAt = new Date();
      await this.ingestionRepository.save(process);

      // assuming text extraction, in real it could any CPU intensive task such as running python script.
      const extractedText = await this.extractTextFromFile(
        process.document.filePath,
      );

      process.document.extractedText = extractedText;
      process.document.status = DocumentStatus.COMPLETED;
      await this.documentsRepository.save(process.document);

      process.status = IngestionStatus.COMPLETED;
      process.completedAt = new Date();
      process.result = {
        extractedText,
        processedAt: new Date(),
      };

      await this.ingestionRepository.save(process);
    } catch (error) {
      const process = await this.ingestionRepository.findOne({
        where: { id: processId },
        relations: ['document'],
      });

      if (process) {
        process.status = IngestionStatus.FAILED;
        process.errorMessage = error.message;
        process.completedAt = new Date();
        await this.ingestionRepository.save(process);

        process.document.status = DocumentStatus.FAILED;
        await this.documentsRepository.save(process.document);
      }
    }
  }

  private async extractTextFromFile(filePath: string): Promise<string> {
    //text extracting.
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return `Extracted text from file (${stats.size} bytes). Processing completed at ${new Date().toISOString()}`;
    }
    return 'Unable to extract text from file.';
  }
}
