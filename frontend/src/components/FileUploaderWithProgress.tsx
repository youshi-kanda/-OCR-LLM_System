import React, { useCallback, useEffect, useState } from 'react';
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
import ProgressDialog, { ProgressMessage } from './ProgressDialog';

interface FileUploaderWithProgressProps {
  onUploadStart: () => void;
  onUploadComplete: (result: ProcessingResult) => void;
  loading: boolean;
}

const FileUploaderWithProgress: React.FC<FileUploaderWithProgressProps> = ({
  onUploadStart,
  onUploadComplete,
  loading
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>([]);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [wsClient, setWsClient] = useState<WebSocket | null>(null);
  const [clientId] = useState(() => `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // WebSocket接続の初期化
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${clientId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsClient(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          // 進捗メッセージを追加
          const newMessage: ProgressMessage = {
            id: `msg-${Date.now()}`,
            message: data.message,
            status: 'processing',
            timestamp: new Date()
          };
          
          setProgressMessages(prev => {
            // 前のメッセージを完了状態に
            const updated = prev.map(msg => ({
              ...msg,
              status: 'completed' as const
            }));
            return [...updated, newMessage];
          });
          
          // バックエンドから送信された進捗率を使用
          if (data.progress !== undefined) {
            setProgress(data.progress);
          } else {
            // フォールバック: 従来の推定計算
            if (data.message.includes('page')) {
              const match = data.message.match(/(\d+)\/(\d+)/);
              if (match) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                setProgress(10 + (current / total) * 80);
              }
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsClient(null);
    };
    
    return () => {
      ws.close();
    };
  }, [clientId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setProgressOpen(true);
    setProgressMessages([]);
    setProgress(undefined);
    onUploadStart();

    try {
      // WebSocket経由で進捗を受信するため、clientIdを送信
      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);
      
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      
      // 完了メッセージ
      setProgressMessages(prev => [
        ...prev.map(msg => ({ ...msg, status: 'completed' as const })),
        {
          id: `msg-complete`,
          message: '処理が完了しました！',
          status: 'completed',
          timestamp: new Date()
        }
      ]);
      
      setProgress(100);
      
      // 2秒後にダイアログを閉じる
      setTimeout(() => {
        setProgressOpen(false);
        onUploadComplete(result);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'アップロードエラーが発生しました');
      setProgressOpen(false);
    }
  }, [onUploadStart, onUploadComplete, clientId]);

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
    <>
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
      
      <ProgressDialog
        open={progressOpen}
        title="ファイル処理中"
        messages={progressMessages}
        progress={progress}
      />
    </>
  );
};

export default FileUploaderWithProgress;