/**
 * 拡張版DataViewerコンポーネント
 * 学習システム機能を統合
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  Grid,
  Container,
  Divider,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { ProcessingResult, TransactionData } from '../types/transaction';
import { downloadCSV, updateTransactions } from '../services/api';
import EnhancedDataGrid from './EnhancedDataGrid';
import ColumnEditor from './ColumnEditor';
import ExportDialog, { ExportSettings } from './ExportDialog';
import { GridColDef } from '@mui/x-data-grid';

interface DataViewerEnhancedProps {
  result: ProcessingResult;
  onBack: () => void;
}

const DataViewerEnhanced: React.FC<DataViewerEnhancedProps> = ({ result, onBack }) => {
  const [transactions, setTransactions] = useState<TransactionData[]>(result.transactions);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 銀行名の検出
  const detectBankName = (): string | undefined => {
    const filename = result.filename || '';
    for (const bank of ['GMOあおぞら', '三菱UFJ', 'みずほ', '楽天', 'ゆうちょ']) {
      if (filename.includes(bank)) {
        return bank;
      }
    }
    return undefined;
  };

  const bankName = detectBankName();

  useEffect(() => {
    // カラム定義を生成
    const generateColumns = () => {
      if (!transactions || transactions.length === 0) return [];

      const firstTransaction = transactions[0];
      const columnDefs: GridColDef[] = [];

      // ID列（非表示）
      columnDefs.push({
        field: 'id',
        headerName: 'ID',
        width: 70,
        hideable: false,
        sortable: false
      });

      // 標準列
      const standardColumns = [
        { field: 'date', headerName: '日付', width: 120, editable: true },
        { field: 'description', headerName: '摘要', width: 300, editable: true },
        { field: 'withdrawal', headerName: '出金', width: 120, type: 'number', editable: true },
        { field: 'deposit', headerName: '入金', width: 120, type: 'number', editable: true },
        { field: 'balance', headerName: '残高', width: 150, type: 'number', editable: true }
      ];

      standardColumns.forEach(col => {
        if (firstTransaction.hasOwnProperty(col.field)) {
          columnDefs.push(col as GridColDef);
        }
      });

      // 動的に検出された追加列
      Object.keys(firstTransaction).forEach(key => {
        if (!['id', 'date', 'description', 'withdrawal', 'deposit', 'balance', 'confidence_score'].includes(key)) {
          columnDefs.push({
            field: key,
            headerName: key,
            width: 150,
            editable: true
          });
        }
      });

      // 信頼度列
      if (firstTransaction.confidence_score !== undefined) {
        columnDefs.push({
          field: 'confidence_score',
          headerName: '信頼度',
          width: 100,
          renderCell: (params) => {
            const score = params.value as number;
            const percentage = (score * 100).toFixed(0);
            const color = score >= 0.9 ? 'success' : score >= 0.7 ? 'warning' : 'error';
            return (
              <Chip
                label={`${percentage}%`}
                color={color}
                size="small"
                variant="outlined"
              />
            );
          }
        });
      }

      return columnDefs;
    };

    setColumns(generateColumns());
  }, [transactions]);

  // データに行IDを追加
  const transactionsWithId = transactions.map((t, index) => ({
    ...t,
    id: index + 1
  }));

  const handleDataChange = (newRows: any[]) => {
    // IDを除去してトランザクションデータに戻す
    const newTransactions = newRows.map(row => {
      const { id, ...transaction } = row;
      return transaction as TransactionData;
    });
    setTransactions(newTransactions);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
      await updateTransactions(result.id, transactions);
      setHasChanges(false);
      setSaveMessage({ type: 'success', text: 'データを保存しました' });
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (settings: ExportSettings) => {
    try {
      // カスタム設定でCSVを生成
      const csvContent = generateCSV(transactions, settings);
      
      // ダウンロード
      const blob = new Blob([csvContent], { 
        type: settings.encoding === 'Shift-JIS' 
          ? 'text/csv;charset=shift-jis' 
          : 'text/csv;charset=utf-8' 
      });
      
      // BOM追加
      if (settings.encoding === 'UTF-8 BOM') {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blobWithBOM = new Blob([bom, blob]);
        downloadBlob(blobWithBOM, settings.fileName || 'export.csv');
      } else {
        downloadBlob(blob, settings.fileName || 'export.csv');
      }
      
      setSaveMessage({ type: 'success', text: 'CSVをエクスポートしました' });
    } catch (error) {
      console.error('Export error:', error);
      setSaveMessage({ type: 'error', text: 'エクスポートに失敗しました' });
    }
  };

  const generateCSV = (data: any[], settings: ExportSettings): string => {
    const lines: string[] = [];
    
    // ヘッダー行
    if (settings.includeHeader) {
      const headers = settings.columns.map(col => {
        const column = columns.find(c => c.field === col);
        return column?.headerName || col;
      });
      lines.push(headers.join(settings.delimiter));
    }
    
    // データ行
    data.forEach(row => {
      const values = settings.columns.map(col => {
        let value = row[col];
        
        // 日付フォーマット
        if (col === 'date' && value) {
          value = formatDate(value, settings.dateFormat);
        }
        
        // 数値フォーマット
        if (typeof value === 'number') {
          if (settings.numberFormat.thousandSeparator) {
            value = value.toLocaleString('ja-JP');
          }
          if (settings.numberFormat.decimalPlaces > 0) {
            value = value.toFixed(settings.numberFormat.decimalPlaces);
          }
        }
        
        // 文字列の場合はクォート
        if (typeof value === 'string' && value.includes(settings.delimiter)) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value ?? '';
      });
      lines.push(values.join(settings.delimiter));
    });
    
    return lines.join('\n');
  };

  const formatDate = (date: string, format: string): string => {
    // 簡易的な日付フォーマット（実際にはdate-fnsなどを使用すべき）
    return date;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDefaultExport = async () => {
    try {
      await downloadCSV(result.id);
      setSaveMessage({ type: 'success', text: 'CSVをダウンロードしました' });
    } catch (error) {
      console.error('Download error:', error);
      setSaveMessage({ type: 'error', text: 'ダウンロードに失敗しました' });
    }
  };

  // 統計情報の計算
  const stats = {
    totalWithdrawal: transactions.reduce((sum, t) => sum + (t.withdrawal || 0), 0),
    totalDeposit: transactions.reduce((sum, t) => sum + (t.deposit || 0), 0),
    averageConfidence: transactions.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / transactions.length,
    lowConfidenceCount: transactions.filter(t => (t.confidence_score || 0) < 0.7).length
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={onBack}
              variant="outlined"
            >
              戻る
            </Button>
            <Typography variant="h5" component="h1">
              {result.filename}
            </Typography>
            {bankName && (
              <Chip label={bankName} color="primary" variant="outlined" />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              variant="contained"
              disabled={!hasChanges || saving}
            >
              保存
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => setExportDialogOpen(true)}
              variant="outlined"
            >
              カスタムエクスポート
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleDefaultExport}
              variant="outlined"
            >
              標準CSV
            </Button>
          </Box>
        </Box>

        {/* 統計情報 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                取引件数
              </Typography>
              <Typography variant="h4">
                {transactions.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                総出金額
              </Typography>
              <Typography variant="h4" color="error">
                ¥{stats.totalWithdrawal.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                総入金額
              </Typography>
              <Typography variant="h4" color="success.main">
                ¥{stats.totalDeposit.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                平均信頼度
              </Typography>
              <Typography variant="h4">
                {(stats.averageConfidence * 100).toFixed(1)}%
              </Typography>
              {stats.lowConfidenceCount > 0 && (
                <Typography variant="caption" color="warning.main">
                  {stats.lowConfidenceCount}件要確認
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* 進捗バー */}
        {saving && <LinearProgress sx={{ mb: 2 }} />}

        {/* メッセージ */}
        {saveMessage && (
          <Alert 
            severity={saveMessage.type} 
            onClose={() => setSaveMessage(null)}
            sx={{ mb: 2 }}
          >
            {saveMessage.text}
          </Alert>
        )}

        {/* データグリッド */}
        <Paper sx={{ p: 2 }}>
          <EnhancedDataGrid
            rows={transactionsWithId}
            columns={columns}
            fileId={result.id}
            bankName={bankName}
            onDataChange={handleDataChange}
            onColumnSettingsClick={() => setColumnEditorOpen(true)}
          />
        </Paper>

        {/* ダイアログ */}
        <ColumnEditor
          open={columnEditorOpen}
          onClose={() => setColumnEditorOpen(false)}
          columns={columns}
          bankName={bankName}
          onColumnsChange={(newColumns) => {
            // カラム設定を更新
            console.log('Columns updated:', newColumns);
            
            // 新しいカラム定義を適用
            const updatedColumns = newColumns.map((col: any) => ({
              field: col.standard_name || col.original_name,
              headerName: col.display_name,
              width: 150,
              editable: col.is_editable,
              type: col.data_type === 'number' ? 'number' : 'text',
              sortable: true,
              filterable: true
            }));
            
            // ID列を先頭に追加
            const columnsWithId = [
              {
                field: 'id',
                headerName: 'ID',
                width: 70,
                hideable: false,
                sortable: false
              },
              ...updatedColumns
            ];
            
            setColumns(columnsWithId);
            setColumnEditorOpen(false);
          }}
        />

        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          data={transactions}
          columns={columns}
          fileId={result.id}
          onExport={handleExport}
        />
      </Box>
    </Container>
  );
};

export default DataViewerEnhanced;