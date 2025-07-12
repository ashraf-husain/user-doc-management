/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import {
  IngestionProcess,
  IngestionStatus,
} from '../entities/ingestion-process.entity';
import { Document, DocumentStatus } from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import { DocumentsService } from '../documents/documents.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let ingestionRepository: Repository<IngestionProcess>;
  let documentsRepository: Repository<Document>;
  let documentsService: DocumentsService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EDITOR,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: [],
  };

  const mockDocument: Document = {
    id: '1',
    title: 'Test Document',
    description: 'Test Description',
    fileName: 'test.pdf',
    filePath: '/uploads/documents/test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    status: DocumentStatus.PENDING,
    extractedText: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUser,
    ingestionProcesses: [],
  };

  const mockIngestionProcess: IngestionProcess = {
    id: '1',
    status: IngestionStatus.PENDING,
    errorMessage: null,
    result: null,
    configuration: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    document: mockDocument,
  };

  const mockIngestionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDocumentsRepository = {
    save: jest.fn(),
  };

  const mockDocumentsService = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getRepositoryToken(IngestionProcess),
          useValue: mockIngestionRepository,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentsRepository,
        },
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    ingestionRepository = module.get<Repository<IngestionProcess>>(
      getRepositoryToken(IngestionProcess),
    );
    documentsRepository = module.get<Repository<Document>>(
      getRepositoryToken(Document),
    );
    documentsService = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIngestionProcess', () => {
    it('should create ingestion process successfully', async () => {
      const createDto = { documentId: '1' };

      mockDocumentsService.findById.mockResolvedValue(mockDocument);
      mockIngestionRepository.findOne.mockResolvedValue(null);
      mockIngestionRepository.create.mockReturnValue(mockIngestionProcess);
      mockIngestionRepository.save.mockResolvedValue(mockIngestionProcess);
      mockDocumentsService.updateStatus.mockResolvedValue(mockDocument);

      // Mock the private method
      jest
        .spyOn(service as any, 'processDocument')
        .mockResolvedValue(undefined);

      const result = await service.createIngestionProcess(createDto, mockUser);

      expect(mockDocumentsService.findById).toHaveBeenCalledWith('1', mockUser);
      expect(mockIngestionRepository.create).toHaveBeenCalledWith({
        document: mockDocument,
        configuration: undefined,
        status: IngestionStatus.PENDING,
      });
      expect(mockIngestionRepository.save).toHaveBeenCalledWith(
        mockIngestionProcess,
      );
      expect(mockDocumentsService.updateStatus).toHaveBeenCalledWith(
        '1',
        DocumentStatus.PROCESSING,
      );
      expect(result).toBe(mockIngestionProcess);
    });

    it('should throw BadRequestException if document is already processing', async () => {
      const createDto = { documentId: '1' };
      const processingDocument = {
        ...mockDocument,
        status: DocumentStatus.PROCESSING,
      };

      mockDocumentsService.findById.mockResolvedValue(processingDocument);

      await expect(
        service.createIngestionProcess(createDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if process already running', async () => {
      const createDto = { documentId: '1' };
      const runningProcess = {
        ...mockIngestionProcess,
        status: IngestionStatus.RUNNING,
      };

      mockDocumentsService.findById.mockResolvedValue(mockDocument);
      mockIngestionRepository.findOne.mockResolvedValue(runningProcess);

      await expect(
        service.createIngestionProcess(createDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return ingestion processes with pagination for admin', async () => {
      const query = { page: 1, limit: 10 };
      const adminUser = { ...mockUser, role: UserRole.ADMIN };

      mockIngestionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockIngestionProcess],
        1,
      ]);

      const result = await service.findAll(query, adminUser);

      expect(mockIngestionRepository.createQueryBuilder).toHaveBeenCalledWith(
        'process',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'process.document',
        'document',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'document.createdBy',
        'user',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        processes: [mockIngestionProcess],
        total: 1,
      });
    });

    it('should filter by user for non-admin users', async () => {
      const query = { page: 1, limit: 10 };

      mockIngestionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockIngestionProcess],
        1,
      ]);

      const result = await service.findAll(query, mockUser);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :userId', {
        userId: mockUser.id,
      });
      expect(result).toEqual({
        processes: [mockIngestionProcess],
        total: 1,
      });
    });
  });

  describe('findById', () => {
    it('should return ingestion process by id for owner', async () => {
      mockIngestionRepository.findOne.mockResolvedValue(mockIngestionProcess);

      const result = await service.findById('1', mockUser);

      expect(mockIngestionRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['document'],
      });
      expect(result).toBe(mockIngestionProcess);
    });

    it('should return ingestion process by id for admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockIngestionRepository.findOne.mockResolvedValue(mockIngestionProcess);

      const result = await service.findById('1', adminUser);

      expect(result).toBe(mockIngestionProcess);
    });

    it('should throw NotFoundException if process not found', async () => {
      mockIngestionRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-owner non-admin', async () => {
      const otherUser = { ...mockUser, id: '2' };
      mockIngestionRepository.findOne.mockResolvedValue(mockIngestionProcess);

      await expect(service.findById('1', otherUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelProcess', () => {
    it('should cancel process successfully', async () => {
      const runningProcess = {
        ...mockIngestionProcess,
        status: IngestionStatus.RUNNING,
      };
      const cancelledProcess = {
        ...runningProcess,
        status: IngestionStatus.FAILED,
      };

      jest.spyOn(service, 'findById').mockResolvedValue(runningProcess);
      mockIngestionRepository.save.mockResolvedValue(cancelledProcess);
      mockDocumentsService.updateStatus.mockResolvedValue(mockDocument);

      const result = await service.cancelProcess('1', mockUser);

      expect(service.findById).toHaveBeenCalledWith('1', mockUser);
      expect(mockDocumentsService.updateStatus).toHaveBeenCalledWith(
        mockDocument.id,
        DocumentStatus.PENDING,
      );
      expect(mockIngestionRepository.save).toHaveBeenCalledWith({
        ...runningProcess,
        status: IngestionStatus.FAILED,
        errorMessage: 'Process cancelled by user',
        completedAt: expect.any(Date),
      });
      expect(result).toBe(cancelledProcess);
    });

    it('should throw BadRequestException for completed process', async () => {
      const completedProcess = {
        ...mockIngestionProcess,
        status: IngestionStatus.COMPLETED,
      };

      jest.spyOn(service, 'findById').mockResolvedValue(completedProcess);

      await expect(service.cancelProcess('1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
