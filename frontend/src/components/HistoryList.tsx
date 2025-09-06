import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { downloadCSV } from '../services/api';

interface HistoryItem {
  id: string;
  filename: string;
  confidence_score: number;
  processing_time: number;
  created_at: string;
  transaction_count: number;
  processing_method?: string;
}

interface HistoryListProps {
  history: HistoryItem[];
}

const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');

  // 検索フィルター
  const filteredHistory = history.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
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

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      await downloadCSV(fileId);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          ダッシュボードに戻る
        </Button>
        <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
          データ履歴一覧
        </Typography>
      </Box>

      {/* 検索バー */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="ファイル名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* 履歴テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ファイル名</TableCell>
              <TableCell align="center">処理日時</TableCell>
              <TableCell align="center">取引件数</TableCell>
              <TableCell align="center">信頼度</TableCell>
              <TableCell align="center">処理時間</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm ? '検索条件に一致するファイルがありません' : 'まだアップロードされたファイルがありません'}
                  </Typography>
                  {!searchTerm && (
                    <Button
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/upload')}
                    >
                      最初のファイルをアップロード
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/edit/${item.id}`)}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{item.filename}</Typography>
                    {item.processing_method && (
                      <Typography variant="caption" color="text.secondary">
                        {item.processing_method}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {item.transaction_count}件
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={`${(item.confidence_score * 100).toFixed(1)}%`}
                      color={getConfidenceColor(item.confidence_score)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {item.processing_time.toFixed(2)}s
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/edit/${item.id}`);
                      }}
                      title="編集"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item.id, item.filename);
                      }}
                      title="CSVダウンロード"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default HistoryList;