from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TransactionData(BaseModel):
    model_config = ConfigDict(extra='allow')
    
    date: str
    description: str
    withdrawal: Optional[int] = None
    deposit: Optional[int] = None
    balance: int
    confidence_score: float = 0.0

class ProcessingResult(BaseModel):
    transactions: List[TransactionData]
    confidence_score: float
    processing_method: str
    claude_confidence: Optional[float] = None
    gpt4v_confidence: Optional[float] = None
    agreement_score: Optional[float] = None