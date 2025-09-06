import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowsProp
} from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { IconButton, Tooltip } from '@mui/material';
import { ProcessingResult, TransactionData } from '../types/transaction';
import { downloadCSV, updateTransactions } from '../services/api';

interface DataViewerProps {
  result: ProcessingResult;
  onBack: () => void;
}

const DataViewer: React.FC<DataViewerProps> = ({ result, onBack }) => {
  const [transactions, setTransactions] = React.useState<TransactionData[]>(result.transactions);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<readonly number[]>([]);
  const [columns, setColumns] = React.useState<GridColDef[]>([]);
  const [showAddColumnDialog, setShowAddColumnDialog] = React.useState(false);
  const [newColumnName, setNewColumnName] = React.useState('');
  const [newColumnType, setNewColumnType] = React.useState<'text' | 'number'>('text');
  const [showAddRowDialog, setShowAddRowDialog] = React.useState(false);
  const [insertPosition, setInsertPosition] = React.useState(0);
  const [columnInsertPosition, setColumnInsertPosition] = React.useState(0);
  const [dataGridRef, setDataGridRef] = React.useState<HTMLDivElement | null>(null);

  // 初期列定義
  React.useEffect(() => {
    const initialColumns: GridColDef[] = [
      {
        field: 'date',
        headerName: '日付',
        width: 120,
        editable: true
      },
      {
        field: 'description',
        headerName: '摘要',
        width: 300,
        editable: true
      },
      {
        field: 'withdrawal',
        headerName: '出金',
        width: 120,
        type: 'number',
        editable: true,
        valueFormatter: (params) => params.value ? `¥${params.value.toLocaleString()}` : ''
      },
      {
        field: 'deposit',
        headerName: '入金',
        width: 120,
        type: 'number',
        editable: true,
        valueFormatter: (params) => params.value ? `¥${params.value.toLocaleString()}` : ''
      },
      {
        field: 'balance',
        headerName: '残高',
        width: 150,
        type: 'number',
        editable: true,
        valueFormatter: (params) => `¥${params.value.toLocaleString()}`
      },
      {
        field: 'confidence_score',
        headerName: '信頼度',
        width: 100,
        renderCell: (params) => (
          <Chip
            label={`${(params.value * 100).toFixed(1)}%`}
            size="small"
            color={params.value > 0.9 ? 'success' : params.value > 0.7 ? 'warning' : 'error'}
          />
        )
      }
    ];
    setColumns(initialColumns);
  }, []);

  const rows: GridRowsProp = transactions.map((transaction, index) => ({
    id: index,
    ...transaction
  }));


  const handleSave = async () => {
    try {
      await updateTransactions(result.id, transactions);
      setHasChanges(false);
    } catch (error) {
      console.error('保存エラー:', error);
    }
  };

  const [downloadLoading, setDownloadLoading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    setDownloadLoading(true);
    setDownloadError(null);
    
    try {
      // 変更がある場合は先に保存
      if (hasChanges) {
        await handleSave();
      }
      
      await downloadCSV(result.id);
      
      // 成功メッセージを表示（オプション）
      console.log('CSV ファイルのダウンロードが完了しました');
      
    } catch (error: any) {
      console.error('ダウンロードエラー:', error);
      setDownloadError(error.message || 'CSVファイルのダウンロードに失敗しました。');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleAddRow = () => {
    setInsertPosition(transactions.length); // デフォルトは最後
    setShowAddRowDialog(true);
  };

  const handleInsertRow = (position: number) => {
    const newTransaction: TransactionData = {
      date: '',
      description: '',
      withdrawal: undefined,
      deposit: undefined,
      balance: 0,
      confidence_score: 1.0
    };
    
    const updatedTransactions = [...transactions];
    updatedTransactions.splice(position, 0, newTransaction);
    setTransactions(updatedTransactions);
    setHasChanges(true);
    setShowAddRowDialog(false);
  };

  const handleDirectInsertRow = (position: number) => {
    const newTransaction: TransactionData = {
      date: '',
      description: '',
      withdrawal: undefined,
      deposit: undefined,
      balance: 0,
      confidence_score: 1.0
    };
    
    const updatedTransactions = [...transactions];
    updatedTransactions.splice(position, 0, newTransaction);
    setTransactions(updatedTransactions);
    setHasChanges(true);
  };

  const handleDeleteRows = () => {
    if (selectedRows.length === 0) return;
    
    const updatedTransactions = transactions.filter((_, index) => !selectedRows.includes(index));
    setTransactions(updatedTransactions);
    setSelectedRows([]);
    setHasChanges(true);
  };

  const handleAddColumn = (columnName: string, columnType: 'text' | 'number') => {
    const newColumn: GridColDef = {
      field: columnName,
      headerName: columnName,
      width: 120,
      editable: true,
      type: columnType === 'number' ? 'number' : 'string'
    };

    // 指定位置に列を挿入
    setColumns(prevColumns => {
      const updatedColumns = [...prevColumns];
      updatedColumns.splice(columnInsertPosition, 0, newColumn);
      return updatedColumns;
    });

    // 全ての取引データに新しい列のデフォルト値を追加
    const updatedTransactions = transactions.map(transaction => ({
      ...transaction,
      [columnName]: columnType === 'number' ? 0 : ''
    }));
    
    setTransactions(updatedTransactions);
    setHasChanges(true);
    setShowAddColumnDialog(false);
  };

  const handleOpenAddColumnDialog = () => {
    setColumnInsertPosition(columns.length); // デフォルトは最後
    setShowAddColumnDialog(true);
  };

  const handleDirectInsertColumn = (position: number) => {
    const columnCount = columns.filter(col => col.field.startsWith('新しい列')).length;
    const columnName = `新しい列${columnCount + 1}`;
    
    const newColumn: GridColDef = {
      field: columnName,
      headerName: columnName,
      width: 120,
      editable: true,
      type: 'string'
    };

    setColumns(prevColumns => {
      const updatedColumns = [...prevColumns];
      updatedColumns.splice(position, 0, newColumn);
      return updatedColumns;
    });

    const updatedTransactions = transactions.map(transaction => ({
      ...transaction,
      [columnName]: ''
    }));
    
    setTransactions(updatedTransactions);
    setHasChanges(true);
  };

  const handleCloseAddColumnDialog = () => {
    setShowAddColumnDialog(false);
    setNewColumnName('');
    setNewColumnType('text');
  };

  const getConfidenceColor = (score: number) => {
    if (score > 0.95) return 'success';
    if (score > 0.85) return 'warning';
    return 'error';
  };

  const needsReview = result.confidence_score < 0.85;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mr: 2 }}
        >
          戻る
        </Button>
        <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
          {result.filename}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
          >
            行追加
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            onClick={handleOpenAddColumnDialog}
          >
            列追加
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteRows}
            disabled={selectedRows.length === 0}
          >
            削除 ({selectedRows.length})
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            CSV出力
          </Button>
        </Box>
      </Box>

      {needsReview && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          信頼度が低い項目があります。データを確認・修正してください。
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">
              <Chip
                label={`${(result.confidence_score * 100).toFixed(1)}%`}
                color={getConfidenceColor(result.confidence_score)}
              />
            </Typography>
            <Typography variant="body2" color="textSecondary">
              総合信頼度
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">{transactions.length}</Typography>
            <Typography variant="body2" color="textSecondary">
              取引件数
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">
              {result.processing_time.toFixed(2)}s
            </Typography>
            <Typography variant="body2" color="textSecondary">
              処理時間
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">{result.processing_method}</Typography>
            <Typography variant="body2" color="textSecondary">
              処理方式
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {hasChanges && (
        <Alert severity="info" sx={{ mb: 3 }}>
          変更が保存されていません。
          <Button onClick={handleSave} sx={{ ml: 1 }}>
            保存
          </Button>
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%', position: 'relative' }}>
        <Box
          ref={setDataGridRef}
          sx={{ 
            height: '100%', 
            position: 'relative'
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 25 },
              },
            }}
            pageSizeOptions={[25]}
            checkboxSelection
            disableRowSelectionOnClick={false}
            onRowSelectionModelChange={(newSelectionModel) => {
              setSelectedRows(newSelectionModel as number[]);
            }}
            processRowUpdate={(newRow) => {
              const updatedTransactions = [...transactions];
              updatedTransactions[newRow.id as number] = {
                date: newRow.date,
                description: newRow.description,
                withdrawal: newRow.withdrawal,
                deposit: newRow.deposit,
                balance: newRow.balance,
                confidence_score: newRow.confidence_score
              };
              setTransactions(updatedTransactions);
              setHasChanges(true);
              return newRow;
            }}
            sx={{
              '& .MuiDataGrid-row': {
                '&:nth-of-type(odd)': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                }
              }
            }}
          />

          {/* 行間の＋ボタン */}
          {dataGridRef && transactions.map((_, index) => (
            <Box
              key={`row-hover-${index}`}
              sx={{
                position: 'absolute',
                left: -20,
                top: 110 + (index + 1) * 52 - 20,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover .row-add-button': {
                  opacity: 1
                }
              }}
            >
              <Tooltip title="この位置に行を追加">
                <IconButton
                  className="row-add-button"
                  size="small"
                  onClick={() => handleDirectInsertRow(index + 1)}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 10,
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                      opacity: '1 !important'
                    }
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          {/* 最初の行の前に追加ボタン */}
          <Box
            sx={{
              position: 'absolute',
              left: -20,
              top: 110 - 20,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover .row-add-button': {
                opacity: 1
              }
            }}
          >
            <Tooltip title="最初に行を追加">
              <IconButton
                className="row-add-button"
                size="small"
                onClick={() => handleDirectInsertRow(0)}
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  zIndex: 10,
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    opacity: '1 !important'
                  }
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* 列間の＋ボタン */}
          {dataGridRef && columns.map((_, index) => (
            <Box
              key={`col-hover-${index}`}
              sx={{
                position: 'absolute',
                left: 50 + (index + 1) * 120 + 120 - 20, // チェックボックス50px + 列幅120px
                top: 35,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover .column-add-button': {
                  opacity: 1
                }
              }}
            >
              <Tooltip title="この位置に列を追加">
                <IconButton
                  className="column-add-button"
                  size="small"
                  onClick={() => handleDirectInsertColumn(index + 1)}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: 'secondary.main',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 10,
                    '&:hover': {
                      backgroundColor: 'secondary.dark',
                      opacity: '1 !important'
                    }
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          {/* 最初の列の前に追加ボタン */}
          <Box
            sx={{
              position: 'absolute',
              left: 50 - 20, // チェックボックスの直後
              top: 35,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover .column-add-button': {
                opacity: 1
              }
            }}
          >
            <Tooltip title="最初に列を追加">
              <IconButton
                className="column-add-button"
                size="small"
                onClick={() => handleDirectInsertColumn(0)}
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: 'secondary.main',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  zIndex: 10,
                  '&:hover': {
                    backgroundColor: 'secondary.dark',
                    opacity: '1 !important'
                  }
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* 列追加ダイアログ */}
      <Dialog open={showAddColumnDialog} onClose={handleCloseAddColumnDialog}>
        <DialogTitle>新しい列を追加</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350, pt: 1 }}>
            <TextField
              label="列名"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              fullWidth
              placeholder="例: カテゴリ、メモ等"
            />
            <FormControl fullWidth>
              <InputLabel>データ型</InputLabel>
              <Select
                value={newColumnType}
                label="データ型"
                onChange={(e) => setNewColumnType(e.target.value as 'text' | 'number')}
              >
                <MenuItem value="text">テキスト</MenuItem>
                <MenuItem value="number">数値</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>挿入位置</InputLabel>
              <Select
                value={columnInsertPosition}
                label="挿入位置"
                onChange={(e) => setColumnInsertPosition(e.target.value as number)}
              >
                <MenuItem value={0}>最初に挿入</MenuItem>
                {columns.map((column, index) => (
                  <MenuItem key={index} value={index + 1}>
                    「{column.headerName}」の後に挿入
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddColumnDialog}>
            キャンセル
          </Button>
          <Button 
            onClick={() => handleAddColumn(newColumnName, newColumnType)}
            variant="contained"
            disabled={!newColumnName.trim()}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 行挿入ダイアログ */}
      <Dialog open={showAddRowDialog} onClose={() => setShowAddRowDialog(false)}>
        <DialogTitle>行を挿入する位置を選択</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350, pt: 1 }}>
            <Typography variant="body2" color="textSecondary">
              新しい行を挿入する位置を選択してください
            </Typography>
            <FormControl fullWidth>
              <InputLabel>挿入位置</InputLabel>
              <Select
                value={insertPosition}
                label="挿入位置"
                onChange={(e) => setInsertPosition(e.target.value as number)}
              >
                <MenuItem value={0}>最初に挿入</MenuItem>
                {transactions.map((transaction, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {index + 1}行目の後に挿入 ({transaction.date} {transaction.description})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddRowDialog(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={() => handleInsertRow(insertPosition)}
            variant="contained"
          >
            挿入
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Container>
  );
};

export default DataViewer;