"""
学習システムのAPIエンドポイント
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from datetime import datetime
import json

from services.database import DatabaseService
from services.learning_service import LearningService

router = APIRouter(prefix="/api/learning", tags=["learning"])

# リクエスト/レスポンスモデル
class CorrectionRequest(BaseModel):
    file_id: str
    original_data: Dict[str, Any]
    corrected_data: Dict[str, Any]
    correction_type: str
    position_info: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None

class ColumnMappingRequest(BaseModel):
    bank_name: str
    mappings: List[Dict[str, Any]]

class CustomColumnRequest(BaseModel):
    file_id: str
    column_name: str
    data_type: str
    default_value: Optional[Any] = None
    formula: Optional[str] = None
    options: Optional[List[str]] = None

class ExportPresetRequest(BaseModel):
    preset_name: str
    description: Optional[str] = None
    columns: List[str]
    export_settings: Dict[str, Any]
    target_software: Optional[str] = None

# 依存性注入
async def get_learning_service() -> LearningService:
    db_service = DatabaseService()
    await db_service.initialize()
    return LearningService(db_service.pool)


# エンドポイント

@router.post("/corrections")
async def record_correction(
    request: CorrectionRequest,
    service: LearningService = Depends(get_learning_service)
) -> Dict[str, str]:
    """修正履歴を記録"""
    try:
        correction_id = await service.record_correction(
            file_id=request.file_id,
            original_data=request.original_data,
            corrected_data=request.corrected_data,
            correction_type=request.correction_type,
            position_info=request.position_info,
            user_id=request.user_id
        )
        
        return {
            "status": "success",
            "correction_id": correction_id,
            "message": "Correction recorded and pattern learned"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns/analysis")
async def analyze_patterns(
    limit: int = 100,
    service: LearningService = Depends(get_learning_service)
) -> Dict[str, Any]:
    """学習パターンの分析結果を取得"""
    try:
        analysis = await service.pattern_analyzer.analyze_corrections(limit)
        metrics = await service.pattern_analyzer.get_improvement_metrics()
        
        return {
            "analysis": analysis,
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/column-mappings/{bank_name}")
async def get_column_mappings(
    bank_name: str,
    service: LearningService = Depends(get_learning_service)
) -> List[Dict]:
    """銀行別のカラムマッピングを取得"""
    try:
        mappings = await service.column_mapper.get_bank_mapping(bank_name)
        return mappings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/column-mappings")
async def save_column_mappings(
    request: ColumnMappingRequest,
    service: LearningService = Depends(get_learning_service)
) -> Dict[str, str]:
    """カラムマッピングを保存"""
    try:
        await service.column_mapper.save_mapping(
            bank_name=request.bank_name,
            mappings=request.mappings
        )
        
        return {
            "status": "success",
            "message": f"Column mappings saved for {request.bank_name}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-columns")
async def add_custom_column(
    request: CustomColumnRequest,
    service: LearningService = Depends(get_learning_service)
) -> Dict[str, str]:
    """カスタム列を追加"""
    try:
        async with service.db_pool.acquire() as conn:
            column_id = await conn.fetchval(
                """
                INSERT INTO custom_columns 
                (file_id, column_name, data_type, default_value, formula, options, values)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
                """,
                request.file_id,
                request.column_name,
                request.data_type,
                request.default_value,
                request.formula,
                json.dumps(request.options) if request.options else None,
                json.dumps({})  # 初期は空の値
            )
        
        return {
            "status": "success",
            "column_id": str(column_id),
            "message": f"Custom column '{request.column_name}' added"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/custom-columns/{file_id}")
async def get_custom_columns(
    file_id: str,
    service: LearningService = Depends(get_learning_service)
) -> List[Dict]:
    """ファイルのカスタム列を取得"""
    try:
        async with service.db_pool.acquire() as conn:
            columns = await conn.fetch(
                """
                SELECT * FROM custom_columns
                WHERE file_id = $1
                ORDER BY position, created_at
                """,
                file_id
            )
        
        return [dict(col) for col in columns]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export-presets")
async def save_export_preset(
    request: ExportPresetRequest,
    user_id: Optional[str] = None,
    service: LearningService = Depends(get_learning_service)
) -> Dict[str, str]:
    """エクスポートプリセットを保存"""
    try:
        async with service.db_pool.acquire() as conn:
            preset_id = await conn.fetchval(
                """
                INSERT INTO export_presets 
                (user_id, preset_name, description, columns, export_settings, target_software)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                user_id,
                request.preset_name,
                request.description,
                json.dumps(request.columns),
                json.dumps(request.export_settings),
                request.target_software
            )
        
        return {
            "status": "success",
            "preset_id": str(preset_id),
            "message": f"Export preset '{request.preset_name}' saved"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export-presets")
async def get_export_presets(
    user_id: Optional[str] = None,
    service: LearningService = Depends(get_learning_service)
) -> List[Dict]:
    """エクスポートプリセットを取得"""
    try:
        async with service.db_pool.acquire() as conn:
            if user_id:
                presets = await conn.fetch(
                    """
                    SELECT * FROM export_presets
                    WHERE user_id = $1 OR is_default = TRUE
                    ORDER BY is_default DESC, preset_name
                    """,
                    user_id
                )
            else:
                presets = await conn.fetch(
                    """
                    SELECT * FROM export_presets
                    WHERE is_default = TRUE
                    ORDER BY preset_name
                    """
                )
        
        return [dict(preset) for preset in presets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-learning")
async def apply_learned_corrections(
    transactions: List[Dict],
    bank_name: Optional[str] = None,
    service: LearningService = Depends(get_learning_service)
) -> List[Dict]:
    """学習済みパターンを適用して自動修正"""
    try:
        corrected = await service.apply_learned_corrections(
            transactions=transactions,
            bank_name=bank_name
        )
        
        return corrected
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kana-dictionary")
async def get_kana_dictionary(
    limit: int = 100,
    service: LearningService = Depends(get_learning_service)
) -> List[Dict]:
    """半角カナ辞書を取得"""
    try:
        async with service.db_pool.acquire() as conn:
            entries = await conn.fetch(
                """
                SELECT kana_text, converted_text, confidence_score, 
                       usage_count, bank_specific
                FROM kana_dictionary
                ORDER BY usage_count DESC, confidence_score DESC
                LIMIT $1
                """,
                limit
            )
        
        return [dict(entry) for entry in entries]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kana-dictionary")
async def add_kana_entry(
    kana_text: str,
    converted_text: str,
    bank_specific: Optional[str] = None,
    service: LearningService = Depends(get_learning_service)
) -> Dict[str, str]:
    """半角カナ辞書にエントリを追加"""
    try:
        async with service.db_pool.acquire() as conn:
            await service.kana_converter.learn_pattern(
                conn=conn,
                kana_text=kana_text,
                converted_text=converted_text,
                bank_name=bank_specific
            )
        
        return {
            "status": "success",
            "message": f"Added '{kana_text}' -> '{converted_text}' to dictionary"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))