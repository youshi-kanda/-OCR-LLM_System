#!/usr/bin/env python3
"""
学習システムの統合テストスクリプト
Learning System Integration Test Script
"""

import asyncio
import json
import requests
import uuid
import re
from datetime import datetime
from typing import Dict, List, Any

BASE_URL = "http://localhost:8000"

class LearningSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """テスト結果をログに記録"""
        result = {
            "test_name": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "PASS" if success else "FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
    
    def test_kana_dictionary(self):
        """かな辞書のテスト"""
        try:
            # 辞書データ取得
            response = self.session.get(f"{BASE_URL}/api/learning/kana-dictionary")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Kana Dictionary", True, f"取得データ数: {len(data)}")
                
                # データの内容確認
                if data and len(data) > 0:
                    sample = data[0]
                    required_fields = ["kana_text", "converted_text", "confidence_score"]
                    has_all_fields = all(field in sample for field in required_fields)
                    self.log_test("Kana Dictionary Structure", has_all_fields, 
                                f"サンプルデータ: {sample.get('kana_text', '')} -> {sample.get('converted_text', '')}")
                else:
                    self.log_test("Kana Dictionary Structure", False, "データが空です")
            else:
                self.log_test("Get Kana Dictionary", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Get Kana Dictionary", False, str(e))
    
    def test_correction_recording(self):
        """修正記録のテスト"""
        try:
            # テスト用の修正データ
            correction_data = {
                "file_id": str(uuid.uuid4()),
                "original_data": {"description": "ｽｰﾊﾟｰ", "amount": 1000},
                "corrected_data": {"description": "スーパー", "amount": 1000},
                "correction_type": "kana_correction"
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/learning/corrections", 
                json=correction_data
            )
            
            if response.status_code == 200:
                self.log_test("Record Correction", True, "修正データを正常に記録")
            else:
                self.log_test("Record Correction", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Record Correction", False, str(e))
    
    def test_learning_patterns(self):
        """学習パターンのテスト"""
        try:
            response = self.session.get(f"{BASE_URL}/api/learning/patterns/analysis")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Learning Patterns", True, f"パターン分析結果を取得")
            else:
                self.log_test("Get Learning Patterns", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Get Learning Patterns", False, str(e))
    
    def test_column_mappings(self):
        """カラムマッピングのテスト"""
        try:
            # GMOあおぞら銀行のマッピング取得
            response = self.session.get(f"{BASE_URL}/api/learning/column-mappings/GMOあおぞら")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Column Mappings", True, f"GMOあおぞら銀行のマッピング数: {len(data)}")
                
                # マッピング保存のテスト
                test_mapping = {
                    "bank_name": "テスト銀行",
                    "mappings": [
                        {"source_column": "日付", "target_column": "date", "data_type": "date"},
                        {"source_column": "摘要", "target_column": "description", "data_type": "text"}
                    ]
                }
                
                save_response = self.session.post(
                    f"{BASE_URL}/api/learning/column-mappings",
                    json=test_mapping
                )
                
                if save_response.status_code == 200:
                    self.log_test("Save Column Mappings", True, "テストマッピングを保存")
                else:
                    self.log_test("Save Column Mappings", False, f"HTTP {save_response.status_code}")
                    
            else:
                self.log_test("Get Column Mappings", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Column Mappings Test", False, str(e))
    
    def test_export_presets(self):
        """エクスポートプリセットのテスト"""
        try:
            # プリセット取得
            response = self.session.get(f"{BASE_URL}/api/learning/export-presets")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Export Presets", True, f"プリセット数: {len(data)}")
                
                # プリセット保存のテスト
                test_preset = {
                    "preset_name": "テストプリセット",
                    "description": "テスト用のエクスポート設定",
                    "columns": ["date", "description", "withdrawal", "deposit"],
                    "export_settings": {
                        "delimiter": ",",
                        "encoding": "UTF-8",
                        "include_header": True
                    }
                }
                
                save_response = self.session.post(
                    f"{BASE_URL}/api/learning/export-presets",
                    json=test_preset
                )
                
                if save_response.status_code == 200:
                    self.log_test("Save Export Preset", True, "テストプリセットを保存")
                else:
                    self.log_test("Save Export Preset", False, f"HTTP {save_response.status_code}")
                    
            else:
                self.log_test("Get Export Presets", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Export Presets Test", False, str(e))
    
    def test_apply_learning(self):
        """学習適用のテスト"""
        try:
            # テスト用のトランザクションデータ（正しい半角カナを使用）
            test_transactions = [
                {
                    "date": "2024-01-01",
                    "description": "ｽｰﾊﾟｰ",
                    "withdrawal": 1500,
                    "deposit": None,
                    "balance": 48500
                },
                {
                    "date": "2024-01-02", 
                    "description": "ｺﾝﾋﾞﾆ",
                    "withdrawal": 800,
                    "deposit": None,
                    "balance": 47700
                }
            ]
            
            # 半角カナが正しく含まれているかデバッグ
            for t in test_transactions:
                desc = t["description"]
                print(f"DEBUG: '{desc}' contains kana: {bool(re.search(r'[ｦ-ﾟ]+', desc))}")
            
            response = self.session.post(
                f"{BASE_URL}/api/learning/apply-learning?bank_name=GMOあおぞら",
                json=test_transactions
            )
            
            if response.status_code == 200:
                corrected_data = response.json()
                self.log_test("Apply Learning", True, f"学習適用結果: {len(corrected_data)}件")
                
                # 半角カナが修正されているかチェック
                first_item = corrected_data[0] if corrected_data else None
                if first_item and "description" in first_item:
                    desc = first_item["description"]
                    if "スーパー" in desc or "コンビニ" in desc:
                        self.log_test("Kana Conversion", True, f"半角カナ変換: {desc}")
                    else:
                        self.log_test("Kana Conversion", False, f"変換されていない: {desc}")
                        
            else:
                self.log_test("Apply Learning", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Apply Learning", False, str(e))
    
    def run_all_tests(self):
        """全テストを実行"""
        print("学習システム統合テスト開始")
        print("=" * 50)
        
        self.test_kana_dictionary()
        self.test_correction_recording()
        self.test_learning_patterns()
        self.test_column_mappings()
        self.test_export_presets()
        self.test_apply_learning()
        
        print("\n" + "=" * 50)
        print("テスト結果サマリー")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"総テスト数: {total_tests}")
        print(f"成功: {passed_tests}")
        print(f"失敗: {failed_tests}")
        print(f"成功率: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n失敗したテスト:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test_name']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = LearningSystemTester()
    success = tester.run_all_tests()
    
    # 結果をJSONファイルに保存
    with open("test_results.json", "w", encoding="utf-8") as f:
        json.dump(tester.test_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n詳細な結果は test_results.json に保存されました")
    exit(0 if success else 1)