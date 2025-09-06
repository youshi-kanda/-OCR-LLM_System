#!/usr/bin/env python3

import csv
import io
from urllib.parse import quote

# Mock transaction data with dynamic columns (simulating our enhanced mock data)
mock_transactions = [
    {
        "date": "01/15",
        "description": "給与振込",
        "withdrawal": None,
        "deposit": 350000,
        "balance": 1250000,
        "confidence_score": 0.95,
        "bank_code": "0009",
        "branch": "本店",
        "category": "給与"
    },
    {
        "date": "01/16", 
        "description": "電気代",
        "withdrawal": 12500,
        "deposit": None,
        "balance": 1237500,
        "confidence_score": 0.92,
        "bank_code": "0009",
        "branch": "本店",
        "category": "公共料金",
        "vendor": "東京電力"
    },
    {
        "date": "01/17",
        "description": "ATM出金", 
        "withdrawal": 30000,
        "deposit": None,
        "balance": 1207500,
        "confidence_score": 0.88,
        "bank_code": "0009",
        "branch": "本店",
        "category": "現金引出",
        "atm_location": "渋谷駅前"
    },
    {
        "date": "01/18",
        "description": "スーパーマーケット",
        "withdrawal": 8200,
        "deposit": None, 
        "balance": 1199300,
        "confidence_score": 0.85,
        "bank_code": "0009",
        "branch": "本店",
        "category": "食料品",
        "vendor": "イオン",
        "payment_method": "デビットカード"
    }
]

def generate_dynamic_csv(transactions):
    """Generate CSV with dynamic columns similar to our backend implementation"""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    
    if not transactions:
        writer.writerow(["日付", "摘要", "出金", "入金", "残高"])
        writer.writerow(["", "", "", "", ""])
        return output.getvalue()
    
    # Detect all unique columns dynamically
    all_unique_columns = set()
    for transaction in transactions:
        if isinstance(transaction, dict):
            all_unique_columns.update(transaction.keys())
    
    # Basic columns in preferred order
    basic_columns = ["date", "description", "withdrawal", "deposit", "balance"]
    excluded_columns = {"confidence_score"}
    
    # Include existing basic columns only
    ordered_columns = [col for col in basic_columns if col in all_unique_columns]
    
    # Add additional dynamic columns in alphabetical order
    additional_columns = sorted([col for col in all_unique_columns 
                               if col not in basic_columns and col not in excluded_columns])
    
    all_columns = ordered_columns + additional_columns
    
    # Header mapping to Japanese
    header_map = {
        "date": "日付",
        "description": "摘要", 
        "withdrawal": "出金",
        "deposit": "入金",
        "balance": "残高"
    }
    headers = [header_map.get(col, col) for col in all_columns]
    writer.writerow(headers)
    
    # Data rows
    for transaction in transactions:
        row = []
        for col in all_columns:
            value = transaction.get(col) if isinstance(transaction, dict) else getattr(transaction, col, None)
            
            # Numeric field processing
            if col in ["withdrawal", "deposit", "balance"]:
                if value is not None and value != "":
                    try:
                        formatted_value = str(int(value)) if isinstance(value, (int, float)) and value == int(value) else str(value)
                        row.append(formatted_value)
                    except (ValueError, TypeError):
                        row.append(str(value) if value is not None else "")
                else:
                    row.append("")
            else:
                # Text field processing
                row.append(str(value) if value is not None else "")
        
        writer.writerow(row)
    
    output.seek(0)
    return output.getvalue()

if __name__ == "__main__":
    print("Testing dynamic CSV generation with enhanced mock data:")
    print("=" * 60)
    
    csv_content = generate_dynamic_csv(mock_transactions)
    print("Generated CSV content:")
    print(csv_content)
    
    print("\nAnalysis:")
    print(f"- Total rows (including header): {len(csv_content.split(chr(10)))}")
    
    # Count dynamic columns
    lines = csv_content.strip().split('\n')
    if lines:
        header_line = lines[0]
        # Parse CSV header to count columns
        reader = csv.reader([header_line])
        headers = next(reader)
        print(f"- Total columns: {len(headers)}")
        print(f"- Column headers: {', '.join(headers)}")
        
        # Show dynamic columns (non-basic ones)
        basic_headers_jp = ["日付", "摘要", "出金", "入金", "残高"]
        dynamic_headers = [h for h in headers if h not in basic_headers_jp]
        print(f"- Dynamic columns: {', '.join(dynamic_headers) if dynamic_headers else 'None'}")
    
    print("\n✓ Dynamic CSV generation test completed successfully!")