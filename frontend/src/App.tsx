import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Typography, Box, Button } from '@mui/material';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HistoryList from './components/HistoryList';
import FileUploaderWithProgress from './components/FileUploaderWithProgress';
import DataViewerEnhanced from './components/DataViewerEnhanced';
import { ProcessingResult } from './types/transaction';
import { getHistory, getResult, HistoryItem } from './services/api';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// アップロードページコンポーネント
const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleUploadComplete = (result: ProcessingResult) => {
    setLoading(false);
    navigate(`/edit/${result.id}`);
  };

  const handleUploadStart = () => {
    setLoading(true);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          新規ファイルアップロード
        </Typography>
        
        <Typography variant="subtitle1" align="center" color="textSecondary" paragraph>
          PDFまたは画像ファイルをアップロードして、取引データを抽出
        </Typography>

        <Box sx={{ mt: 4 }}>
          <FileUploaderWithProgress 
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            loading={loading}
          />
        </Box>
      </Box>
    </Container>
  );
};

// 編集ページコンポーネント
const EditPage: React.FC<{ fileId: string }> = ({ fileId }) => {
  const navigate = useNavigate();
  const [result, setResult] = React.useState<ProcessingResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await getResult(fileId);
        setResult(data);
      } catch (error) {
        console.error('Result fetch error:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [fileId, navigate]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography>読み込み中...</Typography>
        </Box>
      </Container>
    );
  }

  if (!result) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography>データが見つかりません</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <DataViewerEnhanced 
      result={result}
      onBack={() => navigate('/history')}
    />
  );
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch (error) {
        console.error('History fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography>読み込み中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard history={history} />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/history" element={<HistoryList history={history} />} />
      <Route path="/edit/:fileId" element={
        <EditPageWrapper />
      } />
      <Route path="*" element={
        <Container maxWidth="lg">
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              ページが見つかりません
            </Typography>
            <Button variant="contained" onClick={() => window.location.href = '/'}>
              ホームに戻る
            </Button>
          </Box>
        </Container>
      } />
    </Routes>
  );
};

// EditPage のルーターラッパー
const EditPageWrapper: React.FC = () => {
  const { fileId } = useParams();
  return <EditPage fileId={fileId!} />;
};


function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <AppContent />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;