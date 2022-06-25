from typing import List, Optional, Any

from pydantic import BaseModel

from . import models

# PyDantic models to mirror SqlAlchemy models

class RecordBase(BaseModel):

    variable: str
    value: float


class RecordCreate(RecordBase):
    pass

class Record(RecordBase):
    id: int
    metadata_id: int
    observation_id: str

    class Config:
        orm_mode = True


class VariableBase(BaseModel):
    name: str

class VariableCreate(VariableBase):
    pass

class Variable(VariableBase):
    id: int

    class Config:
        orm_mode = True

class RecordMetadataBase(BaseModel):
    commit: str
    query_str: str
    graph_name: str
    graph_hash: str
    rankings_name: str
    rankings_hash: str



class RecordMetadataCreate(RecordMetadataBase):
    pass

class RecordMetadata(RecordMetadataBase):
    id: int
    extra: Optional[str] = None

    class Config:
        orm_mode = True

class EvidenceLabel(BaseModel):
    label: str

    class Config:
        orm_mode = True


class AnnotatedEvidence(BaseModel):
    sentence: str
    labels: List[EvidenceLabel]

    class Config:
        orm_mode = True