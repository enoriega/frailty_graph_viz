import os
import re
import json
import argparse
from tqdm import tqdm
from models import *
from pathlib import Path
from sqlmodel import create_engine, Session, select
from sqlalchemy_utils import database_exists, create_database




class create_db:
    def __init__(self, url_db, data_path, metadata_path):
        self.url_db = url_db
        self.data_path = data_path
        self.metadata_path = metadata_path
        self.engine = create_engine(self.url_db, echo=False)
        self.pmcid_pattern = re.compile(r"\.*(?P<PMCID>PMC\d+).*\.json")
        
        if not database_exists(self.engine.url):
            create_database(self.engine.url)

    
    def create_schema(self):
        SQLModel.metadata.create_all(self.engine)
            
    
    def import_data(self):
        with open(self.metadata_path, 'r') as f:
            metadata = json.load(f)
            
        
        files = list(Path(self.data_path).glob("*.json"))
        for file_path in tqdm(files):
            # file_path = os.path.join(self.data_path, file_name)
            
            
            with file_path.open('r') as f:

                match = self.pmcid_pattern.match(file_path.name)

                if match:

                    try:
                        data = json.load(f)
                    except Exception as e:
                        print(f'Error reading {file_path}: {e}')
                        continue
                    
                    if not data['mentions']:
                        continue

                    pmc_id = match.group("PMCID")
                    journal_name = metadata[pmc_id]['journal']['journal_id']
                    journal_impact_factor = metadata[pmc_id]['journal']['impact_factor']
                    journal_issn = metadata[pmc_id]['journal']['issn']
                    
                    article_doi = metadata[pmc_id]['article']['doi']
                    article_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmc_id}/"
                    article_name = pmc_id
                    article_publish_date = "None"
                    article_text = data['text']
                    
                    with Session(self.engine) as session:
                        for item in data['mentions']:
                            controller_participant = session.exec(select(Participant).where(Participant.kb_name==item['controller_id'][0], Participant.kb_id==item['controller_id'][1])).first()
                            if controller_participant is None:
                                controller_participant = Participant(kb_name=item['controller_id'][0], kb_id=item['controller_id'][1])
                                session.add(controller_participant)
                                session.commit()
                                session.refresh(controller_participant)
                                
                            controlled_participant = session.exec(select(Participant).where(Participant.kb_name==item['controlled_id'][0], Participant.kb_id==item['controlled_id'][1])).first()
                            if controlled_participant is None:
                                controlled_participant = Participant(kb_name=item['controlled_id'][0], kb_id=item['controlled_id'][1])
                                session.add(controlled_participant)
                                session.commit()
                                session.refresh(controlled_participant)
                                
                            controller_participant_description = session.exec(select(ParticipantDescription).where(ParticipantDescription.description==item['controller'], ParticipantDescription.participant_id==controller_participant.id)).first()
                            if controller_participant_description is None:
                                controller_participant_description = ParticipantDescription(description=item['controller'], participant_id=controller_participant.id)
                                session.add(controller_participant_description)
                                session.commit()
                                session.refresh(controller_participant_description)
                                
                            controlled_participant_description = session.exec(select(ParticipantDescription).where(ParticipantDescription.description==item['controlled'], ParticipantDescription.participant_id==controlled_participant.id)).first()
                            if controlled_participant_description is None:
                                controlled_participant_description = ParticipantDescription(description=item['controlled'], participant_id=controlled_participant.id)
                                session.add(controlled_participant_description)
                                session.commit()
                                session.refresh(controlled_participant_description)
                            
                            directed = True if item['label'].split('_')[-1]=='regulation' else False
                            interaction = session.exec(select(Interaction).where(Interaction.controller==controller_participant.id, Interaction.controlled==controlled_participant.id, Interaction.polarity==item['polarity'], Interaction.directed==directed)).first()
                            if interaction is None:
                                interaction = Interaction(controller= controller_participant.id, controlled= controlled_participant.id, polarity=item['polarity'], directed=directed)
                                session.add(interaction)
                                session.commit()
                                session.refresh(interaction)

                            journal = session.exec(select(Journal).where(Journal.name==journal_name, Journal.impact_factor==journal_impact_factor, Journal.issn==journal_issn)).first()
                            if journal is None:
                                journal = Journal(name=journal_name, impact_factor=journal_impact_factor, issn=journal_issn)
                                session.add(journal)
                                session.commit()
                                session.refresh(journal)
                            
                            article = session.exec(select(Article).where(Article.doi==article_doi, Article.url==article_url, Article.name==article_name, Article.publish_date==article_publish_date, Article.text==article_text, Article.journal_id==journal.id)).first()
                            if article is None:
                                article = Article(doi=article_doi, url=article_url, name=article_name, publish_date=article_publish_date, text=article_text, journal_id=journal.id)
                                session.add(article)
                                session.commit()
                                session.refresh(article)
                            
                            significance = session.exec(select(Significance).where(Significance.type=='None', Significance.value==0.0, Significance.secondary_value==0.0, Significance.article_id==article.id)).first()
                            if significance is None:
                                significance = Significance(type='None', value=0.0, secondary_value=0.0, article_id=article.id)
                                session.add(significance)
                                session.commit()
                                session.refresh(significance)
                                
                            text = self.prepare_text(item['sentence_tokens'])
                            sentence_start, sentence_end = item.get("sentence_char_span", (None, None))
                            event_start, event_end = item.get("event_char_span", (None, None))
                            trigger_start, trigger_end = item.get("trigger_char_span", (None, None))
                            controller_start, controller_end = item.get("controller_char_span", (None, None))
                            controlled_start, controlled_end = item.get("controlled_char_span", (None, None))
                            markup=self.prepare_text(self.prepare_markup(item['sentence_tokens'], item['event_indices'], item['controller_indices'], item['controlled_indices'], item['trigger_indices'], item['label']))
                            evidence = session.exec(select(Evidence).where(Evidence.text==text, Evidence.markup==markup, Evidence.article_id==article.id, Evidence.interaction_id==interaction.id)).first()
                            if evidence is None:
                                evidence = Evidence(text=text,
                                                     sentence_start= sentence_start, sentence_end = sentence_end,
                                                     event_start=event_start, event_end=event_end,
                                                     trigger_start=trigger_start, trigger_end=trigger_end,
                                                     controller_start=controller_start, controller_end=controller_end,
                                                     controlled_start=controlled_start, controlled_end=controlled_end,
                                                     markup=markup, article_id=article.id, interaction_id=interaction.id)
                                session.add(evidence)
                                session.commit()
                                session.refresh(evidence)

        

    def prepare_text(self, sentence_tokens):
        return ' '.join(sentence_tokens).replace(' .', '.').replace(' ,', ',').replace(' !', '!').replace(' ?', '?').replace(' :', ':').replace(' ;', ';').replace(' )', ')').replace('( ', '(').replace(' /', '/').replace(' %', '%').replace(' - ', '-').replace(' = ', '=').replace(' + ', '+').replace(' * ', '*').replace(' & ', '&').replace(' | ', '|').replace(' ^ ', '^').replace(' > ', '>').replace(' < ', '<').replace(' @ ', '@').replace(' # ', '#').replace(' $ ', '$').replace(' ~ ', '~').replace(' ` ', '`').replace('{ ', '{').replace(' }', '}').replace(' ]', ']').replace('[ ', '[').replace(' " ', '"').replace(' \' ', '\'').replace(' \\ ', '\\').replace(' \n', ' ')



    def prepare_markup(self, sentence_tokens, event_indices, controller_indices, controlled_indices, trigger_indices, label):
        markup = sentence_tokens.copy()
        
        arr = [(controller_indices[0], f'<span class="controller">'), (controller_indices[1], f'</span>')] + \
            [(controlled_indices[0], f'<span class="controlled">'), (controlled_indices[1], f'</span>')] + \
            [(trigger_indices[0], f'<span class="trigger">'), (trigger_indices[1], f'</span>')]

        arr.sort(key=lambda x: x[0])
        arr = [(event_indices[0], f'<span class="event {label}">')] + arr + [(event_indices[1], f'</span>')]
        
        for i in range(len(arr)-1, -1, -1):
            markup.insert(arr[i][0], arr[i][1])
        
        return markup
    
    

    def create(self):
        print(f"Creating database at {self.url_db}")
        self.create_schema()
        
        print(f"Inserting data from {self.data_path} and {self.metadata_path}")
        self.import_data()




def main():
    default_url = 'postgresql://postgres:mysecretpassword@localhost/postgres'
    
    parser = argparse.ArgumentParser(description='Import data into a PostgreSQL database')
    parser.add_argument('--url-db', '-u', default=default_url, type=str, help='Database URL')
    parser.add_argument('--data', '-d', default='data/', type=Path, help='Path to the data file')
    parser.add_argument('--metadata', '-m', default='articles_metadata.json', type=Path, help='Path to the metadata file')
    
    args = parser.parse_args()
    
    create_db(args.url_db, args.data, args.metadata).create()
        


if __name__ == "__main__":
    main()