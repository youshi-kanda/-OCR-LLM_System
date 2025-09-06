import json
from typing import List, Optional, Dict, Any
import asyncio
from datetime import datetime
import os
import asyncpg
from models.transaction import TransactionData, ProcessingResult

class DatabaseService:
    def __init__(self):
        # PostgreSQL接続設定
        self.db_url = os.getenv("DATABASE_URL", "postgresql://siwake_user:siwake_password@localhost:5432/siwake_db")
        self.pool = None

    async def initialize(self):
        """PostgreSQL接続プールを初期化"""
        try:
            self.pool = await asyncpg.create_pool(
                self.db_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            print("PostgreSQL connection pool initialized successfully")
        except Exception as e:
            print(f"Failed to initialize PostgreSQL connection pool: {e}")
            raise e

    async def save_processing_result(
        self, 
        file_id: str, 
        filename: str, 
        result: ProcessingResult, 
        processing_time: float
    ):
        """処理結果をPostgreSQLに保存"""
        if not self.pool:
            raise Exception("Database pool not initialized")
            
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # processing_resultsテーブルに保存
                await conn.execute("""
                    INSERT INTO processing_results (
                        id, filename, status, confidence_score, processing_time,
                        processing_method, claude_confidence, gpt4v_confidence, agreement_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """, file_id, filename, "completed", result.confidence_score, processing_time,
                result.processing_method, result.claude_confidence, 
                result.gpt4v_confidence, result.agreement_score)
                
                # transactionsテーブルに各取引を保存
                for tx in result.transactions:
                    # 基本フィールドと動的フィールドを分離
                    basic_fields = {'date', 'description', 'withdrawal', 'deposit', 'balance', 'confidence_score'}
                    additional_data = {}
                    
                    if hasattr(tx, '__dict__'):
                        for key, value in tx.__dict__.items():
                            if key not in basic_fields:
                                additional_data[key] = value
                    
                    await conn.execute("""
                        INSERT INTO transactions (
                            processing_result_id, date, description, 
                            withdrawal, deposit, balance, confidence_score, additional_data
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, file_id, tx.date, tx.description,
                    tx.withdrawal, tx.deposit, tx.balance, 
                    tx.confidence_score, json.dumps(additional_data))
        
        print(f"Saved processing result {file_id} with {len(result.transactions)} transactions to PostgreSQL")

    async def get_processing_result(self, file_id: str) -> Optional[Dict[str, Any]]:
        """処理結果をPostgreSQLから取得"""
        if not self.pool:
            raise Exception("Database pool not initialized")
            
        async with self.pool.acquire() as conn:
            # processing_resultsから基本情報を取得
            result_row = await conn.fetchrow("""
                SELECT id, filename, status, confidence_score, processing_time,
                       processing_method, claude_confidence, gpt4v_confidence, 
                       agreement_score, created_at, updated_at
                FROM processing_results 
                WHERE id = $1
            """, file_id)
            
            if not result_row:
                return None
                
            # transactionsから取引データを取得
            transaction_rows = await conn.fetch("""
                SELECT date, description, withdrawal, deposit, balance, 
                       confidence_score, additional_data
                FROM transactions 
                WHERE processing_result_id = $1
                ORDER BY id
            """, file_id)
            
            # 取引データを再構築
            transactions = []
            for tx_row in transaction_rows:
                tx_data = {
                    "date": tx_row['date'],
                    "description": tx_row['description'],
                    "withdrawal": float(tx_row['withdrawal']) if tx_row['withdrawal'] else None,
                    "deposit": float(tx_row['deposit']) if tx_row['deposit'] else None,
                    "balance": float(tx_row['balance']),
                    "confidence_score": tx_row['confidence_score']
                }
                
                # additional_dataをマージ
                if tx_row['additional_data']:
                    additional_data = json.loads(tx_row['additional_data'])
                    tx_data.update(additional_data)
                
                transactions.append(tx_data)
            
            # 結果を構築
            result = {
                "id": result_row['id'],
                "filename": result_row['filename'],
                "status": result_row['status'],
                "transactions": transactions,
                "confidence_score": result_row['confidence_score'],
                "processing_time": result_row['processing_time'],
                "processing_method": result_row['processing_method'],
                "claude_confidence": result_row['claude_confidence'],
                "gpt4v_confidence": result_row['gpt4v_confidence'],
                "agreement_score": result_row['agreement_score'],
                "created_at": result_row['created_at'].isoformat(),
                "updated_at": result_row['updated_at'].isoformat() if result_row['updated_at'] else None
            }
            
            return result

    async def update_transactions(self, file_id: str, transactions: List[TransactionData]):
        """取引データをPostgreSQLで更新"""
        if not self.pool:
            raise Exception("Database pool not initialized")
            
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # 既存の取引データを削除
                await conn.execute("""
                    DELETE FROM transactions WHERE processing_result_id = $1
                """, file_id)
                
                # 新しい取引データを挿入
                for tx in transactions:
                    # 基本フィールドと動的フィールドを分離
                    basic_fields = {'date', 'description', 'withdrawal', 'deposit', 'balance', 'confidence_score'}
                    additional_data = {}
                    
                    if hasattr(tx, '__dict__'):
                        for key, value in tx.__dict__.items():
                            if key not in basic_fields:
                                additional_data[key] = value
                    
                    await conn.execute("""
                        INSERT INTO transactions (
                            processing_result_id, date, description, 
                            withdrawal, deposit, balance, confidence_score, additional_data
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, file_id, tx.date, tx.description,
                    tx.withdrawal, tx.deposit, tx.balance, 
                    tx.confidence_score, json.dumps(additional_data))
                
                # processing_resultsのupdated_atを更新
                await conn.execute("""
                    UPDATE processing_results SET updated_at = CURRENT_TIMESTAMP WHERE id = $1
                """, file_id)

    async def get_all_results(self) -> List[Dict[str, Any]]:
        """すべての処理結果を取得（主にテスト用）"""
        if not self.pool:
            raise Exception("Database pool not initialized")
            
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, filename, status, confidence_score, processing_time,
                       processing_method, claude_confidence, gpt4v_confidence, 
                       agreement_score, created_at, updated_at
                FROM processing_results 
                ORDER BY created_at DESC
            """)
            
            results = []
            for row in rows:
                result = dict(row)
                result['created_at'] = row['created_at'].isoformat()
                result['updated_at'] = row['updated_at'].isoformat() if row['updated_at'] else None
                results.append(result)
            
            return results
    
    async def get_all_processing_history(self) -> List[Dict[str, Any]]:
        """履歴一覧用の軽量データを取得（transactionsは除く）"""
        if not self.pool:
            raise Exception("Database pool not initialized")
            
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    pr.id, pr.filename, pr.status, pr.confidence_score, 
                    pr.processing_time, pr.processing_method, pr.created_at,
                    COALESCE(t.transaction_count, 0) as transaction_count
                FROM processing_results pr
                LEFT JOIN (
                    SELECT processing_result_id, COUNT(*) as transaction_count
                    FROM transactions
                    GROUP BY processing_result_id
                ) t ON pr.id = t.processing_result_id
                ORDER BY pr.created_at DESC
            """)
            
            history = []
            for row in rows:
                history_item = {
                    "id": row['id'],
                    "filename": row['filename'],
                    "status": row['status'],
                    "confidence_score": row['confidence_score'],
                    "processing_time": row['processing_time'],
                    "processing_method": row['processing_method'],
                    "created_at": row['created_at'].isoformat(),
                    "transaction_count": row['transaction_count']
                }
                history.append(history_item)
            
            return history