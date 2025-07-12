/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document, DocumentStatus } from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repository: Repository<Document>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.VIEWER,
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

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test content'),
    destination: '',
    filename: '',
    path: '',
    stream: null,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
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
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    repository = module.get<Repository<Document>>(getRepositoryToken(Document));

    // Setup fs mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    (fs.createReadStream as jest.Mock).mockReturnValue({});
    (path.extname as jest.Mock).mockReturnValue('.pdf');
    (path.join as jest.Mock).mockReturnValue('/uploads/documents/test.pdf');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new document successfully', async () => {
      const createDto = {
        title: 'Test Document',
        description: 'Test Description',
      };

      mockRepository.create.mockReturnValue(mockDocument);
      mockRepository.save.mockResolvedValue(mockDocument);

      const result = await service.create(createDto, mockFile, mockUser);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        fileName: mockFile.originalname,
        filePath: expect.any(String),
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        createdBy: mockUser,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockDocument);
      expect(result).toBe(mockDocument);
    });
  });

  describe('findAll', () => {
    it('should return documents with pagination for admin', async () => {
      const query = { page: 1, limit: 10 };
      const adminUser = { ...mockUser, role: UserRole.ADMIN };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocument], 1]);

      const result = await service.findAll(query, adminUser);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'document',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'document.createdBy',
        'user',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        documents: [mockDocument],
        total: 1,
      });
    });

    it('should filter by user for non-admin users', async () => {
      const query = { page: 1, limit: 10 };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocument], 1]);

      const result = await service.findAll(query, mockUser);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'document.createdBy = :userId',
        { userId: mockUser.id },
      );
      expect(result).toEqual({
        documents: [mockDocument],
        total: 1,
      });
    });
  });

  describe('findById', () => {
    it('should return document by id for owner', async () => {
      mockRepository.findOne.mockResolvedValue(mockDocument);

      const result = await service.findById('1', mockUser);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['createdBy'],
      });
      expect(result).toBe(mockDocument);
    });

    it('should return document by id for admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockRepository.findOne.mockResolvedValue(mockDocument);

      const result = await service.findById('1', adminUser);

      expect(result).toBe(mockDocument);
    });

    it('should throw NotFoundException if document not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      const otherUser = { ...mockUser, id: '2' };
      mockRepository.findOne.mockResolvedValue(mockDocument);

      await expect(service.findById('1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update document successfully for owner', async () => {
      const updateDto = { title: 'Updated Title' };
      const editorUser = { ...mockUser, role: UserRole.EDITOR };
      const updatedDocument = { ...mockDocument, title: 'Updated Title' };

      jest.spyOn(service, 'findById').mockResolvedValue(mockDocument);
      mockRepository.save.mockResolvedValue(updatedDocument);

      const result = await service.update('1', updateDto, editorUser);

      expect(service.findById).toHaveBeenCalledWith('1', editorUser);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        title: 'Updated Title',
      });
      expect(result).toBe(updatedDocument);
    });

    it('should throw ForbiddenException for viewer', async () => {
      const updateDto = { title: 'Updated Title' };

      jest.spyOn(service, 'findById').mockResolvedValue(mockDocument);

      await expect(service.update('1', updateDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should delete document successfully for owner', async () => {
      const editorUser = { ...mockUser, role: UserRole.EDITOR };

      jest.spyOn(service, 'findById').mockResolvedValue(mockDocument);
      mockRepository.remove.mockResolvedValue(mockDocument);

      await service.delete('1', editorUser);

      expect(service.findById).toHaveBeenCalledWith('1', editorUser);
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockDocument.filePath);
      expect(mockRepository.remove).toHaveBeenCalledWith(mockDocument);
    });

    it('should throw ForbiddenException for viewer', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockDocument);

      await expect(service.delete('1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update document status successfully', async () => {
      const updatedDocument = {
        ...mockDocument,
        status: DocumentStatus.COMPLETED,
      };

      mockRepository.findOne.mockResolvedValue(mockDocument);
      mockRepository.save.mockResolvedValue(updatedDocument);

      const result = await service.updateStatus('1', DocumentStatus.COMPLETED);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        status: DocumentStatus.COMPLETED,
      });
      expect(result).toBe(updatedDocument);
    });

    it('should throw NotFoundException if document not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('1', DocumentStatus.COMPLETED),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
