import { ValidationError, ErrorCodes } from '../exceptions';

export interface ParsedFilename {
  date: string;
  time: string;
  type: string;
  description: string;
  extension: string;
  original: string;
}

const FILENAME_PATTERN = /^(\d{4}-\d{2}-\d{2})_(\d{6})_([A-Z0-9-]+)_([a-z0-9-]+)\.([a-z0-9]+)$/;

export class FileNamingConvention {
  generateFilename(type: string, description: string, extension: string): string {
    if (!type || typeof type !== 'string') {
      throw new ValidationError('Type must be a non-empty string', ErrorCodes.VALIDATION_FAILED, {
        type,
      });
    }

    if (!description || typeof description !== 'string') {
      throw new ValidationError(
        'Description must be a non-empty string',
        ErrorCodes.VALIDATION_FAILED,
        { description }
      );
    }

    if (!extension || typeof extension !== 'string') {
      throw new ValidationError(
        'Extension must be a non-empty string',
        ErrorCodes.VALIDATION_FAILED,
        { extension }
      );
    }

    const sanitizedType = this.sanitizeType(type);
    if (!sanitizedType) {
      throw new ValidationError(
        'Type must contain alphanumeric characters',
        ErrorCodes.VALIDATION_FAILED,
        { type }
      );
    }

    const kebabDescription = this.toKebabCase(description);
    if (!kebabDescription) {
      throw new ValidationError(
        'Description must contain valid characters',
        ErrorCodes.VALIDATION_FAILED,
        { description }
      );
    }

    const sanitizedExtension = extension.replace(/^\./, '').toLowerCase();
    if (!sanitizedExtension) {
      throw new ValidationError('Extension must be valid', ErrorCodes.VALIDATION_FAILED, {
        extension,
      });
    }

    const timestamp = this.generateTimestamp();

    return `${timestamp}_${sanitizedType}_${kebabDescription}.${sanitizedExtension}`;
  }

  parseFilename(filename: string): ParsedFilename {
    if (!filename || typeof filename !== 'string') {
      throw new ValidationError(
        'Filename must be a non-empty string',
        ErrorCodes.VALIDATION_FAILED,
        { filename }
      );
    }

    const match = FILENAME_PATTERN.exec(filename);
    if (!match) {
      throw new ValidationError(
        'Filename does not match expected pattern: YYYY-MM-DD_HHmmss_TYPE_description.ext',
        ErrorCodes.VALIDATION_FAILED,
        { filename, expectedPattern: 'YYYY-MM-DD_HHmmss_TYPE_description.ext' }
      );
    }

    return {
      date: match[1],
      time: match[2],
      type: match[3],
      description: match[4],
      extension: match[5],
      original: filename,
    };
  }

  generateTimestamp(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
  }

  toKebabCase(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sanitizeType(type: string): string {
    return type
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  isValidFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
      return false;
    }
    return FILENAME_PATTERN.test(filename);
  }

  extractDate(filename: string): Date | null {
    try {
      const parsed = this.parseFilename(filename);
      const dateStr = parsed.date;
      const timeStr = parsed.time;
      const isoString = `${dateStr}T${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}Z`;
      return new Date(isoString);
    } catch {
      return null;
    }
  }
}
