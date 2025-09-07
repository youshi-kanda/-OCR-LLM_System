"""
学習システムサービス
修正履歴の記録、パターン学習、自動修正機能を提供
"""

import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import asyncpg
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class LearningService:
    """学習システムのメインサービスクラス"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.kana_converter = KanaConverter(db_pool)
        self.pattern_analyzer = PatternAnalyzer(db_pool)
        self.column_mapper = ColumnMapper(db_pool)
        
    async def record_correction(
        self,
        file_id: str,
        original_data: Dict,
        corrected_data: Dict,
        correction_type: str,
        position_info: Optional[Dict] = None,
        user_id: Optional[str] = None
    ) -> str:
        """修正履歴を記録し、パターンを学習"""
        
        async with self.db_pool.acquire() as conn:
            # 修正履歴を保存
            correction_id = await conn.fetchval(
                """
                INSERT INTO correction_history 
                (file_id, original_data, corrected_data, correction_type, position_info, user_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                file_id,
                json.dumps(original_data),
                json.dumps(corrected_data),
                correction_type,
                json.dumps(position_info) if position_info else None,
                user_id
            )
            
            # パターン学習
            await self._learn_from_correction(
                conn, original_data, corrected_data, correction_type
            )
            
            logger.info(f"Recorded correction {correction_id} for file {file_id}")
            return str(correction_id)
    
    async def _learn_from_correction(
        self,
        conn: asyncpg.Connection,
        original: Dict,
        corrected: Dict,
        correction_type: str
    ):
        """修正からパターンを学習"""
        
        # 半角カナの学習
        if correction_type in ['cell_edit', 'row_add']:
            orig_desc = original.get('description', '')
            corr_desc = corrected.get('description', '')
            
            if orig_desc != corr_desc and self._is_kana(orig_desc):
                await self.kana_converter.learn_pattern(conn, orig_desc, corr_desc)
        
        # その他のパターン学習
        pattern_type = self._determine_pattern_type(original, corrected)
        if pattern_type:
            await self._update_learning_pattern(
                conn,
                pattern_type,
                str(original),
                str(corrected)
            )
    
    def _is_kana(self, text: str) -> bool:
        """半角カナを含むかチェック"""
        return bool(re.search(r'[ｦ-ﾟ]+', text))
    
    def _determine_pattern_type(self, original: Dict, corrected: Dict) -> Optional[str]:
        """修正パターンのタイプを判定"""
        if 'description' in original and 'description' in corrected:
            if original['description'] != corrected['description']:
                return 'description'
        if 'amount' in original or 'withdrawal' in original or 'deposit' in original:
            return 'amount'
        if 'date' in original:
            return 'date'
        return None
    
    async def _update_learning_pattern(
        self,
        conn: asyncpg.Connection,
        pattern_type: str,
        original: str,
        corrected: str
    ):
        """学習パターンを更新"""
        existing = await conn.fetchrow(
            """
            SELECT id, frequency FROM learning_patterns
            WHERE pattern_type = $1 AND original_pattern = $2 
            AND corrected_pattern = $3
            """,
            pattern_type, original, corrected
        )
        
        if existing:
            # 既存パターンの頻度を増加
            await conn.execute(
                """
                UPDATE learning_patterns 
                SET frequency = frequency + 1,
                    confidence_score = LEAST(1.0, confidence_score + 0.08),
                    last_used = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                """,
                existing['id']
            )
        else:
            # 新規パターンを追加
            await conn.execute(
                """
                INSERT INTO learning_patterns 
                (pattern_type, original_pattern, corrected_pattern)
                VALUES ($1, $2, $3)
                """,
                pattern_type, original, corrected
            )
    
    async def apply_learned_corrections(
        self,
        transactions: List[Dict],
        bank_name: Optional[str] = None
    ) -> List[Dict]:
        """学習済みパターンを適用して自動修正"""
        
        corrected_transactions = []
        
        async with self.db_pool.acquire() as conn:
            for transaction in transactions:
                # 半角カナ変換
                if 'description' in transaction:
                    transaction['description'] = await self.kana_converter.convert(
                        conn, transaction['description'], bank_name
                    )
                
                # その他の学習パターン適用
                transaction = await self._apply_patterns(conn, transaction, bank_name)
                
                corrected_transactions.append(transaction)
        
        return corrected_transactions
    
    async def _apply_patterns(
        self,
        conn: asyncpg.Connection,
        transaction: Dict,
        bank_name: Optional[str]
    ) -> Dict:
        """学習パターンを適用"""
        
        # 高頻度パターンを取得
        patterns = await conn.fetch(
            """
            SELECT original_pattern, corrected_pattern, pattern_type
            FROM learning_patterns
            WHERE confidence_score > 0.6
            ORDER BY frequency DESC
            LIMIT 100
            """
        )
        
        for pattern in patterns:
            transaction = self._try_apply_pattern(
                transaction,
                pattern['original_pattern'],
                pattern['corrected_pattern'],
                pattern['pattern_type']
            )
        
        return transaction
    
    def _try_apply_pattern(
        self,
        transaction: Dict,
        original: str,
        corrected: str,
        pattern_type: str
    ) -> Dict:
        """個別パターンの適用を試みる"""
        try:
            # パターンを辞書に変換
            import ast
            original_dict = ast.literal_eval(original)
            corrected_dict = ast.literal_eval(corrected)
            
            # descriptionフィールドのパターン適用
            if pattern_type == 'description' and 'description' in original_dict and 'description' in transaction:
                original_desc = original_dict['description']
                if transaction['description'] == original_desc:
                    # corrected_dictにfieldやidが含まれている場合は除去
                    if 'description' in corrected_dict:
                        transaction['description'] = corrected_dict['description']
                        print(f"Applied learning pattern: '{original_desc}' -> '{corrected_dict['description']}'")
                    
            # 部分一致による適用も試みる
            elif pattern_type == 'description' and 'description' in original_dict and 'description' in transaction:
                original_desc = original_dict['description']
                if original_desc in transaction['description']:
                    if 'description' in corrected_dict:
                        transaction['description'] = transaction['description'].replace(
                            original_desc, corrected_dict['description']
                        )
                        print(f"Applied partial learning pattern: '{original_desc}' -> '{corrected_dict['description']}'")
                    
            return transaction
            
        except (ValueError, SyntaxError) as e:
            # パターン解析エラーの場合はログ出力して元のtransactionを返す
            print(f"Pattern parsing error: {e}")
            return transaction


class KanaConverter:
    """半角カナ変換処理クラス"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self._cache = {}
        
    async def convert(
        self,
        conn: asyncpg.Connection,
        text: str,
        bank_name: Optional[str] = None
    ) -> str:
        """半角カナを変換"""
        
        if not self._contains_kana(text):
            return text
        
        # キャッシュチェック
        cache_key = f"{text}:{bank_name}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # データベースから変換パターンを取得
        result = await self._lookup_conversion(conn, text, bank_name)
        
        if result:
            self._cache[cache_key] = result
            # 使用回数を更新
            await self._update_usage_count(conn, text)
            return result
        
        # 部分一致で変換を試みる
        converted = await self._partial_conversion(conn, text, bank_name)
        self._cache[cache_key] = converted
        return converted
    
    def _contains_kana(self, text: str) -> bool:
        """半角カナを含むかチェック"""
        return bool(re.search(r'[ｦ-ﾟ]+', text))
    
    async def _lookup_conversion(
        self,
        conn: asyncpg.Connection,
        text: str,
        bank_name: Optional[str]
    ) -> Optional[str]:
        """完全一致での変換を検索"""
        
        # 銀行固有の変換を優先
        if bank_name:
            result = await conn.fetchval(
                """
                SELECT converted_text FROM kana_dictionary
                WHERE kana_text = $1 AND bank_specific = $2
                """,
                text, bank_name
            )
            if result:
                return result
        
        # 汎用変換を検索
        return await conn.fetchval(
            """
            SELECT converted_text FROM kana_dictionary
            WHERE kana_text = $1 AND bank_specific IS NULL
            ORDER BY confidence_score DESC, usage_count DESC
            LIMIT 1
            """,
            text
        )
    
    async def _partial_conversion(
        self,
        conn: asyncpg.Connection,
        text: str,
        bank_name: Optional[str]
    ) -> str:
        """部分的な変換を適用"""
        
        # すべての変換パターンを取得
        patterns = await conn.fetch(
            """
            SELECT kana_text, converted_text 
            FROM kana_dictionary
            WHERE confidence_score > 0.6
            ORDER BY LENGTH(kana_text) DESC, usage_count DESC
            """
        )
        
        result = text
        for pattern in patterns:
            if pattern['kana_text'] in result:
                result = result.replace(
                    pattern['kana_text'],
                    pattern['converted_text']
                )
        
        return result
    
    async def _update_usage_count(self, conn: asyncpg.Connection, kana_text: str):
        """使用回数を更新"""
        await conn.execute(
            """
            UPDATE kana_dictionary 
            SET usage_count = usage_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE kana_text = $1
            """,
            kana_text
        )
    
    async def learn_pattern(
        self,
        conn: asyncpg.Connection,
        kana_text: str,
        converted_text: str,
        bank_name: Optional[str] = None
    ):
        """新しい変換パターンを学習"""
        
        existing = await conn.fetchrow(
            """
            SELECT id, usage_count FROM kana_dictionary
            WHERE kana_text = $1 AND converted_text = $2
            AND (bank_specific = $3 OR (bank_specific IS NULL AND $3 IS NULL))
            """,
            kana_text, converted_text, bank_name
        )
        
        if existing:
            # 既存パターンの信頼度を上げる
            await conn.execute(
                """
                UPDATE kana_dictionary 
                SET usage_count = usage_count + 1,
                    confidence_score = LEAST(1.0, confidence_score + 0.05),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                """,
                existing['id']
            )
        else:
            # 新規パターンを追加
            await conn.execute(
                """
                INSERT INTO kana_dictionary 
                (kana_text, converted_text, bank_specific, confidence_score)
                VALUES ($1, $2, $3, 0.5)
                ON CONFLICT (kana_text) DO NOTHING
                """,
                kana_text, converted_text, bank_name
            )


class PatternAnalyzer:
    """パターン分析クラス"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def analyze_corrections(
        self,
        limit: int = 100
    ) -> Dict[str, Any]:
        """修正履歴を分析してパターンを抽出"""
        
        async with self.db_pool.acquire() as conn:
            # 頻繁な修正パターン
            frequent_corrections = await conn.fetch(
                """
                SELECT pattern_type, original_pattern, corrected_pattern, 
                       frequency, confidence_score
                FROM learning_patterns
                ORDER BY frequency DESC
                LIMIT $1
                """,
                limit
            )
            
            # 修正タイプ別の統計
            correction_stats = await conn.fetch(
                """
                SELECT correction_type, COUNT(*) as count
                FROM correction_history
                WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
                GROUP BY correction_type
                ORDER BY count DESC
                """
            )
            
            # 銀行別の修正傾向
            bank_patterns = await conn.fetch(
                """
                SELECT bank_name, pattern_type, COUNT(*) as count
                FROM learning_patterns
                WHERE bank_name IS NOT NULL
                GROUP BY bank_name, pattern_type
                ORDER BY bank_name, count DESC
                """
            )
            
            return {
                'frequent_corrections': [dict(r) for r in frequent_corrections],
                'correction_stats': [dict(r) for r in correction_stats],
                'bank_patterns': [dict(r) for r in bank_patterns]
            }
    
    async def get_improvement_metrics(self) -> Dict[str, Any]:
        """改善指標を取得"""
        
        async with self.db_pool.acquire() as conn:
            # 過去30日の修正率
            recent_corrections = await conn.fetchval(
                """
                SELECT COUNT(*) FROM correction_history
                WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
                """
            )
            
            # 学習パターン数
            pattern_count = await conn.fetchval(
                "SELECT COUNT(*) FROM learning_patterns"
            )
            
            # 平均信頼度
            avg_confidence = await conn.fetchval(
                "SELECT AVG(confidence_score) FROM learning_patterns"
            )
            
            return {
                'recent_corrections': recent_corrections or 0,
                'pattern_count': pattern_count or 0,
                'average_confidence': float(avg_confidence or 0)
            }


class ColumnMapper:
    """カラムマッピング処理クラス"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def get_bank_mapping(self, bank_name: str) -> List[Dict]:
        """銀行別のカラムマッピングを取得"""
        
        async with self.db_pool.acquire() as conn:
            mappings = await conn.fetch(
                """
                SELECT * FROM column_mappings
                WHERE bank_name = $1
                ORDER BY position
                """,
                bank_name
            )
            
            return [dict(m) for m in mappings]
    
    async def save_mapping(
        self,
        bank_name: str,
        mappings: List[Dict]
    ):
        """カラムマッピングを保存"""
        
        async with self.db_pool.acquire() as conn:
            # 既存のマッピングを削除
            await conn.execute(
                "DELETE FROM column_mappings WHERE bank_name = $1",
                bank_name
            )
            
            # 新しいマッピングを挿入
            for i, mapping in enumerate(mappings):
                # 必須フィールドの検証
                source_col = mapping.get('source_column', '')
                target_col = mapping.get('target_column', '')
                
                if not source_col or not target_col:
                    continue  # 不正なマッピングはスキップ
                
                await conn.execute(
                    """
                    INSERT INTO column_mappings
                    (bank_name, original_name, display_name, standard_name, 
                     data_type, position, validation_rules, is_visible, 
                     is_editable, is_required)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """,
                    bank_name,
                    source_col,
                    source_col,
                    target_col,
                    mapping.get('data_type', 'text'),
                    i + 1,
                    None,
                    True,
                    True,
                    False
                )

    async def save_custom_mapping(
        self,
        bank_name: str,
        mappings: List[Dict]
    ):
        """カスタムマッピングを保存"""
        
        async with self.db_pool.acquire() as conn:
            # 既存のマッピングを削除
            await conn.execute(
                "DELETE FROM column_mappings WHERE bank_name = $1",
                bank_name
            )
            
            # 新しいマッピングを挿入
            for mapping in mappings:
                await conn.execute(
                    """
                    INSERT INTO column_mappings
                    (bank_name, original_name, display_name, standard_name, 
                     data_type, position, validation_rules, is_visible, 
                     is_editable, is_required)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """,
                    bank_name,
                    mapping['original_name'],
                    mapping['display_name'],
                    mapping['standard_name'],
                    mapping['data_type'],
                    mapping['position'],
                    json.dumps(mapping.get('validation_rules')),
                    mapping.get('is_visible', True),
                    mapping.get('is_editable', True),
                    mapping.get('is_required', False)
                )
    
    async def detect_columns_from_text(
        self,
        text: str,
        bank_name: Optional[str] = None
    ) -> List[Dict]:
        """テキストからカラム構造を検出"""
        
        # ヘッダー行を検出するロジック
        # ここでは簡単な実装例
        common_headers = {
            '日付': 'date',
            '取引日': 'date',
            '摘要': 'description',
            'お取引内容': 'description',
            '出金': 'withdrawal',
            'お引出し': 'withdrawal',
            '支払金額': 'withdrawal',
            '入金': 'deposit',
            'お預入れ': 'deposit',
            '預り金額': 'deposit',
            '残高': 'balance',
            '差引残高': 'balance',
            'お取引後残高': 'balance'
        }
        
        detected_columns = []
        position = 1
        
        for header, standard_name in common_headers.items():
            if header in text:
                detected_columns.append({
                    'original_name': header,
                    'display_name': header,
                    'standard_name': standard_name,
                    'data_type': self._get_data_type(standard_name),
                    'position': position
                })
                position += 1
        
        return detected_columns
    
    def _get_data_type(self, standard_name: str) -> str:
        """標準名からデータ型を推定"""
        type_map = {
            'date': 'date',
            'description': 'text',
            'withdrawal': 'currency',
            'deposit': 'currency',
            'balance': 'currency'
        }
        return type_map.get(standard_name, 'text')


class MissingDataDetector:
    """欠損データ検出クラス"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def detect_missing_rows(
        self,
        transactions: List[Dict]
    ) -> List[Dict]:
        """欠損行を検出"""
        
        missing_rows = []
        
        # 日付の連続性チェック
        date_gaps = self._check_date_continuity(transactions)
        missing_rows.extend(date_gaps)
        
        # 残高の整合性チェック
        balance_issues = self._check_balance_consistency(transactions)
        missing_rows.extend(balance_issues)
        
        # 定期取引の欠損チェック
        async with self.db_pool.acquire() as conn:
            pattern_issues = await self._check_recurring_patterns(
                conn, transactions
            )
            missing_rows.extend(pattern_issues)
        
        return missing_rows
    
    def _check_date_continuity(self, transactions: List[Dict]) -> List[Dict]:
        """日付の連続性をチェック"""
        # 実装例（簡略版）
        gaps = []
        # 日付解析と欠損検出ロジック
        return gaps
    
    def _check_balance_consistency(self, transactions: List[Dict]) -> List[Dict]:
        """残高の整合性をチェック"""
        issues = []
        
        for i in range(1, len(transactions)):
            prev_balance = transactions[i-1].get('balance', 0)
            current_balance = transactions[i].get('balance', 0)
            withdrawal = transactions[i].get('withdrawal', 0)
            deposit = transactions[i].get('deposit', 0)
            
            expected_balance = prev_balance - withdrawal + deposit
            
            if abs(expected_balance - current_balance) > 1:  # 誤差許容
                issues.append({
                    'type': 'balance_inconsistency',
                    'position': i,
                    'expected': expected_balance,
                    'actual': current_balance,
                    'difference': expected_balance - current_balance
                })
        
        return issues
    
    async def _check_recurring_patterns(
        self,
        conn: asyncpg.Connection,
        transactions: List[Dict]
    ) -> List[Dict]:
        """定期的な取引パターンの欠損をチェック"""
        # 実装例（簡略版）
        return []