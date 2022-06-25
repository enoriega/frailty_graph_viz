from typing import List, Optional, Union, Sequence, Mapping

from sqlalchemy.orm import Session

from . import models, schemas

def get_record(db: Session, record_id: int):
    return db.query(models.Record).filter(models.Record == record_id).first()

def get_metadata(db: Session, medatadata_id: int):
    return db.query(models.RecordMetadata).filter(models.RecordMetadata == medatadata_id).first()

def get_variable(db: Session, var_id: int):
    return db.query(models.Variable).filter(models.Variable == var_id).first()

def create_variable(db: Session, var: schemas.VariableCreate):
    db_var = models.Variable(name = var.name)
    db.add(db_var)
    db.commit()
    return db_var

def create_metadata(db: Session, md: schemas.RecordMetadataCreate):
    db_md = models.RecordMetadata(**md.dict())
    db.add(db_md)
    db.commit()
    return  db_md

def create_records(db: Session, recs: List[schemas.RecordCreate], metadata: schemas.RecordMetadataCreate):
    db_md = models.RecordMetadata(**metadata.dict())
    created = list()
    for rec in recs:

        # Fetch or create the variable
        var = db.query(models.Variable).filter_by(name=rec.variable).first()

        # If there is no result, then create it
        if not var:
            var = models.Variable(name=rec.variable)

        db_rec = models.Record(value=rec.value)

        db_rec.variable = var
        db_rec.meta_data = db_md
        db.add(db_rec)
        created.append(db_rec)
    db.commit()

    return created

def get_evidence_labels(db: Session, sentence: Optional[str]) -> Mapping[str, bool]:
    """ Get a map with all the labels and flags """

    # Get the list of labels and build the ma
    db_labels = db.query(models.EvidenceLabel).all()

    labels = {l.label:False for l in db_labels}

    # If a sentence is specified, return the labels for it
    if sentence:
        # Fetch the record for the current sentence
        sent = db.query(models.AnnotatedEvidence).filter_by(sentence=sentence).first()

        # Mark the appropriate labels
        if sent:
            for l in sent.labels:
                labels[l.label] = True

        return labels

    # Otherwise, return all the labels unmarked
    return labels


def annotate_evidence_sentence(db: Session, evidence_item: schemas.AnnotatedEvidence):
    """ Annotate an evidence sentence """

    # First, fetch the evidence sentence record
    sent = db.query(models.AnnotatedEvidence).filter_by(sentence=evidence_item.sentence).first()

    # If there is no record yet, create it
    if not sent:
        sent = models.AnnotatedEvidence(sentence = evidence_item.sentence)

    # Now fetch the labels
    db_labels = set()
    for label in evidence_item.labels:
        label = label.label
        db_label = db.query(models.EvidenceLabel).filter_by(label = label).first()
        if not db_label:
            db_label = models.EvidenceLabel(label = label)
        db_labels.add(db_label)

        # Add it to the evidence sentence record if not yet there
        if db_label not in sent.labels:
            sent.labels.append(db_label)

    # Remove the labels that no longer apply
    for old_label in sent.labels:
        if old_label not in db_labels:
            sent.labels.remove(old_label)

    # Update and commit
    db.add(sent)
    db.commit()

    return sent

