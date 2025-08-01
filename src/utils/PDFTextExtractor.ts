import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
const setupWorker = () => {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  }
};

export interface PDFExtractionResult {
  success: boolean;
  text: string;
  pageCount: number;
  error?: string;
  metadata?: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
}

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  progress: number; // 0-100
  status: string;
}

export class PDFTextExtractor {
  private static instance: PDFTextExtractor;
  
  static getInstance(): PDFTextExtractor {
    if (!PDFTextExtractor.instance) {
      PDFTextExtractor.instance = new PDFTextExtractor();
    }
    return PDFTextExtractor.instance;
  }

  private constructor() {
    setupWorker();
  }

  async extractText(
    file: File, 
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<PDFExtractionResult> {
    try {
      console.log(`Starting PDF extraction for: ${file.name} (${file.size} bytes)`);
      
      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('File must be a PDF document');
      }

      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      onProgress?.({
        currentPage: 0,
        totalPages: 0,
        progress: 10,
        status: 'Loading PDF document...'
      });

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: typedArray,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      console.log(`PDF loaded successfully. Pages: ${numPages}`);

      onProgress?.({
        currentPage: 0,
        totalPages: numPages,
        progress: 20,
        status: `Loaded PDF with ${numPages} pages`
      });

      // Extract metadata
      const metadata = await this.extractMetadata(pdf);

      let extractedText = '';
      let successfulPages = 0;

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          onProgress?.({
            currentPage: pageNum,
            totalPages: numPages,
            progress: 20 + (pageNum / numPages) * 70,
            status: `Extracting text from page ${pageNum} of ${numPages}...`
          });

          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Extract and clean text
          const pageText = textContent.items
            .filter((item: any) => item.str && typeof item.str === 'string')
            .map((item: any) => item.str.trim())
            .filter(text => text.length > 0)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (pageText) {
            extractedText += `${pageText}\n\n`;
            successfulPages++;
          }

          console.log(`Page ${pageNum}: ${pageText.length} characters extracted`);

        } catch (pageError) {
          console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }

      // Final cleanup
      extractedText = extractedText.trim();

      onProgress?.({
        currentPage: numPages,
        totalPages: numPages,
        progress: 100,
        status: 'Extraction complete!'
      });

      // Validate results
      if (extractedText.length === 0) {
        return {
          success: false,
          text: '',
          pageCount: numPages,
          error: 'No readable text found. This may be a scanned PDF that requires OCR processing.',
          metadata
        };
      }

      if (extractedText.length < 50) {
        console.warn('Very little text extracted, PDF might be image-based');
      }

      console.log(`Extraction complete: ${extractedText.length} characters from ${successfulPages}/${numPages} pages`);

      return {
        success: true,
        text: extractedText,
        pageCount: numPages,
        metadata
      };

    } catch (error: any) {
      console.error('PDF text extraction failed:', error);
      
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: `PDF extraction failed: ${error.message || 'Unknown error'}`,
      };
    }
  }

  private async extractMetadata(pdf: any): Promise<any> {
    try {
      const metadata = await pdf.getMetadata();
      return {
        title: metadata.info?.Title,
        author: metadata.info?.Author,
        creator: metadata.info?.Creator,
        producer: metadata.info?.Producer,
        creationDate: metadata.info?.CreationDate,
      };
    } catch (error) {
      console.warn('Failed to extract PDF metadata:', error);
      return {};
    }
  }

  // Helper method to validate if a file is a PDF
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  // Helper method to format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const pdfExtractor = PDFTextExtractor.getInstance();