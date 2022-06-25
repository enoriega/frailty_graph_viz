from typing import Optional

from pydantic import BaseModel


class Evidence(BaseModel):
    source: str
    destination: Optional[str]
    event_type: str
    raw_sent: str
    markup: str
    directed: bool
    polarity: str
    impact: Optional[float]
    hyperlink: str
    frequency: int