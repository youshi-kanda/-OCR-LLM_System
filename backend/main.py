from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import aiofiles
import os
from pathlib import Path
import uuid
from datetime import datetime
import io
import csv
import json
from typing import List, Optional
from pydantic import BaseModel

from services.llm_processor import DualLLMProcessor
from services.database import DatabaseService
from services.learning_service import LearningService
from models.transaction import TransactionData
from routers import learning

app = FastAPI(title="Siwake Bank Data Reader", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# サービス初期化
llm_processor = DualLLMProcessor()
db_service = DatabaseService()
learning_service = None  # startup時に初期化

class ProcessingResult(BaseModel):
    id: str
    filename: str
    status: str
    transactions: List[TransactionData]
    confidence_score: float
    processing_time: float

@app.on_event("startup")
async def startup_event():
    global learning_service
    try:
        print("Initializing database service...")
        await db_service.initialize()
        print("Database service initialized successfully")
        
        print("Initializing learning service...")
        learning_service = LearningService(db_service.pool)
        print("Learning service initialized successfully")
        
        os.makedirs("uploads", exist_ok=True)
        print("Uploads directory created/verified")
        print("Application startup completed successfully")
        
    except Exception as e:
        print(f"Startup error: {e}")
        import traceback
        traceback.print_exc()
        raise e
    
# 学習ルーターを追加
app.include_router(learning.router)

# WebSocket接続を管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Siwake Bank Data Reader API"}

@app.get("/health")
async def health_check():
    """Health check endpoint to verify database connectivity"""
    try:
        # Test database connection
        if db_service.pool:
            async with db_service.pool.acquire() as conn:
                await conn.execute("SELECT 1")
            db_status = "connected"
        else:
            db_status = "not_initialized"
        
        return {
            "status": "healthy",
            "database": db_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "database": "connection_failed",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            await manager.send_message(f"Echo: {data}", client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id)

@app.post("/upload", response_model=ProcessingResult)
async def upload_file(file: UploadFile = File(...), client_id: str = None):
    print(f"Upload request received: {file.filename}, content_type: {file.content_type}, client_id: {client_id}")
    
    if not file.content_type.startswith(('image/', 'application/pdf')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # ファイル保存
    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}_{file.filename}"
    print(f"Saving file to: {file_path}")
    
    # 進捗通知
    async def send_progress(message: str, progress: int = None):
        if client_id:
            progress_data = {
                "type": "progress",
                "message": message,
                "file_id": file_id
            }
            if progress is not None:
                progress_data["progress"] = progress
            await manager.send_message(json.dumps(progress_data), client_id)
    
    await send_progress("Uploading file...")
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
        print(f"File saved. Size: {len(content)} bytes")
    
    await send_progress("File uploaded successfully. Starting processing...")
    
    try:
        # LLM処理
        print("Starting LLM processing...")
        start_time = datetime.now()
        result = await llm_processor.process_document(content, send_progress)
        
        # 学習済みパターンを適用して自動修正
        if learning_service and result.transactions:
            await send_progress("Applying learned patterns for auto-correction...")
            # 銀行名を検出（ファイル名から推定）
            bank_name = None
            for bank in ['GMOあおぞら', '三菱UFJ', 'みずほ', '楽天', 'ゆうちょ']:
                if bank in file.filename:
                    bank_name = bank
                    break
            
            # トランザクションをDict形式に変換
            transactions_dict = [
                {
                    'date': t.date,
                    'description': t.description,
                    'withdrawal': t.withdrawal,
                    'deposit': t.deposit,
                    'balance': t.balance,
                    'confidence_score': t.confidence_score
                }
                for t in result.transactions
            ]
            
            # 学習パターンを適用
            corrected_transactions = await learning_service.apply_learned_corrections(
                transactions_dict, bank_name
            )
            
            # TransactionDataに戻す
            result.transactions = [
                TransactionData(**t) for t in corrected_transactions
            ]
            print(f"Applied learning corrections for bank: {bank_name}")
        
        processing_time = (datetime.now() - start_time).total_seconds()
        print(f"LLM processing completed in {processing_time:.2f}s")
        print(f"Result: {len(result.transactions)} transactions, confidence: {result.confidence_score}")
        
        await send_progress(f"Processing completed! Found {len(result.transactions)} transactions.")
        
        # DB保存
        await db_service.save_processing_result(
            file_id, file.filename, result, processing_time
        )
        print("Result saved to database")
        
        response_data = ProcessingResult(
            id=file_id,
            filename=file.filename,
            status="completed",
            transactions=result.transactions,
            confidence_score=result.confidence_score,
            processing_time=processing_time
        )
        print(f"Returning response with {len(response_data.transactions)} transactions")
        return response_data
    
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/{file_id}")
async def get_result(file_id: str):
    result = await db_service.get_processing_result(file_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result

@app.get("/history")
async def get_all_history():
    """全ての処理済みファイルの履歴を取得"""
    try:
        history = await db_service.get_all_processing_history()
        return {"history": history}
    except Exception as e:
        print(f"History fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/results/{file_id}/transactions")
async def update_transactions(file_id: str, transactions: List[TransactionData]):
    await db_service.update_transactions(file_id, transactions)
    return {"status": "updated"}

@app.get("/results/{file_id}/csv")
async def download_csv(file_id: str):
    result = await db_service.get_processing_result(file_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # 日本語ファイル名対応
    original_filename = result.get("filename", f"{file_id}.csv")
    if not original_filename.endswith('.csv'):
        csv_filename = f"{original_filename.rsplit('.', 1)[0]}.csv"
    else:
        csv_filename = original_filename
    
    # CSV生成
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)  # Excel互換性向上のため全フィールドをクォート
    
    transactions = result.get("transactions", [])
    if not transactions:
        # 空の場合のデフォルトヘッダー
        writer.writerow(["日付", "摘要", "出金", "入金", "残高"])
        writer.writerow(["", "", "", "", ""])  # 空行を追加してExcel表示を改善
    else:
        # 全取引データから動的に列を検出（より堅牢な実装）
        all_unique_columns = set()
        for transaction in transactions:
            if isinstance(transaction, dict):
                all_unique_columns.update(transaction.keys())
        
        # 基本列を最初に配置し、confidence_scoreを除外、その他の列を追加
        basic_columns = ["date", "description", "withdrawal", "deposit", "balance"]
        excluded_columns = {"confidence_score"}
        
        # 存在する基本列のみを含める
        ordered_columns = [col for col in basic_columns if col in all_unique_columns]
        
        # 基本列以外の動的追加列をアルファベット順でソート
        additional_columns = sorted([col for col in all_unique_columns 
                                   if col not in basic_columns and col not in excluded_columns])
        
        all_columns = ordered_columns + additional_columns
        
        # ヘッダー行を日本語に変換
        header_map = {
            "date": "日付",
            "description": "摘要", 
            "withdrawal": "出金",
            "deposit": "入金",
            "balance": "残高"
        }
        headers = [header_map.get(col, col) for col in all_columns]
        writer.writerow(headers)
        
        # データ行の処理
        for transaction in transactions:
            row = []
            for col in all_columns:
                value = transaction.get(col) if isinstance(transaction, dict) else getattr(transaction, col, None)
                
                # 数値フィールドの処理
                if col in ["withdrawal", "deposit", "balance"]:
                    if value is not None and value != "":
                        try:
                            # 数値の場合はそのまま出力（Excelで数値として認識される）
                            formatted_value = str(int(value)) if isinstance(value, (int, float)) and value == int(value) else str(value)
                            row.append(formatted_value)
                        except (ValueError, TypeError):
                            row.append(str(value) if value is not None else "")
                    else:
                        row.append("")
                else:
                    # テキストフィールドの処理
                    row.append(str(value) if value is not None else "")
            
            writer.writerow(row)
    
    output.seek(0)
    csv_content = output.getvalue()
    
    # URLエンコードされた日本語ファイル名でContent-Dispositionヘッダーを設定
    from urllib.parse import quote
    encoded_filename = quote(csv_filename.encode('utf-8'))
    
    return StreamingResponse(
        io.BytesIO(csv_content.encode('utf-8-sig')),  # BOM付きUTF-8でExcel対応
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)