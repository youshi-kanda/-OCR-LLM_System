import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadFile } from '../services/api';
import { ProcessingResult } from '../types/transaction';

interface FileUploaderProps {
  onUploadStart: () => void;
  onUploadComplete: (result: ProcessingResult) => void;
  loading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadStart,
  onUploadComplete,
  loading
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    onUploadStart();

    try {
      const result = await uploadFile(file);
      onUploadComplete(result);
    } catch (err: any) {
      setError(err.message || 'アップロードエラーが発生しました');
    }
  }, [onUploadStart, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: loading
  });

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <Box>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">
              ファイルを処理中...
            </Typography>
            <Typography variant="body2" color="textSecondary">
              LLMによるデータ抽出を実行しています
            </Typography>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'ここにドロップ' : 'ファイルをドラッグ&ドロップ'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              または
            </Typography>
            <Button variant="contained" component="span" size="large">
              ファイルを選択
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 2 }}>
              対応形式: PDF, JPEG, PNG (最大10MB)
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FileUploader;