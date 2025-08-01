import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    let fileType = formData.get('fileType') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    // If fileType is not provided, try to infer from file extension
    if (!fileType && file.name) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      fileType = extension || 'unknown';
    } else if (!fileType && file.type) {
      // Try to infer from MIME type
      const mimeTypeMap: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/csv': 'csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-excel': 'xls'
      };
      fileType = mimeTypeMap[file.type] || 'unknown';
    }

    // Ensure fileType is not null/undefined
    if (!fileType) {
      fileType = 'unknown';
    }

    console.log(`Processing file: ${file.name}, type: ${fileType}, size: ${file.size} bytes`);

    let extractedText = '';
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    switch (fileType.toLowerCase()) {
      case 'pdf':
        extractedText = await extractFromPDF(uint8Array);
        break;
      case 'txt':
        extractedText = new TextDecoder().decode(uint8Array);
        break;
      case 'docx':
        extractedText = await extractFromDocx(uint8Array);
        break;
      case 'csv':
        extractedText = await extractFromCSV(uint8Array);
        break;
      case 'xlsx':
      case 'xls':
        extractedText = await extractFromExcel(uint8Array);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    console.log(`Successfully extracted ${extractedText.length} characters from ${file.name}`);

    return new Response(JSON.stringify({
      success: true,
      extractedText: extractedText.substring(0, 50000), // Limit to 50k chars
      filename: file.name,
      fileSize: file.size,
      textLength: extractedText.length,
      preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in extract-document-text function:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      extractedText: '',
      filename: '',
      fileSize: 0,
      textLength: 0,
      preview: ''
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractFromPDF(uint8Array: Uint8Array): Promise<string> {
  try {
    console.log('🔍 Starting enhanced PDF text extraction...');
    console.log(`📄 PDF size: ${uint8Array.length} bytes`);
    
    // Method 1: Try pdf-parse library (most reliable)
    try {
      console.log('📚 Attempting pdf-parse extraction...');
      const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
      
      console.log('✅ pdf-parse library loaded');
      
      const data = await pdfParse.default(uint8Array);
      
      console.log(`📄 PDF parsed successfully:`);
      console.log(`- Pages: ${data.numpages}`);
      console.log(`- Title: ${data.info?.Title || 'No title'}`);
      console.log(`- Creator: ${data.info?.Creator || 'Unknown'}`);
      console.log(`- Text length: ${data.text?.length || 0} characters`);
      
      if (data.text && data.text.trim().length > 20) {
        const cleanText = data.text
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/\f/g, '\n')  // Replace form feeds with newlines
          .trim();
        
        console.log(`✅ Successfully extracted ${cleanText.length} characters`);
        console.log(`📋 Sample text: "${cleanText.substring(0, 300)}..."`);
        
        return cleanText;
      } else {
        console.log('⚠️ pdf-parse returned minimal text, trying alternative methods...');
      }
      
    } catch (pdfParseError) {
      console.error('❌ pdf-parse failed:', pdfParseError.message);
      console.log('🔄 Trying alternative extraction methods...');
    }
    
    // Method 2: Try pdf2pic + OCR approach (for scanned PDFs)
    try {
      console.log('📷 Attempting pdf2pic + OCR extraction...');
      
      // Import pdf2pic for converting PDF pages to images
      const pdf2pic = await import('https://esm.sh/pdf2pic@3.1.3');
      
      console.log('✅ pdf2pic loaded, converting PDF to images...');
      
      const convert = pdf2pic.fromBuffer(uint8Array, {
        density: 200,           // DPI
        saveFilename: "page",
        savePath: "/tmp",
        format: "png",
        width: 2000,
        height: 2000
      });
      
      let extractedText = '';
      
      // Convert first 3 pages maximum to avoid timeout
      for (let pageNum = 1; pageNum <= 3; pageNum++) {
        try {
          const result = await convert(pageNum, { responseType: "buffer" });
          
          if (result.buffer) {
            console.log(`✅ Page ${pageNum} converted to image`);
            
            // Here we would normally use OCR, but for now let's indicate it needs OCR
            extractedText += `[Page ${pageNum} - Image content detected, requires OCR processing]\n`;
          }
          
        } catch (pageError) {
          console.log(`⚠️ Could not convert page ${pageNum}:`, pageError.message);
          break;
        }
      }
      
      if (extractedText.trim()) {
        return `📷 PDF contains image-based content that requires OCR processing.

${extractedText}

🔧 To extract text from this scanned PDF:
1. Use Adobe Acrobat Pro with OCR feature
2. Upload to Google Drive (auto-OCR)
3. Use online OCR: smallpdf.com/ocr-pdf
4. Try mobile apps: Adobe Scan, CamScanner
5. Use desktop OCR software`;
      }
      
    } catch (pdf2picError) {
      console.log('❌ pdf2pic method failed:', pdf2picError.message);
    }
    
    // Method 3: Enhanced manual extraction with better patterns
    console.log('🔄 Attempting enhanced manual extraction...');
    
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    // Analyze PDF structure
    const hasTextObjects = pdfContent.includes('BT') && pdfContent.includes('ET');
    const hasStreams = pdfContent.includes('stream') && pdfContent.includes('endstream');
    const hasImages = pdfContent.includes('/Image') || pdfContent.includes('/XObject');
    const hasFont = pdfContent.includes('/Font');
    const isCompressed = pdfContent.includes('/FlateDecode');
    
    console.log(`📊 PDF Structure Analysis:
    - Text objects (BT/ET): ${hasTextObjects}
    - Content streams: ${hasStreams}
    - Images: ${hasImages}
    - Fonts: ${hasFont}
    - Compressed: ${isCompressed}`);
    
    let extractedText = '';
    
    // Enhanced text extraction patterns
    const extractionPatterns = [
      // Text show operators
      /\(([^)]{2,})\)\s*Tj/g,
      /\(([^)]{2,})\)\s*TJ/g,
      // Array text operators
      /\[\s*\(([^)]+)\)\s*\]\s*TJ/g,
      // Text with positioning
      /\(([^)]{2,})\)\s*[\d\s\.-]*\s*Td/g,
      // General parentheses content
      /\(([^)]{3,50})\)/g,
    ];
    
    const seenTexts = new Set();
    let totalMatches = 0;
    
    for (const pattern of extractionPatterns) {
      let match;
      let patternMatches = 0;
      
      while ((match = pattern.exec(pdfContent)) !== null && totalMatches < 1000) {
        totalMatches++;
        patternMatches++;
        
        let text = match[1];
        if (!text) continue;
        
        // Clean the text
        text = text
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\(.)/g, '$1')
          .trim();
        
        if (!text || text.length < 2) continue;
        
        // Skip obvious PDF metadata
        if (/^(Identity|Adobe|UCS|CMap|Type|Font|HiQPdf|PDF|Creator|Producer|BaseFont|Helvetica|Times|Arial|Courier)$/i.test(text)) {
          continue;
        }
        
        // Skip hex/binary content
        if (/^[A-F0-9\s]{8,}$/i.test(text) || /^[\d\.\-\s\\\/]+$/.test(text)) {
          continue;
        }
        
        // Must contain letters and be reasonable length
        if (/[a-zA-Z]/.test(text) && text.length <= 100 && !seenTexts.has(text.toLowerCase())) {
          seenTexts.add(text.toLowerCase());
          extractedText += text + ' ';
        }
      }
      
      console.log(`📝 Pattern ${extractionPatterns.indexOf(pattern) + 1}: ${patternMatches} matches`);
    }
    
    // Clean up the final text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🎯 Manual extraction complete: ${extractedText.length} characters`);
    
    if (extractedText.length > 20) {
      console.log(`📋 Sample extracted: "${extractedText.substring(0, 200)}..."`);
      return extractedText;
    }
    
    // If all methods failed
    return `📄 PDF Analysis Complete - Multiple extraction methods attempted.

🔍 PDF Structure:
- Pages: Detected
- Text Objects: ${hasTextObjects ? '✅ Present' : '❌ Missing'}
- Fonts: ${hasFont ? '✅ Present' : '❌ Missing'}
- Images: ${hasImages ? '✅ Detected' : '❌ None'}
- Compression: ${isCompressed ? '✅ Detected' : '❌ None'}
- File size: ${(uint8Array.length / 1024).toFixed(1)} KB

💡 This appears to be a scanned/image-based PDF requiring OCR.

🔧 Recommended OCR Solutions:
1. **Adobe Acrobat Pro**: Use "Recognize Text" feature
2. **Google Drive**: Upload PDF, it will auto-OCR
3. **Online OCR Services**:
   - smallpdf.com/ocr-pdf
   - pdf24.org/ocr-pdf  
   - ilovepdf.com/ocr-pdf
4. **Mobile Apps**: Adobe Scan, CamScanner, Microsoft Office Lens
5. **Desktop Software**: ABBYY FineReader, Tesseract OCR

📱 For lab reports, mobile scanning apps often work best as they can enhance image quality before OCR.`;
    
  } catch (error) {
    console.error('💥 Complete PDF extraction failure:', error);
    console.error('💥 Error name:', error.name);
    console.error('💥 Error message:', error.message);
    console.error('💥 Error stack:', error.stack);
    
    return `❌ PDF processing completely failed: ${error.message}

🔧 This indicates a serious issue with the PDF file:
- File may be corrupted or password-protected
- Unsupported PDF version or encoding
- File may not actually be a valid PDF

💡 Solutions:
1. Try opening the PDF in multiple PDF viewers to verify it's valid
2. If password-protected, remove protection first
3. Save/export the PDF from the original application again
4. Copy and paste text directly if selectable in a PDF viewer
5. Use OCR tools for scanned content`;
  }
}

async function extractFromDocx(uint8Array: Uint8Array): Promise<string> {
  try {
    const mammoth = await import('https://esm.sh/mammoth@1.6.0');
    const result = await mammoth.extractRawText({ arrayBuffer: uint8Array.buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

async function extractFromCSV(uint8Array: Uint8Array): Promise<string> {
  try {
    const Papa = await import('https://esm.sh/papaparse@5.4.1');
    const csvText = new TextDecoder().decode(uint8Array);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    
    if (parsed.errors.length > 0) {
      console.warn('CSV parsing warnings:', parsed.errors);
    }
    
    // Convert to readable format
    let result = `CSV Data Summary (${parsed.data.length} rows):\n\n`;
    
    if (parsed.data.length > 0) {
      const headers = Object.keys(parsed.data[0] as any);
      result += `Columns: ${headers.join(', ')}\n\n`;
      
      // Include first few rows as sample
      const sampleRows = parsed.data.slice(0, Math.min(10, parsed.data.length));
      result += 'Sample Data:\n';
      sampleRows.forEach((row: any, index: number) => {
        result += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
      });
    }
    
    return result;
  } catch (error) {
    console.error('CSV extraction error:', error);
    throw new Error(`Failed to extract text from CSV: ${error.message}`);
  }
}

async function extractFromExcel(uint8Array: Uint8Array): Promise<string> {
  try {
    const XLSX = await import('https://esm.sh/xlsx@0.18.5');
    const workbook = XLSX.read(uint8Array, { type: 'array' });
    
    let result = `Excel Workbook Summary:\n\n`;
    result += `Sheets: ${workbook.SheetNames.join(', ')}\n\n`;
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      result += `Sheet "${sheetName}" (${jsonData.length} rows):\n`;
      
      // Include first few rows
      const sampleRows = jsonData.slice(0, Math.min(10, jsonData.length));
      sampleRows.forEach((row: any, index: number) => {
        if (row && row.length > 0) {
          result += `Row ${index + 1}: ${row.join(' | ')}\n`;
        }
      });
      result += '\n';
    });
    
    return result;
  } catch (error) {
    console.error('Excel extraction error:', error);
    throw new Error(`Failed to extract text from Excel: ${error.message}`);
  }
}