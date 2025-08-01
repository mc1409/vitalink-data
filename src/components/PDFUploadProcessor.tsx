import React from 'react';
import EnhancedPDFExtractor from './EnhancedPDFExtractor';

// This component now uses the enhanced PDF extractor with OCR support
const PDFUploadProcessor: React.FC = () => {
  return <EnhancedPDFExtractor />;
};

export default PDFUploadProcessor;