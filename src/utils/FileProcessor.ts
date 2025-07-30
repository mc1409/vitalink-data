import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractionResult {
  success: boolean;
  text: string;
  metadata: {
    fileType: string;
    pages?: number;
    sheets?: string[];
    rows?: number;
    columns?: number;
    processingTime: number;
    fileSize: string;
  };
  error?: string;
}

export interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
}

export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  private static readonly TIMEOUT_MS = 30000; // 30 second timeout

  static async extractText(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      onProgress?.({
        stage: 'validation',
        progress: 10,
        message: 'Validating file...'
      });

      // Detect file type and extract accordingly
      const fileType = this.detectFileType(file);
      
      onProgress?.({
        stage: 'detection',
        progress: 20,
        message: `Detected file type: ${fileType}`
      });

      let result: ExtractionResult;

      // Add timeout wrapper
      const extractionPromise = this.performExtraction(file, fileType, onProgress);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extraction timeout')), this.TIMEOUT_MS)
      );

      result = await Promise.race([extractionPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      result.metadata.processingTime = processingTime;
      result.metadata.fileSize = this.formatFileSize(file.size);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `Extraction completed in ${(processingTime / 1000).toFixed(2)}s`
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('File processing error:', error);

      return {
        success: false,
        text: '',
        metadata: {
          fileType: file.type || 'unknown',
          processingTime,
          fileSize: this.formatFileSize(file.size)
        },
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  private static async performExtraction(
    file: File,
    fileType: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    switch (fileType) {
      case 'pdf':
        return this.extractFromPDF(file, onProgress);
      case 'docx':
        return this.extractFromDocx(file, onProgress);
      case 'txt':
        return this.extractFromText(file, onProgress);
      case 'csv':
        return this.extractFromCSV(file, onProgress);
      case 'excel':
        return this.extractFromExcel(file, onProgress);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private static detectFileType(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeType = file.type.toLowerCase();

    // Check by MIME type first (more reliable)
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (mimeType === 'text/plain') return 'txt';
    if (mimeType === 'text/csv') return 'csv';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel';
    if (mimeType === 'application/vnd.ms-excel') return 'excel';

    // Fallback to extension
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'doc': return 'docx'; // Treat .doc as .docx (mammoth can handle both)
      case 'txt': return 'txt';
      case 'csv': return 'csv';
      case 'xlsx': case 'xls': return 'excel';
      default: 
        throw new Error(`Unsupported file format: .${extension}`);
    }
  }

  private static async extractFromPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      stage: 'pdf_loading',
      progress: 30,
      message: 'Loading PDF document...'
    });

    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      disableFontFace: true,
      standardFontDataUrl: null,
      verbosity: 0 // Reduce console noise
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    onProgress?.({
      stage: 'pdf_extraction',
      progress: 50,
      message: `Extracting text from ${numPages} pages...`
    });

    // Process pages in smaller batches to avoid memory issues
    const batchSize = 5;
    const pageTexts: string[] = [];

    for (let i = 0; i < numPages; i += batchSize) {
      const batch = [];
      const endIdx = Math.min(i + batchSize, numPages);

      for (let pageNum = i + 1; pageNum <= endIdx; pageNum++) {
        batch.push(
          pdf.getPage(pageNum).then(async (page) => {
            try {
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .filter((item: any) => item.str && item.str.trim())
                .map((item: any) => item.str)
                .join(' ');
              
              // Clean up page to free memory
              page.cleanup();
              return pageText;
            } catch (error) {
              console.warn(`Error extracting text from page ${pageNum}:`, error);
              return '';
            }
          })
        );
      }

      const batchResults = await Promise.all(batch);
      pageTexts.push(...batchResults);

      onProgress?.({
        stage: 'pdf_extraction',
        progress: 50 + (i / numPages) * 40,
        message: `Processed ${Math.min(endIdx, numPages)} of ${numPages} pages...`
      });
    }

    // Clean up PDF document
    pdf.destroy();

    const text = pageTexts.join('\n').trim();

    return {
      success: true,
      text,
      metadata: {
        fileType: 'PDF',
        pages: numPages,
        processingTime: 0, // Will be set by caller
        fileSize: this.formatFileSize(file.size)
      }
    };
  }

  private static async extractFromDocx(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      stage: 'docx_processing',
      progress: 40,
      message: 'Processing Word document...'
    });

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages.length > 0) {
      console.warn('Word document extraction warnings:', result.messages);
    }

    return {
      success: true,
      text: result.value.trim(),
      metadata: {
        fileType: 'Word Document',
        processingTime: 0,
        fileSize: this.formatFileSize(file.size)
      }
    };
  }

  private static async extractFromText(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      stage: 'text_reading',
      progress: 40,
      message: 'Reading text file...'
    });

    const text = await file.text();

    return {
      success: true,
      text: text.trim(),
      metadata: {
        fileType: 'Text File',
        processingTime: 0,
        fileSize: this.formatFileSize(file.size)
      }
    };
  }

  private static async extractFromCSV(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      stage: 'csv_parsing',
      progress: 40,
      message: 'Parsing CSV file...'
    });

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          try {
            // Convert CSV data to readable text format
            const headers = results.data[0] as string[];
            const rows = results.data.slice(1) as string[][];
            
            let text = `CSV Data Summary:\n\n`;
            text += `Headers: ${headers.join(', ')}\n\n`;
            
            // Add sample rows (first 10)
            const sampleRows = rows.slice(0, 10);
            text += `Sample Data:\n`;
            sampleRows.forEach((row, index) => {
              text += `Row ${index + 1}: `;
              headers.forEach((header, i) => {
                text += `${header}: ${row[i] || 'N/A'}, `;
              });
              text += '\n';
            });

            if (rows.length > 10) {
              text += `\n... and ${rows.length - 10} more rows`;
            }

            resolve({
              success: true,
              text: text.trim(),
              metadata: {
                fileType: 'CSV File',
                rows: rows.length,
                columns: headers.length,
                processingTime: 0,
                fileSize: this.formatFileSize(file.size)
              }
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
        header: false,
        skipEmptyLines: true
      });
    });
  }

  private static async extractFromExcel(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExtractionResult> {
    onProgress?.({
      stage: 'excel_processing',
      progress: 40,
      message: 'Processing Excel file...'
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetNames = workbook.SheetNames;
    let text = `Excel File Summary:\n\n`;
    text += `Sheets: ${sheetNames.join(', ')}\n\n`;

    sheetNames.forEach((sheetName, sheetIndex) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      text += `=== Sheet: ${sheetName} ===\n`;
      
      if (jsonData.length > 0) {
        const headers = jsonData[0] as any[];
        const rows = jsonData.slice(1);
        
        text += `Headers: ${headers.join(', ')}\n`;
        
        // Add sample rows (first 5 per sheet)
        const sampleRows = rows.slice(0, 5);
        sampleRows.forEach((row: any[], index) => {
          text += `Row ${index + 1}: `;
          headers.forEach((header, i) => {
            text += `${header}: ${row[i] || 'N/A'}, `;
          });
          text += '\n';
        });

        if (rows.length > 5) {
          text += `... and ${rows.length - 5} more rows\n`;
        }
      } else {
        text += 'No data found in this sheet\n';
      }
      
      text += '\n';
    });

    return {
      success: true,
      text: text.trim(),
      metadata: {
        fileType: 'Excel File',
        sheets: sheetNames,
        processingTime: 0,
        fileSize: this.formatFileSize(file.size)
      }
    };
  }

  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}