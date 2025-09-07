/**
 * カスタムCSVエクスポートダイアログ
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from 'react-beautiful-dnd';
import {
  ExportPreset,
  getExportPresets,
  saveExportPreset
} from '../services/learningApi';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  data: any[];
  columns: any[];
  fileId: string;
  onExport: (settings: ExportSettings) => void;
}

export interface ExportSettings {
  columns: string[];
  delimiter: string;
  encoding: string;
  dateFormat: string;
  numberFormat: {
    thousandSeparator: boolean;
    decimalPlaces: number;
    negativeFormat: 'minus' | 'parentheses';
  };
  includeHeader: boolean;
  fileName?: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  data,
  columns,
  fileId,
  onExport
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [delimiter, setDelimiter] = useState(',');
  const [encoding, setEncoding] = useState('UTF-8 BOM');
  const [dateFormat, setDateFormat] = useState('YYYY/MM/DD');
  const [thousandSeparator, setThousandSeparator] = useState(false);
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [negativeFormat, setNegativeFormat] = useState<'minus' | 'parentheses'>('minus');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [fileName, setFileName] = useState('');
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const loadPresets = useCallback(async () => {
    try {
      const loadedPresets = await getExportPresets();
      
      // APIレスポンスのJSON文字列をパース
      const parsedPresets = loadedPresets.map(preset => ({
        ...preset,
        columns: typeof preset.columns === 'string' 
          ? JSON.parse(preset.columns) 
          : preset.columns,
        export_settings: typeof preset.export_settings === 'string'
          ? JSON.parse(preset.export_settings)
          : preset.export_settings
      }));
      
      setPresets(parsedPresets);
      
      // デフォルトプリセットを選択
      const defaultPreset = parsedPresets.find(p => p.is_default);
      if (defaultPreset) {
        applyPreset(defaultPreset);
        setSelectedPreset(defaultPreset.id || '');
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, []);

  const initializeColumns = useCallback(() => {
    // デフォルトで全ての列を選択
    if (columns && Array.isArray(columns)) {
      const columnNames = columns
        .filter(col => col.field !== 'id' && col.field !== 'actions')
        .map(col => col.field);
      setSelectedColumns(columnNames);
    } else {
      setSelectedColumns([]);
    }
  }, [columns]);

  useEffect(() => {
    if (open) {
      loadPresets();
      initializeColumns();
    }
  }, [open, loadPresets, initializeColumns]);

  const applyPreset = (preset: ExportPreset) => {
    // preset.columnsが配列であることを確認
    setSelectedColumns(Array.isArray(preset.columns) ? preset.columns : []);
    
    // export_settingsの存在チェック
    if (preset.export_settings) {
      setDelimiter(preset.export_settings.delimiter || ',');
      setEncoding(preset.export_settings.encoding || 'UTF-8 BOM');
      setDateFormat(preset.export_settings.dateFormat || 'YYYY/MM/DD');
      
      // numberFormatの存在チェック
      if (preset.export_settings.numberFormat) {
        setThousandSeparator(preset.export_settings.numberFormat.thousandSeparator || false);
        setDecimalPlaces(preset.export_settings.numberFormat.decimalPlaces || 0);
      } else {
        // デフォルト値を設定
        setThousandSeparator(false);
        setDecimalPlaces(0);
      }
    } else {
      // デフォルト値を設定
      setDelimiter(',');
      setEncoding('UTF-8 BOM');
      setDateFormat('YYYY/MM/DD');
      setThousandSeparator(false);
      setDecimalPlaces(0);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      applyPreset(preset);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedColumns || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedColumns(items);
  };

  const toggleColumn = (columnName: string) => {
    const cols = selectedColumns || [];
    if (cols.includes(columnName)) {
      setSelectedColumns(cols.filter(c => c !== columnName));
    } else {
      setSelectedColumns([...cols, columnName]);
    }
  };

  const removeColumn = (columnName: string) => {
    setSelectedColumns((selectedColumns || []).filter(c => c !== columnName));
  };

  const handleSavePreset = async () => {
    if (!presetName) {
      alert('プリセット名を入力してください');
      return;
    }

    try {
      const newPreset: ExportPreset = {
        preset_name: presetName,
        description: presetDescription,
        columns: selectedColumns,
        export_settings: {
          delimiter,
          encoding,
          dateFormat,
          numberFormat: {
            thousandSeparator,
            decimalPlaces
          }
        }
      };

      const presetId = await saveExportPreset(newPreset);
      console.log('Preset saved:', presetId);
      
      // プリセットリストを再読み込み
      await loadPresets();
      setSaveAsPreset(false);
      setPresetName('');
      setPresetDescription('');
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('プリセットの保存に失敗しました');
    }
  };

  const handleExport = () => {
    const settings: ExportSettings = {
      columns: selectedColumns,
      delimiter,
      encoding,
      dateFormat,
      numberFormat: {
        thousandSeparator,
        decimalPlaces,
        negativeFormat
      },
      includeHeader,
      fileName: fileName || `export_${fileId}.csv`
    };

    onExport(settings);
    onClose();
  };

  const getColumnLabel = (field: string) => {
    const column = columns.find(col => col.field === field);
    return column?.headerName || field;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>CSVエクスポート設定</DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* プリセット選択 */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>プリセット</InputLabel>
              <Select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                label="プリセット"
              >
                <MenuItem value="">
                  <em>カスタム</em>
                </MenuItem>
                {presets.map(preset => (
                  <MenuItem key={preset.id} value={preset.id}>
                    {preset.preset_name}
                    {preset.is_default && (
                      <Chip label="デフォルト" size="small" sx={{ ml: 1 }} />
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 列の選択と並び替え */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              エクスポートする列（ドラッグで並び替え可能）
            </Typography>
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="columns">
                  {(provided: any) => (
                    <List 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      dense
                    >
                      {(selectedColumns || []).map((field, index) => (
                        <Draggable key={field} draggableId={field} index={index}>
                          {(provided: any, snapshot: any) => (
                            <ListItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                backgroundColor: snapshot.isDragging ? '#f5f5f5' : 'inherit'
                              }}
                            >
                              <ListItemIcon {...provided.dragHandleProps}>
                                <DragIcon />
                              </ListItemIcon>
                              <ListItemText primary={getColumnLabel(field)} />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() => removeColumn(field)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
            </Paper>
            
            {/* 利用可能な列 */}
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                利用可能な列：
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {columns
                  .filter(col => 
                    col.field !== 'id' && 
                    col.field !== 'actions' &&
                    !selectedColumns.includes(col.field)
                  )
                  .map(col => (
                    <Chip
                      key={col.field}
                      label={col.headerName}
                      onClick={() => toggleColumn(col.field)}
                      color="default"
                      variant="outlined"
                      size="small"
                    />
                  ))}
              </Box>
            </Box>
          </Grid>

          {/* フォーマット設定 */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>区切り文字</InputLabel>
              <Select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                label="区切り文字"
              >
                <MenuItem value=",">カンマ (,)</MenuItem>
                <MenuItem value=";">セミコロン (;)</MenuItem>
                <MenuItem value="\t">タブ</MenuItem>
                <MenuItem value="|">パイプ (|)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>文字エンコーディング</InputLabel>
              <Select
                value={encoding}
                onChange={(e) => setEncoding(e.target.value)}
                label="文字エンコーディング"
              >
                <MenuItem value="UTF-8 BOM">UTF-8 (BOM付き) - Excel推奨</MenuItem>
                <MenuItem value="UTF-8">UTF-8 (BOMなし)</MenuItem>
                <MenuItem value="Shift-JIS">Shift-JIS - 古いシステム用</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>日付フォーマット</InputLabel>
              <Select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                label="日付フォーマット"
              >
                <MenuItem value="YYYY/MM/DD">2024/06/01</MenuItem>
                <MenuItem value="YYYY-MM-DD">2024-06-01</MenuItem>
                <MenuItem value="MM/DD/YYYY">06/01/2024</MenuItem>
                <MenuItem value="DD.MM.YYYY">01.06.2024</MenuItem>
                <MenuItem value="YYYYMMDD">20240601</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="ファイル名（省略可）"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              fullWidth
              placeholder="export.csv"
            />
          </Grid>

          {/* 数値フォーマット */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              数値フォーマット
            </Typography>
            <Box sx={{ pl: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={thousandSeparator}
                    onChange={(e) => setThousandSeparator(e.target.checked)}
                  />
                }
                label="3桁区切りを使用"
              />
              <Box sx={{ mt: 1 }}>
                <TextField
                  label="小数点以下の桁数"
                  type="number"
                  value={decimalPlaces}
                  onChange={(e) => setDecimalPlaces(parseInt(e.target.value) || 0)}
                  InputProps={{ inputProps: { min: 0, max: 10 } }}
                  size="small"
                  sx={{ width: 150 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* その他の設定 */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                />
              }
              label="ヘッダー行を含める"
            />
          </Grid>

          {/* プリセット保存 */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveAsPreset}
                  onChange={(e) => setSaveAsPreset(e.target.checked)}
                />
              }
              label="この設定をプリセットとして保存"
            />
            {saveAsPreset && (
              <Box sx={{ mt: 2, pl: 3 }}>
                <TextField
                  label="プリセット名"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="説明（省略可）"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        {saveAsPreset && (
          <Button
            onClick={handleSavePreset}
            startIcon={<SaveIcon />}
          >
            プリセット保存
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>
          キャンセル
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={selectedColumns.length === 0}
        >
          エクスポート
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;