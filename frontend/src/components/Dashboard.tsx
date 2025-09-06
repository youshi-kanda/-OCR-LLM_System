import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Divider
} from '@mui/material';
import {
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  id: string;
  filename: string;
  confidence_score: number;
  processing_time: number;
  created_at: string;
  transaction_count: number;
}

interface DashboardProps {
  history: HistoryItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  const navigate = useNavigate();

  // 統計計算
  const totalFiles = history.length;
  const totalTransactions = history.reduce((sum, item) => sum + item.transaction_count, 0);
  const averageConfidence = history.length > 0 
    ? history.reduce((sum, item) => sum + item.confidence_score, 0) / history.length 
    : 0;
  
  const recentHistory = history.slice(0, 5);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'success';
    if (score >= 0.7) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        銀行通帳データ読み取りシステム
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        PDFまたは画像ファイルをアップロードして、取引データを抽出・編集・CSV出力
      </Typography>

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{totalFiles}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                処理済みファイル数
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssessmentIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">{totalTransactions}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                総取引件数
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {(averageConfidence * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                平均信頼度
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            fullWidth
            sx={{ height: '100%' }}
            onClick={() => navigate('/upload')}
          >
            新規アップロード
          </Button>
        </Grid>
      </Grid>

      {/* 最新履歴 */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">最近のアップロード</Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate('/history')}
          >
            すべて表示
          </Button>
        </Box>
        
        {recentHistory.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              まだアップロードされたファイルがありません
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              sx={{ mt: 2 }}
              onClick={() => navigate('/upload')}
            >
              最初のファイルをアップロード
            </Button>
          </Box>
        ) : (
          <List>
            {recentHistory.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => navigate(`/edit/${item.id}`)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{item.filename}</span>
                        <Chip
                          size="small"
                          label={`${(item.confidence_score * 100).toFixed(1)}%`}
                          color={getConfidenceColor(item.confidence_score)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <span style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                          {item.transaction_count}件の取引 • 処理時間: {item.processing_time.toFixed(2)}s
                        </span>
                        <span style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                          {formatDate(item.created_at)}
                        </span>
                      </Box>
                    }
                  />
                </ListItem>
                {index < recentHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;