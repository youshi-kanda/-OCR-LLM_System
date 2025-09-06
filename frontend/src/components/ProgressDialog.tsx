import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  Loop as ProcessingIcon
} from '@mui/icons-material';

interface ProgressDialogProps {
  open: boolean;
  title: string;
  messages: ProgressMessage[];
  progress?: number;
}

export interface ProgressMessage {
  id: string;
  message: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp: Date;
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({
  open,
  title,
  messages,
  progress
}) => {
  const getIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'processing':
        return <ProcessingIcon color="primary" className="rotating" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip label="完了" size="small" color="success" />;
      case 'processing':
        return <Chip label="処理中" size="small" color="primary" />;
      default:
        return <Chip label="待機中" size="small" variant="outlined" />;
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: 400
        }
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {progress !== undefined ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  処理進捗
                </Typography>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  {Math.round(progress)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    background: progress < 50 ? 
                      'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)' :
                      progress < 90 ?
                      'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' :
                      'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
                  }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {progress < 10 ? 'ファイル変換中...' :
                   progress < 90 ? 'AI解析中...' :
                   progress < 100 ? '結果統合中...' : '完了'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progress >= 100 ? '処理完了!' : '処理中...'}
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <LinearProgress 
                variant="indeterminate" 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                処理中...
              </Typography>
            </>
          )}
        </Box>

        <List>
          {messages.map((msg) => (
            <ListItem key={msg.id} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {getIcon(msg.status)}
              </ListItemIcon>
              <ListItemText
                primary={msg.message}
                secondary={new Date(msg.timestamp).toLocaleTimeString('ja-JP')}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.95rem',
                    color: msg.status === 'completed' ? 'text.secondary' : 'text.primary'
                  }
                }}
              />
              {getStatusChip(msg.status)}
            </ListItem>
          ))}
        </List>

        <style>{`
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .rotating {
            animation: rotate 1s linear infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressDialog;