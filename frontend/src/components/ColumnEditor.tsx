/**
 * カラム編集ダイアログコンポーネント
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Switch,
  Paper,
  Box,
  Typography,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Alert
} from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { ColumnMapping, saveColumnMappings, getColumnMappings } from '../services/learningApi';

interface ColumnEditorProps {
  open: boolean;
  onClose: () => void;
  columns: any[];
  bankName?: string;
  onColumnsChange: (columns: ColumnMapping[]) => void;
}

const ColumnEditor: React.FC<ColumnEditorProps> = ({
  open,
  onClose,
  columns: initialColumns,
  bankName,
  onColumnsChange
}) => {
  const [columns, setColumns] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadColumns = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let mappings: ColumnMapping[] = [];
      
      // 銀行のマッピングがあれば取得
      if (bankName) {
        const savedMappings = await getColumnMappings(bankName);
        if (savedMappings.length > 0) {
          mappings = savedMappings;
        }
      }
      
      // 実際のトランザクションデータから列を生成
      if (initialColumns && initialColumns.length > 0) {
        const actualMappings: ColumnMapping[] = initialColumns
          .filter(col => col.field !== 'id') // ID列を除外
          .map((col, index) => {
            // 保存済みマッピングがあるかチェック
            const existingMapping = mappings.find(m => 
              m.original_name === col.field || 
              m.standard_name === col.field
            );
            
            if (existingMapping) {
              return {
                ...existingMapping,
                position: index + 1
              };
            }
            
            // 新しいマッピングを作成
            return {
              original_name: col.field,
              display_name: col.headerName || col.field,
              standard_name: col.field,
              data_type: detectDataTypeFromColumn(col),
              position: index + 1,
              is_visible: true,
              is_editable: col.editable !== false,
              is_required: false
            };
          });
        
        setColumns(actualMappings);
      } else {
        // フォールバック: 保存済みマッピングまたは空の配列
        setColumns(mappings);
      }
    } catch (err) {
      console.error('Failed to load columns:', err);
      setError('カラム情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [bankName, initialColumns]);

  // 初期化
  useEffect(() => {
    if (open) {
      loadColumns();
    }
  }, [open, bankName, initialColumns, loadColumns]);

  const detectDataType = (column: any): 'date' | 'text' | 'number' | 'currency' => {
    const name = (column.name || column.key || '').toLowerCase();
    if (name.includes('date') || name.includes('日付')) return 'date';
    if (name.includes('amount') || name.includes('金額') || 
        name.includes('withdrawal') || name.includes('deposit') || 
        name.includes('balance') || name.includes('出金') || 
        name.includes('入金') || name.includes('残高')) return 'currency';
    if (typeof column.value === 'number') return 'number';
    return 'text';
  };

  const detectDataTypeFromColumn = (column: any): 'date' | 'text' | 'number' | 'currency' => {
    const field = (column.field || '').toLowerCase();
    const headerName = (column.headerName || '').toLowerCase();
    
    if (field.includes('date') || field.includes('日付') || 
        headerName.includes('date') || headerName.includes('日付')) return 'date';
    
    if (field.includes('amount') || field.includes('金額') || 
        field.includes('withdrawal') || field.includes('deposit') || 
        field.includes('balance') || field.includes('出金') || 
        field.includes('入金') || field.includes('残高') ||
        headerName.includes('amount') || headerName.includes('金額') || 
        headerName.includes('withdrawal') || headerName.includes('deposit') || 
        headerName.includes('balance') || headerName.includes('出金') || 
        headerName.includes('入金') || headerName.includes('残高')) return 'currency';
    
    if (column.type === 'number') return 'number';
    
    return 'text';
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // 位置を更新
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index + 1
    }));
    
    setColumns(updatedItems);
    setHasChanges(true);
  };

  const handleColumnChange = (index: number, field: keyof ColumnMapping, value: any) => {
    const updatedColumns = [...columns];
    updatedColumns[index] = {
      ...updatedColumns[index],
      [field]: value
    };
    setColumns(updatedColumns);
    setHasChanges(true);
  };

  const handleAddColumn = () => {
    const newColumn: ColumnMapping = {
      original_name: `custom_${Date.now()}`,
      display_name: '新しい列',
      standard_name: `custom_${Date.now()}`,
      data_type: 'text',
      position: columns.length + 1,
      is_visible: true,
      is_editable: true,
      is_required: false
    };
    setColumns([...columns, newColumn]);
    setHasChanges(true);
  };

  const handleDeleteColumn = (index: number) => {
    const updatedColumns = columns.filter((_, i) => i !== index);
    // 位置を再計算
    const reindexedColumns = updatedColumns.map((col, i) => ({
      ...col,
      position: i + 1
    }));
    setColumns(reindexedColumns);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!bankName) {
      setError('銀行名が指定されていません');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await saveColumnMappings(bankName, columns);
      onColumnsChange(columns);
      setHasChanges(false);
      onClose();
    } catch (err) {
      console.error('Failed to save columns:', err);
      setError('カラム設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    loadColumns();
    setHasChanges(false);
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    const updatedColumns = [...columns];
    [updatedColumns[index], updatedColumns[newIndex]] = 
    [updatedColumns[newIndex], updatedColumns[index]];
    
    // 位置を更新
    updatedColumns[index].position = index + 1;
    updatedColumns[newIndex].position = newIndex + 1;
    
    setColumns(updatedColumns);
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">列の設定</Typography>
          {bankName && (
            <Typography variant="body2" color="textSecondary">
              銀行: {bankName}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box mb={2}>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddColumn}
            variant="outlined"
            size="small"
          >
            カスタム列を追加
          </Button>
        </Box>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided: any) => (
              <TableContainer 
                component={Paper} 
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40}></TableCell>
                      <TableCell>元の列名</TableCell>
                      <TableCell>表示名</TableCell>
                      <TableCell>標準名</TableCell>
                      <TableCell width={120}>データ型</TableCell>
                      <TableCell width={80} align="center">表示</TableCell>
                      <TableCell width={80} align="center">編集可</TableCell>
                      <TableCell width={80} align="center">必須</TableCell>
                      <TableCell width={120} align="center">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {columns.map((column, index) => (
                      <Draggable 
                        key={`${column.original_name}-${index}`}
                        draggableId={`${column.original_name}-${index}`}
                        index={index}
                      >
                        {(provided: any, snapshot: any) => (
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              backgroundColor: snapshot.isDragging ? '#f5f5f5' : 'inherit'
                            }}
                          >
                            <TableCell {...provided.dragHandleProps}>
                              ≡
                            </TableCell>
                            <TableCell>
                              <TextField
                                value={column.original_name}
                                onChange={(e) => handleColumnChange(index, 'original_name', e.target.value)}
                                size="small"
                                fullWidth
                                disabled={!column.original_name.startsWith('custom_')}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                value={column.display_name}
                                onChange={(e) => handleColumnChange(index, 'display_name', e.target.value)}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                value={column.standard_name}
                                onChange={(e) => handleColumnChange(index, 'standard_name', e.target.value)}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={column.data_type}
                                onChange={(e) => handleColumnChange(index, 'data_type', e.target.value)}
                                size="small"
                                fullWidth
                              >
                                <MenuItem value="date">日付</MenuItem>
                                <MenuItem value="text">テキスト</MenuItem>
                                <MenuItem value="number">数値</MenuItem>
                                <MenuItem value="currency">金額</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                checked={column.is_visible}
                                onChange={(e) => handleColumnChange(index, 'is_visible', e.target.checked)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                checked={column.is_editable}
                                onChange={(e) => handleColumnChange(index, 'is_editable', e.target.checked)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                checked={column.is_required}
                                onChange={(e) => handleColumnChange(index, 'is_required', e.target.checked)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="上へ移動">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => moveColumn(index, 'up')}
                                    disabled={index === 0}
                                  >
                                    <ArrowUpIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="下へ移動">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => moveColumn(index, 'down')}
                                    disabled={index === columns.length - 1}
                                  >
                                    <ArrowDownIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              {column.original_name.startsWith('custom_') && (
                                <Tooltip title="削除">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteColumn(index)}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Droppable>
        </DragDropContext>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleReset}
          startIcon={<ResetIcon />}
          disabled={!hasChanges || loading}
        >
          リセット
        </Button>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!hasChanges || loading}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnEditor;