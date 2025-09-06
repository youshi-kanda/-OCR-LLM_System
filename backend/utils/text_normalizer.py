"""
テキスト正規化ユーティリティ
半角カタカナを全角カタカナに変換する処理を提供
"""
import unicodedata


class TextNormalizer:
    """テキスト正規化クラス"""
    
    @staticmethod
    def normalize_katakana(text: str) -> str:
        """半角カタカナを全角カタカナに変換"""
        if not text:
            return text
            
        # 半角カタカナを全角カタカナに変換
        normalized = unicodedata.normalize('NFKC', text)
        
        # 特定の文字の追加変換マップ（OCRで認識しにくい文字の対応）
        char_map = {
            'ｱｿｼｴｰｼｮﾝ': 'アソシエーション',
            'ﾓﾉﾀﾛｰ': 'モノタロー',
            'ﾗｲﾌ': 'ライフ',
            'ｸﾚｼﾞｯﾄ': 'クレジット',
            'ﾋﾞｻﾞ': 'ビザ',
            'ｾﾌﾞﾝ': 'セブン',
            'ﾀｲﾑｽﾞｶｰ': 'タイムズカー',
            'ﾁｸﾎｳ': 'チクホウ',
            'ﾕｱｰｽﾞ': 'ユアーズ',
            'ｽﾏｯｸ': 'スマック',
            'ﾃｸﾎﾟｳ': 'テクポウ',
            'ｱｹﾞ': 'アゲ'
        }
        
        # 特定のパターンを変換
        for half_kana, full_kana in char_map.items():
            normalized = normalized.replace(half_kana, full_kana)
        
        return normalized
    
    @staticmethod
    def normalize_bank_terms(text: str) -> str:
        """銀行用語の正規化"""
        if not text:
            return text
            
        # 一般的な銀行用語の統一
        term_map = {
            'ｸﾚｼﾞｯﾄｶｰﾄﾞ': 'クレジットカード',
            'ﾃﾞﾋﾞｯﾄ': 'デビット',
            'ﾌﾘｺﾐ': '振込',
            'ﾌﾘｺﾐﾃｽｳﾘｮｳ': '振込手数料',
            'ｿｳｺﾞｳﾌﾘｺﾐ': '総合振込',
            'ｹﾝｺｳﾎｹﾝ': '健康保険',
            'ｲﾘｮｳﾎｹﾝ': '医療保険',
            'ｼｬｶｲﾎｹﾝ': '社会保険',
            'ｱｲﾃｨｰｴﾑ': 'ATM',
            'ﾘﾖｳﾃｽｳﾘｮｳ': '利用手数料'
        }
        
        normalized = text
        for half_term, full_term in term_map.items():
            normalized = normalized.replace(half_term, full_term)
        
        return normalized
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """包括的なテキスト正規化"""
        if not text:
            return text
            
        # ステップ1: 半角カタカナを全角カタカナに変換
        normalized = TextNormalizer.normalize_katakana(text)
        
        # ステップ2: 銀行用語の正規化
        normalized = TextNormalizer.normalize_bank_terms(normalized)
        
        # ステップ3: 余分な空白を除去
        normalized = ' '.join(normalized.split())
        
        return normalized