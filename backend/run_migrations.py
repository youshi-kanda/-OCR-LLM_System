#!/usr/bin/env python3
import asyncio
import asyncpg
import os
import sys
from pathlib import Path

async def run_migrations():
    """Run database migrations"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    try:
        # Connect to the database
        conn = await asyncpg.connect(database_url)
        print("Connected to database successfully")
        
        # First, create the base tables
        print("Creating base tables...")
        await conn.execute("""
            -- 処理結果テーブル
            CREATE TABLE IF NOT EXISTS processing_results (
                id VARCHAR(36) PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                confidence_score FLOAT DEFAULT 0.0,
                processing_time FLOAT DEFAULT 0.0,
                processing_method VARCHAR(20),
                claude_confidence FLOAT,
                gpt4v_confidence FLOAT,
                agreement_score FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            -- 取引データテーブル
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                processing_result_id VARCHAR(36) REFERENCES processing_results(id) ON DELETE CASCADE,
                date VARCHAR(10) NOT NULL,
                description TEXT NOT NULL,
                withdrawal DECIMAL(15,2),
                deposit DECIMAL(15,2),
                balance DECIMAL(15,2) NOT NULL,
                confidence_score FLOAT DEFAULT 0.0,
                additional_data JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_processing_results_created_at ON processing_results(created_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_processing_result_id ON transactions(processing_result_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)")
        
        # Create trigger function
        await conn.execute("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        """)
        
        # Create triggers
        await conn.execute("""
            DROP TRIGGER IF EXISTS update_processing_results_updated_at ON processing_results;
            CREATE TRIGGER update_processing_results_updated_at 
                BEFORE UPDATE ON processing_results 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        """)
        
        await conn.execute("""
            DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
            CREATE TRIGGER update_transactions_updated_at 
                BEFORE UPDATE ON transactions 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        """)
        
        print("Base tables created successfully")
        
        # Get migrations directory
        migrations_dir = Path(__file__).parent / 'db' / 'migrations'
        if not migrations_dir.exists():
            migrations_dir = Path(__file__).parent.parent / 'db' / 'migrations'
        if not migrations_dir.exists():
            # Try relative to working directory
            migrations_dir = Path('./db/migrations')
        if not migrations_dir.exists():
            migrations_dir = Path('./backend/db/migrations')
        
        if not migrations_dir.exists():
            print("Migrations directory not found")
            await conn.close()
            return
            
        # Get all migration files
        migration_files = sorted(migrations_dir.glob('*.sql'))
        print(f"Found {len(migration_files)} migration files")
        
        # Create migrations tracking table if it doesn't exist
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check which migrations have been applied
        applied_migrations = await conn.fetch("SELECT filename FROM migrations")
        applied_filenames = {row['filename'] for row in applied_migrations}
        
        # Run pending migrations
        for migration_file in migration_files:
            filename = migration_file.name
            
            if filename in applied_filenames:
                print(f"Migration {filename} already applied, skipping")
                continue
                
            print(f"Running migration {filename}")
            
            try:
                # Read and execute migration
                migration_sql = migration_file.read_text(encoding='utf-8')
                await conn.execute(migration_sql)
                
                # Mark migration as applied
                await conn.execute(
                    "INSERT INTO migrations (filename) VALUES ($1)",
                    filename
                )
                
                print(f"Migration {filename} completed successfully")
                
            except Exception as e:
                print(f"Error running migration {filename}: {e}")
                raise e
        
        await conn.close()
        print("All migrations completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_migrations())