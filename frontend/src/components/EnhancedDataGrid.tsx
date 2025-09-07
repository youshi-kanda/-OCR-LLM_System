/**
 * 拡張データグリッドコンポーネント
 * 行の追加・削除、セルの編集、修正履歴の記録機能を提供
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowParams,
  GridActionsCellItem,
  GridEventListener,
  GridRowEditStopReasons,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { recordCorrection, CorrectionData } from '../services/learningApi';

interface EnhancedDataGridProps {
  rows: any[];
  columns: GridColDef[];
  fileId: string;
  bankName?: string;
  onDataChange: (newRows: any[]) => void;
  onColumnSettingsClick?: () => void;
}

interface AddRowDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (row: any) => void;
  columns: GridColDef[];
  nextId: number;
}

const AddRowDialog: React.FC<AddRowDialogProps> = ({ 
  open, 
  onClose, 
  onAdd, 
  columns,
  nextId 
}) => {
  const [newRow, setNewRow] = useState<any>({});

  useEffect(() => {
    if (open) {
      // デフォルト値を設定
      const defaultRow: any = { id: nextId };
      columns.forEach(col => {
        if (col.field !== 'id' && col.field !== 'actions') {
          defaultRow[col.field] = col.type === 'number' ? 0 : '';
        }
      });
      setNewRow(defaultRow);
    }
  }, [open, columns, nextId]);

  const handleFieldChange = (field: string, value: any) => {
    setNewRow((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    onAdd(newRow);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>新しい行を追加</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {columns
            .filter(col => col.field !== 'id' && col.field !== 'actions' && col.editable !== false)
            .map(col => (
              <TextField
                key={col.field}
                label={col.headerName}
                value={newRow[col.field] || ''}
                onChange={(e) => handleFieldChange(col.field, e.target.value)}
                fullWidth
                type={col.type === 'number' ? 'number' : 'text'}
                variant="outlined"
              />
            ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleAdd} variant="contained">追加</Button>
      </DialogActions>
    </Dialog>
  );
};

function CustomToolbar({ onAddRow, onColumnSettings }: any) {
  return (
    <GridToolbarContainer>
      <Button
        startIcon={<AddIcon />}
        onClick={onAddRow}
        size="small"
      >
        行を追加
      </Button>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      {onColumnSettings && (
        <Button
          startIcon={<SettingsIcon />}
          onClick={onColumnSettings}
          size="small"
        >
          列の設定
        </Button>
      )}
    </GridToolbarContainer>
  );
}

const EnhancedDataGrid: React.FC<EnhancedDataGridProps> = ({
  rows: initialRows,
  columns: initialColumns,
  fileId,
  bankName,
  onDataChange,
  onColumnSettingsClick
}) => {
  const [rows, setRows] = useState(initialRows);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // 修正履歴を記録
  const recordChange = useCallback(async (
    originalData: any,
    correctedData: any,
    correctionType: CorrectionData['correction_type'],
    positionInfo?: any
  ) => {
    try {
      await recordCorrection({
        file_id: fileId,
        original_data: originalData,
        corrected_data: correctedData,
        correction_type: correctionType,
        position_info: positionInfo
      });
      
      // 修正済みセルをマーク
      if (correctionType === 'cell_edit' && correctedData.id && correctedData.field) {
        setModifiedCells(prev => new Set(prev).add(`${correctedData.id}-${correctedData.field}`));
      }
      
      console.log('Correction recorded:', correctionType);
    } catch (error) {
      console.error('Failed to record correction:', error);
    }
  }, [fileId]);

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id: GridRowId) => async () => {
    const rowToDelete = rows.find((row) => row.id === id);
    if (!rowToDelete) return;

    // 削除前に修正履歴を記録
    await recordChange(rowToDelete, {}, 'row_delete', { row_id: id });
    
    const newRows = rows.filter((row) => row.id !== id);
    setRows(newRows);
    onDataChange(newRows);
    
    setSnackbar({
      open: true,
      message: '行を削除しました',
      severity: 'success'
    });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find((row) => row.id === id);
    if (editedRow?.isNew) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    // 変更があった場合のみ記録
    const hasChanges = Object.keys(newRow).some(key => newRow[key] !== oldRow[key]);
    
    if (hasChanges) {
      // 変更されたフィールドを特定
      const changedFields = Object.keys(newRow).filter(key => newRow[key] !== oldRow[key]);
      
      for (const field of changedFields) {
        await recordChange(
          { [field]: oldRow[field] },
          { [field]: newRow[field], id: newRow.id, field },
          'cell_edit',
          { row_id: newRow.id, field }
        );
      }
      
      setSnackbar({
        open: true,
        message: 'データを更新しました',
        severity: 'success'
      });
    }
    
    const updatedRow = { ...newRow, isNew: false };
    const updatedRows = rows.map((row) => (row.id === newRow.id ? updatedRow : row));
    setRows(updatedRows);
    onDataChange(updatedRows);
    
    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const handleAddRow = () => {
    setAddDialogOpen(true);
  };

  const handleAddRowConfirm = async (newRow: any) => {
    // 新規行として追加
    const rowWithMeta = { ...newRow, isNew: true };
    const newRows = [...rows, rowWithMeta];
    setRows(newRows);
    onDataChange(newRows);
    
    // 修正履歴を記録
    await recordChange({}, newRow, 'row_add', { position: rows.length });
    
    setSnackbar({
      open: true,
      message: '行を追加しました',
      severity: 'success'
    });
    
    // 編集モードにする
    setRowModesModel({
      ...rowModesModel,
      [newRow.id]: { mode: GridRowModes.Edit }
    });
  };

  // 信頼度によるセルの色付け
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#4caf50';
    if (confidence >= 0.7) return '#ff9800';
    return '#f44336';
  };

  // カラム定義を拡張
  const enhancedColumns: GridColDef[] = [
    ...initialColumns.map(col => ({
      ...col,
      renderCell: (params: GridRenderCellParams) => {
        const cellKey = `${params.row.id}-${params.field}`;
        const isModified = modifiedCells.has(cellKey);
        const confidence = params.row.confidence_score;
        
        return (
          <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: col.type === 'number' ? 'flex-end' : 'flex-start'
          }}>
            {col.renderCell ? col.renderCell(params) : params.value}
            {isModified && (
              <Tooltip title="修正済み">
                <CheckIcon sx={{ ml: 1, fontSize: 16, color: 'success.main' }} />
              </Tooltip>
            )}
            {confidence && confidence < 0.7 && params.field === 'description' && (
              <Tooltip title={`信頼度: ${(confidence * 100).toFixed(0)}%`}>
                <WarningIcon sx={{ ml: 1, fontSize: 16, color: getConfidenceColor(confidence) }} />
              </Tooltip>
            )}
          </Box>
        );
      }
    })),
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteClick(id)}
            color="inherit"
          />,
        ];
      },
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={enhancedColumns}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={handleRowModesModelChange}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={(error) => {
          console.error('Row update error:', error);
          setSnackbar({
            open: true,
            message: 'データの更新に失敗しました',
            severity: 'error'
          });
        }}
        slots={{
          toolbar: CustomToolbar,
        }}
        slotProps={{
          toolbar: { 
            onAddRow: handleAddRow,
            onColumnSettings: onColumnSettingsClick
          },
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        checkboxSelection
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-cell--editing': {
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
          },
          '& .Mui-error': {
            bgcolor: 'error.light',
            color: 'error.contrastText',
          },
        }}
      />
      
      <AddRowDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddRowConfirm}
        columns={initialColumns}
        nextId={Math.max(...rows.map(r => r.id || 0), 0) + 1}
      />
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedDataGrid;