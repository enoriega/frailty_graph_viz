import os
import json
import argparse
from tqdm import tqdm
from models import *
from pathlib import Path
from sqlalchemy import func
from multipledispatch import dispatch
from sqlmodel import create_engine, Session, select

import uvicorn
from fastapi import FastAPI




class create_database:
    def __init__(self, url_db, data_path, metadata_path):
        self.url_db = url_db
        self.engine = create_engine(self.url_db, echo=False)
        self.data_path = data_path
        self.metadata_path = metadata_path
        
    
    
    def create_schema(self):
        SQLModel.metadata.create_all(self.engine)
    
        
    
    def import_data(self):
        with open(self.metadata_path, 'r') as f:
            metadata = json.load(f)
        
        files = os.listdir(self.data_path)
        for file_name in tqdm(files):
            file_path = os.path.join(self.data_path, file_name)
            
            if os.path.isfile(file_path):
                with open(file_path, 'r') as f:
                    try:
                        data = json.load(f)
                    except json.JSONDecodeError as e:
                        print(f'Error reading {file_name}: {e}')
                        continue
                    
                    if not data:
                        continue

                    file_name = file_name[3:-8]
                    journal_name = metadata[file_name]['journal']['journal_id']
                    journal_impact_factor = metadata[file_name]['journal']['impact_factor']
                    journal_issn = metadata[file_name]['journal']['issn']
                    
                    article_doi = metadata[file_name]['article']['doi']
                    article_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{file_name}/"
                    article_name = f"PMC{file_name}"
                    article_publish_date = "None"
                    
                    with Session(self.engine) as session:
                        for item in data:
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
                            
                            article = session.exec(select(Article).where(Article.doi==article_doi, Article.url==article_url, Article.name==article_name, Article.publish_date==article_publish_date, Article.journal_id==journal.id)).first()
                            if article is None:
                                article = Article(doi=article_doi, url=article_url, name=article_name, publish_date=article_publish_date, journal_id=journal.id)
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
                            markup=self.prepare_text(self.prepare_markup(item['sentence_tokens'], item['event_indices'], item['controller_indices'], item['controlled_indices'], item['trigger_indices'], item['label']))
                            evidence = session.exec(select(Evidence).where(Evidence.text==text, Evidence.markup==markup, Evidence.article_id==article.id, Evidence.interaction_id==interaction.id)).first()
                            if evidence is None:
                                evidence = Evidence(text=text, markup=markup, article_id=article.id, interaction_id=interaction.id)
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
    
    

    def create_db(self):
        print(f"Creating database at {self.url_db}")
        self.create_schema()
        
        print(f"Inserting data from {self.data_path} and {self.metadata_path}")
        self.import_data()




class query:
    def __init__(self, url_db, host, port):
        self.url_db = url_db
        self.engine = create_engine(self.url_db, echo=False)
        self.app = FastAPI()
        self.host = host
        self.port = port
        self.setup_routes()


    def setup_routes(self):
        
        @self.app.get("/interactions/{kb_name}/{kb_id}")
        def get_interactions(kb_name:str, kb_id:str):
            with Session(self.engine) as session:
                res1 = session.exec(
                    select(Interaction, Participant, func.count(Interaction.id).label('evidence_count'))
                    .join(Participant, Interaction.controller == Participant.id)
                    .join(Evidence, Interaction.id == Evidence.interaction_id)
                    .where(Participant.kb_name == kb_name, Participant.kb_id == kb_id)
                    .group_by(Interaction, Participant)).all()
                res2 = session.exec(select(Interaction, Participant, func.count(Interaction.id).label('evidence_count'))
                        .join(Participant, Interaction.controlled == Participant.id)
                        .join(Evidence, Interaction.id == Evidence.interaction_id)
                        .where(Participant.kb_name == kb_name, Participant.kb_id == kb_id)
                        .group_by(Interaction, Participant)).all()
                res = res1 + res2
                
                interactions = []
                for r in res:
                    controller = session.exec(select(Participant).where(Participant.id == r.Interaction.controller)).first()
                    controlled = session.exec(select(Participant).where(Participant.id == r.Interaction.controlled)).first()
                    obj = {
                        'id': r.Interaction.id,
                        'controller': f"{controller.kb_name}:{controller.kb_id}",
                        'controlled': f"{controlled.kb_name}:{controlled.kb_id}",
                        'polarity': r.Interaction.polarity,
                        'directed': r.Interaction.directed,
                        'evidence_count': r.evidence_count
                    }
                    interactions.append(obj)
            return interactions



        @dispatch(int)
        @self.app.get("/evidences/{interaction_id}")
        def get_evidences(interaction_id:int):
            evidences = []
            with Session(self.engine) as session:
                res = session.exec(select(Evidence).where(Evidence.interaction_id == interaction_id)).all()
                for r in res:
                    obj = {
                        'id': r.id,
                        'text': r.text,
                        'markup': r.markup
                    }
                    evidences.append(obj)
            return evidences



        @dispatch(str, str, str, str)
        @self.app.get("/evidences/{controller_kb_name}/{controller_kb_id}/{controlled_kb_name}/{controlled_kb_id}")
        def get_evidences(controller_kb_name:str, controller_kb_id:str, controlled_kb_name:str, controlled_kb_id:str):
            evidences = []
            res = []
            with Session(self.engine) as session:
                controller_id = session.exec(select(Participant).where(Participant.kb_name == controller_kb_name, Participant.kb_id == controller_kb_id)).first().id
                controlled_id = session.exec(select(Participant).where(Participant.kb_name == controlled_kb_name, Participant.kb_id == controlled_kb_id)).first().id        
                
                interactions = session.exec(select(Interaction).where(Interaction.controller== controller_id, Interaction.controlled == controlled_id)).all()        
                for interaction in interactions:
                    res += session.exec(select(Evidence).where(Evidence.interaction_id == interaction.id)).all()
                        
                for r in res:
                    obj = {
                        'id': r.id,
                        'text': r.text,
                        'markup': r.markup
                    }
                    evidences.append(obj)
            return evidences



        @dispatch(str, str, str, str, bool, bool)
        @self.app.get("/evidences/{controller_kb_name}/{controller_kb_id}/{controlled_kb_name}/{controlled_kb_id}/{polarity}/{directed}")
        def get_evidences(controller_kb_name:str, controller_kb_id:str, controlled_kb_name:str, controlled_kb_id:str, polarity:bool, directed:bool):
            evidences = []
            res = []
            with Session(self.engine) as session:
                controller_id = session.exec(select(Participant).where(Participant.kb_name == controller_kb_name, Participant.kb_id == controller_kb_id)).first().id
                controlled_id = session.exec(select(Participant).where(Participant.kb_name == controlled_kb_name, Participant.kb_id == controlled_kb_id)).first().id
                
                interactions = session.exec(select(Interaction).where(Interaction.controller== controller_id, Interaction.controlled == controlled_id, Interaction.polarity == polarity, Interaction.directed == directed)).all()
                
                for interaction in interactions:
                    res += session.exec(select(Evidence).where(Evidence.interaction_id == interaction.id)).all()
                
                for r in res:
                    obj = {
                        'id': r.id,
                        'text': r.text,
                        'markup': r.markup
                    }
                    evidences.append(obj)
            return evidences



        @self.app.get("/neighbors/{kb_name}/{kb_id}")
        def get_neighbors(kb_name:str, kb_id:str):
            neighbors = []
            n_ids = []
            with Session(self.engine) as session:
                participant = session.exec(select(Participant).where(Participant.kb_name == kb_name, Participant.kb_id == kb_id)).first()
                if participant is None:
                    return neighbors
                
                interactions = session.exec(select(Interaction).where(Interaction.controller == participant.id)).all()
                for i in interactions:
                    n_ids.append(i.controlled)
                    
                interactions = session.exec(select(Interaction).where(Interaction.controlled == participant.id)).all()
                for i in interactions:
                    n_ids.append(i.controller)

                for n_id in set(n_ids):
                    n_participant = session.exec(select(Participant).where(Participant.id == n_id)).first()
                    obj = {
                        'kb_name': n_participant.kb_name,
                        'kb_id': n_participant.kb_id
                    }
                    neighbors.append(obj)
                return neighbors


        # get_interactions('uniprot', 'P54829')
        # get_evidences1(1)
        # get_evidences2('uniprot', 'P54829', 'pfam', 'PF02985')
        # get_evidences3('uniprot', 'P54829', 'pfam', 'PF02985', True, False)
        # get_neighbors('uniprot', 'P54829')



    def start_server(self):
        print(f"Starting FastAPI server with database URL: {self.url_db} and host: http://{self.host}:{self.port}")
        uvicorn.run(self.app, host=self.host, port=self.port)




def main():
    default_url = 'postgresql://postgres:mysecretpassword@localhost/db2'
    
    
    parser = argparse.ArgumentParser(description='Import data into a PostgreSQL database and access it via a RESTAPI')
    subparsers = parser.add_subparsers(dest='command', help='Sub-command help')
    
    # Sub-parser for creating the database and inserting data
    parser_create_db = subparsers.add_parser('create-db', help='Create the database and insert data')
    parser_create_db.add_argument('--url-db', '-u', default=default_url, type=str, help='Database URL')
    parser_create_db.add_argument('--data', '-d', default='data/', type=Path, help='Path to the data file')
    parser_create_db.add_argument('--metadata', '-m', default='articles_metadata.json', type=Path, help='Path to the metadata file')
    
    # Sub-parser for initiating FastAPI
    parser_query_fastapi = subparsers.add_parser('query-fastapi', help='Initiate FastAPI')
    parser_query_fastapi.add_argument('--url-db', '-u', default=default_url, type=str, help='Database URL')
    parser_query_fastapi.add_argument('--host-fastapi', '-hf', default='127.0.0.1', type=str, help='FastAPI host')
    parser_query_fastapi.add_argument('--port', '-p', default=8000, type=int, help='FastAPI port')
    
    args = parser.parse_args()
    
    if args.command in ['create-db']:
        create_database(args.url_db, args.data, args.metadata).create_db()
    elif args.command in ['query-fastapi']:
        query(args.url_db, args.host_fastapi, args.port).start_server()
    else:
        parser.print_help()
        
        

if __name__ == "__main__":
    main()