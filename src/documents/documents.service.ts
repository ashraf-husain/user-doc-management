import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
} from '../dto/document.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private readonly uploadPath = 'uploads/documents';

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {
    //checking upload folder exists, if not create it
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    user: User,
  ) {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const document = this.documentsRepository.create({
      ...createDocumentDto,
      fileName: file.originalname,
      filePath,
      mimeType: file.mimetype,
      size: file.size,
      createdBy: user,
    });

    return this.documentsRepository.save(document);
  }

  async findAll(query: DocumentQueryDto, user: User) {
    const {
      search,
      status,
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'user');

    // only admin can see all documents owners
    if (user.role !== UserRole.ADMIN) {
      queryBuilder.where('document.createdBy = :userId', { userId: user.id });
    }

    if (search) {
      queryBuilder.andWhere(
        '(document.title ILIKE :search OR document.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('document.status = :status', { status });
    }

    if (createdBy && user.role === UserRole.ADMIN) {
      queryBuilder.andWhere('document.createdBy = :createdBy', { createdBy });
    }

    queryBuilder.orderBy(`document.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [documents, total] = await queryBuilder.getManyAndCount();

    return { documents, total };
  }

  async findById(id: string, user: User) {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (user.role !== UserRole.ADMIN && document.createdBy.id !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to access this document',
      );
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, user: User) {
    const document = await this.findById(id, user);

    // Check permission
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot edit document');
    }

    if (user.role === UserRole.EDITOR && document.createdBy.id !== user.id) {
      throw new ForbiddenException('Editors can only edit their own documents');
    }

    Object.entries(updateDocumentDto).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        document[key] = value;
      }
    });
    // Object.assign(document, updateDocumentDto);

    return this.documentsRepository.save(document);
  }

  async delete(id: string, user: User) {
    const document = await this.findById(id, user);

    // Check permissions
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot delete documents');
    }

    if (user.role === UserRole.EDITOR && document.createdBy.id !== user.id) {
      throw new ForbiddenException(
        'Editors can only delete their own documents',
      );
    }

    // Remove file from upload folder
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await this.documentsRepository.remove(document);
  }

  async updateStatus(id: string, status: DocumentStatus) {
    const document = await this.documentsRepository.findOne({ where: { id } });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.status = status;
    return this.documentsRepository.save(document);
  }
}
