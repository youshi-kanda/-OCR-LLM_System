#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""APIキーの有効性をテストするスクリプト"""

import os
import asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

# .envファイルから環境変数を読み込み
load_dotenv()

async def test_openai():
    """OpenAI APIのテスト"""
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key or api_key == "your_openai_api_key_here":
        print("[NG] OpenAI: APIキーが設定されていません")
        return False
    
    print(f"OpenAI APIキー: {api_key[:20]}...")
    
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        # 簡単なテストメッセージを送信
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello, this is a test. Reply with 'OK' only."}],
            max_tokens=10
        )
        
        print(f"[OK] OpenAI API: 正常動作")
        print(f"   Response: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"[NG] OpenAI API エラー: {str(e)}")
        return False

async def test_anthropic():
    """Anthropic APIのテスト"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key or api_key == "your_anthropic_api_key_here":
        print("[NG] Anthropic: APIキーが設定されていません")
        return False
    
    print(f"Anthropic APIキー: {api_key[:20]}...")
    
    try:
        client = AsyncAnthropic(api_key=api_key)
        
        # 簡単なテストメッセージを送信
        response = await client.messages.create(
            model="claude-3-haiku-20240307",  # 最も安価なモデルでテスト
            max_tokens=10,
            messages=[{"role": "user", "content": "Hello, this is a test. Reply with 'OK' only."}]
        )
        
        print(f"[OK] Anthropic API: 正常動作")
        print(f"   Response: {response.content[0].text}")
        return True
        
    except Exception as e:
        print(f"[NG] Anthropic API エラー: {str(e)}")
        if "credit balance" in str(e).lower():
            print("   [!]  クレジット残高不足です。Anthropic Consoleでクレジットを追加してください。")
            print("   URL: https://console.anthropic.com/settings/plans")
        return False

async def main():
    print("=" * 60)
    print("APIキー有効性チェック")
    print("=" * 60)
    print()
    
    # 両方のAPIをテスト
    openai_ok = await test_openai()
    print()
    anthropic_ok = await test_anthropic()
    
    print()
    print("=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    
    if openai_ok and anthropic_ok:
        print("[OK] 両方のAPIが利用可能です！")
    elif openai_ok:
        print("[!] OpenAI APIのみ利用可能です")
        print("   Anthropic APIのクレジットを追加してください")
    elif anthropic_ok:
        print("[!] Anthropic APIのみ利用可能です")
        print("   OpenAI APIキーを確認してください")
    else:
        print("[NG] 両方のAPIが利用できません")
        print("   APIキーとクレジット残高を確認してください")

if __name__ == "__main__":
    asyncio.run(main())