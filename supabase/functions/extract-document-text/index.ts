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
    console.log('🤖 Starting Azure OpenAI PDF text extraction...');
    console.log(`📄 PDF size: ${uint8Array.length} bytes`);
    
    // Get Azure OpenAI credentials from environment
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
    
    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      throw new Error('Azure OpenAI credentials not configured');
    }
    
    console.log('🔑 Azure OpenAI credentials verified');
    console.log(`🌐 Endpoint: ${azureEndpoint}`);
    console.log(`🚀 Deployment: ${azureDeployment}`);
    
    // Convert PDF to base64 for sending to Azure OpenAI
    const base64PDF = btoa(String.fromCharCode(...uint8Array));
    console.log(`📋 PDF converted to base64 (${base64PDF.length} chars)`);
    
    // Prepare the prompt for text extraction
    const systemPrompt = `You are an expert medical document text extractor. Your task is to extract ALL readable text from the provided PDF document, focusing especially on medical/lab report content.

IMPORTANT INSTRUCTIONS:
1. Extract ALL text content, including:
   - Patient information (names, dates, IDs)
   - Test names and results
   - Reference ranges and units
   - Dates and times
   - Doctor/lab information
   - Any numerical values with units
   - Headers, labels, and descriptions

2. Organize the extracted text logically:
   - Preserve the document structure when possible
   - Group related information together
   - Maintain the order of test results as they appear

3. For lab reports specifically, ensure you capture:
   - Test names (e.g., "Hemoglobin", "Glucose", "Cholesterol")
   - Numerical results with units (e.g., "14.5 g/dL", "95 mg/dL")
   - Reference ranges (e.g., "Normal: 12.0-15.5 g/dL")
   - Abnormal flags (High, Low, etc.)

4. Return ONLY the extracted text content - no analysis or interpretation.

5. If the PDF appears to be scanned/image-based, use your vision capabilities to read all visible text.`;

    const userPrompt = `Please extract all text content from this PDF document. Focus on medical/lab data if present.`;
    
    // Prepare Azure OpenAI request
    const requestBody = {
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64PDF}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: "text" }
    };
    
    const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`;
    
    console.log('📤 Sending PDF to Azure OpenAI for text extraction...');
    console.log(`⏰ Request time: ${new Date().toISOString()}`);
    
    // Send request to Azure OpenAI
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`⏰ Response time: ${new Date().toISOString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Azure OpenAI API error:', errorText);
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Azure OpenAI response received');
    
    // Extract the text content from the response
    const extractedText = data.choices?.[0]?.message?.content;
    
    if (!extractedText || extractedText.trim().length < 10) {
      console.log('⚠️ Minimal text extracted from Azure OpenAI');
      
      return `📄 Azure OpenAI PDF Analysis Complete

⚠️ The AI was able to process the PDF but extracted minimal readable text.

This could mean:
- The PDF is heavily image-based with poor quality scans
- The document has complex formatting that obscured the text
- The file may be corrupted or password-protected
- The PDF contains mostly images/graphics with little text

🔧 Recommendations:
1. **Try manual copy-paste**: If you can select text in a PDF viewer, copy and paste it directly
2. **Use OCR tools**: Try Adobe Acrobat, Google Drive, or online OCR services
3. **Re-scan with better quality**: If it's a scanned document, try rescanning at higher resolution
4. **Check file integrity**: Ensure the PDF opens properly in other applications

📝 Extracted content: "${extractedText}"`;
    }
    
    // Clean up the extracted text
    const cleanText = extractedText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
    
    console.log(`✅ Successfully extracted ${cleanText.length} characters using Azure OpenAI`);
    console.log(`📋 Sample extracted text: "${cleanText.substring(0, 300)}..."`);
    
    return cleanText;
    
  } catch (error) {
    console.error('💥 Azure OpenAI PDF extraction error:', error);
    console.error('💥 Error details:', error.message);
    console.error('💥 Error stack:', error.stack);
    
    // Fallback to basic extraction if Azure OpenAI fails
    console.log('🔄 Falling back to basic text extraction...');
    return await fallbackPDFExtraction(uint8Array, error.message);
  }
}

// Fallback method if Azure OpenAI fails
async function fallbackPDFExtraction(uint8Array: Uint8Array, azureError: string): Promise<string> {
  try {
    console.log('🔄 Using fallback extraction method...');
    
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(uint8Array);
    
    // Simple parentheses extraction as fallback
    const parenthesesRegex = /\(([^)]+)\)/g;
    let match;
    let extractedText = '';
    const seenTexts = new Set();
    let count = 0;
    
    while ((match = parenthesesRegex.exec(pdfContent)) !== null && count < 300) {
      count++;
      let text = match[1];
      
      if (!text || text.length < 3 || text.length > 80) continue;
      
      // Basic cleaning
      text = text.replace(/\\[nrt]/g, ' ').trim();
      
      // Skip obvious metadata
      if (/^(Identity|Adobe|UCS|HiQPdf|PDF|CMap|Type|Font)$/i.test(text)) continue;
      if (/^[\d\.\-\s]+$/.test(text)) continue;
      
      if (/[a-zA-Z]{2,}/.test(text) && !seenTexts.has(text.toLowerCase())) {
        seenTexts.add(text.toLowerCase());
        extractedText += text + ' ';
      }
    }
    
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (extractedText.length > 20) {
      return `⚠️ Azure OpenAI extraction failed, used fallback method.

Azure Error: ${azureError}

📝 Fallback extracted text:
${extractedText}

💡 For better results:
1. Try uploading a different PDF format
2. Use OCR tools for scanned documents
3. Copy and paste text directly if selectable`;
    }
    
    return `❌ Both Azure OpenAI and fallback extraction failed.

Azure Error: ${azureError}

🔧 This PDF appears to be:
- Scanned/image-based requiring OCR
- Password protected or corrupted
- Using unsupported encoding

💡 Please try:
1. Copy and paste text directly from a PDF viewer
2. Use OCR tools: Adobe Acrobat, Google Drive, smallpdf.com
3. Convert to a different format and try again`;
    
  } catch (fallbackError) {
    console.error('💥 Fallback extraction also failed:', fallbackError);
    return `❌ Complete PDF extraction failure.

Azure Error: ${azureError}
Fallback Error: ${fallbackError.message}

Please try manual text entry or OCR tools.`;
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