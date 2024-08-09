from sqlmodel import SQLModel, Field, Relationship
# from sqlalchemy.orm import relationship
from typing import Optional, List

# Define the Journal model
class Journal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str]
    impact_factor: Optional[float]
    issn: Optional[str]
    
    # Relationships
    articles: List["Article"] = Relationship(back_populates="journal")


# Define the Article model
class Article(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    doi: Optional[str]
    url: Optional[str]
    name: Optional[str]
    publish_date: Optional[str]     ## TODO: may need to change it to date type in future
    text: Optional[str]
    journal_id: Optional[int] = Field(default=None, foreign_key="journal.id")
    
    # Relationships
    journal: Optional[Journal] = Relationship(back_populates="articles")
    significances: List["Significance"] = Relationship(back_populates="article")
    evidences: List["Evidence"] = Relationship(back_populates="article")


# Define the Participant model
class Participant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    kb_name: Optional[str]
    kb_id: Optional[str]
    
    # Relationships
    participantdescriptions: Optional[List["ParticipantDescription"]] = Relationship(back_populates="participant")  ## TODO: may need to remove the optional if it's not needed
    interactions_controller: List["Interaction"] = Relationship(back_populates="controller_participant", sa_relationship_kwargs={"foreign_keys": "Interaction.controller"})
    interactions_controlled: List["Interaction"] = Relationship(back_populates="controlled_participant", sa_relationship_kwargs={"foreign_keys": "Interaction.controlled"})


# Define the Interaction model
class Interaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    controller: Optional[int] = Field(default=None, foreign_key="participant.id")
    controlled: Optional[int] = Field(default=None, foreign_key="participant.id")
    polarity: Optional[bool]
    directed: Optional[bool]
    
    # Relationships
    evidences: List["Evidence"] = Relationship(back_populates="interaction")
    controller_participant: Optional[Participant] = Relationship(back_populates="interactions_controller", sa_relationship_kwargs={"foreign_keys": "Interaction.controller"})
    controlled_participant: Optional[Participant] = Relationship(back_populates="interactions_controlled", sa_relationship_kwargs={"foreign_keys": "Interaction.controlled"})
    # Got the idea to handle multiple foreign key from a single entity from here: https://github.com/tiangolo/sqlmodel/issues/10




# Define the Evidence model
class Evidence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: Optional[str]
    markup: Optional[str]
    article_id: Optional[int] = Field(default=None, foreign_key="article.id")
    interaction_id: Optional[int] = Field(default=None, foreign_key="interaction.id")
    
    # Relationships
    article: Optional[Article] = Relationship(back_populates="evidences")
    interaction: Optional[Interaction] = Relationship(back_populates="evidences")


# Define the Participant Description model
class ParticipantDescription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: Optional[str]
    participant_id: Optional[int] = Field(default=None, foreign_key="participant.id")
    
    # Relationships
    participant: Optional[Participant] = Relationship(back_populates="participantdescriptions")


# Define the Significance model
class Significance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: Optional[str]
    value: Optional[float]
    secondary_value: Optional[float]
    article_id: Optional[int] = Field(default=None, foreign_key="article.id")
    
    # Relationships
    article: Optional[Article] = Relationship(back_populates="significances")