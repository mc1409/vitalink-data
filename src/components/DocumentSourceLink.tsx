import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentSourceLinkProps {
  sourceDocumentId?: string;
  documentInfo?: {
    filename: string;
    storage_path: string;
    created_at: string;
  };
  dataSource: string;
}

const DocumentSourceLink: React.FC<DocumentSourceLinkProps> = ({
  sourceDocumentId,
  documentInfo,
  dataSource
}) => {
  const handleDownloadDocument = async () => {
    if (!documentInfo?.storage_path) {
      toast.error('Document not available for download');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('medical-pdfs')
        .createSignedUrl(documentInfo.storage_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        toast.error('Failed to generate download link');
        return;
      }

      // Open in new tab for viewing/downloading
      window.open(data.signedUrl, '_blank');
      toast.success('Opening document...');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  // If there's a source document, show clickable link
  if (sourceDocumentId && documentInfo) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadDocument}
          className="h-auto p-1 text-xs flex items-center gap-1 text-primary hover:text-primary-foreground"
        >
          <FileText className="h-3 w-3" />
          <span className="truncate max-w-[120px]">{documentInfo.filename}</span>
          <Download className="h-3 w-3" />
        </Button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(new Date(documentInfo.created_at), 'MMM dd, yyyy')}
        </div>
      </div>
    );
  }

  // Fallback to basic data source badge
  return (
    <Badge variant="secondary" className="text-xs">
      {dataSource}
    </Badge>
  );
};

export default DocumentSourceLink;