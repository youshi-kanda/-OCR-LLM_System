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
        
        # Get migrations directory
        migrations_dir = Path(__file__).parent / 'db' / 'migrations'
        if not migrations_dir.exists():
            migrations_dir = Path(__file__).parent.parent / 'db' / 'migrations'
        
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