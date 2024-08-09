import uvicorn
import argparse
from models import *
from fastapi import FastAPI
from sqlalchemy import func
from multipledispatch import dispatch
from sqlmodel import create_engine, Session, select




class query:
    def __init__(self, url_db, host, port):
        self.url_db = url_db
        self.engine = create_engine(self.url_db, echo=False)
        self.app = FastAPI()
        self.host = host
        self.port = port
        self.setup_routes()


    def setup_routes(self):
        
        @self.app.get("/interactions/{participiant}")
        def get_interactions(participiant:str):
            
            kb_name, kb_id = participiant.strip().split(':', 1)
            
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


        @dispatch(str, str)
        @self.app.get("/evidences/{controller}/{controlled}")
        def get_evidences(controller:str, controlled:str):
            
            controller_kb_name, controller_kb_id = controller.strip().split(':', 1)
            controlled_kb_name, controlled_kb_id = controlled.strip().split(':', 1)
                   
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


        @dispatch(str, str, bool, bool)
        @self.app.get("/evidences/{controller}/{controlled}/{polarity}/{directed}")
        def get_evidences(controller:str, controlled:str, polarity:bool, directed:bool):
            
            controller_kb_name, controller_kb_id = controller.strip().split(':', 1)
            controlled_kb_name, controlled_kb_id = controlled.strip().split(':', 1)
            
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
        
        
        @self.app.get("/neighbors/{participiant}")
        def get_neighbors(participiant:str):
            
            kb_name, kb_id = participiant.strip().split(':', 1)
        
            neighbors = []
            n_tuples = []
            with Session(self.engine) as session:
                participant = session.exec(select(Participant).where(Participant.kb_name == kb_name, Participant.kb_id == kb_id)).first()
                if participant is None:
                    return neighbors
                
                interactions = session.exec(select(Interaction).where(Interaction.controller == participant.id)).all()
                for i in interactions:
                    dir = 'Out' if i.directed else 'None'
                    n_tuples.append((i.controlled, i.polarity, dir))
                    
                interactions = session.exec(select(Interaction).where(Interaction.controlled == participant.id)).all()
                for i in interactions:
                    dir = 'In' if i.directed else 'None'
                    n_tuples.append((i.controller, i.polarity, dir))

                for n in set(n_tuples):
                    n_participant = session.exec(select(Participant).where(Participant.id == n[0])).first()
                    obj = {
                        'kb_name': n_participant.kb_name,
                        'kb_id': n_participant.kb_id,
                        'polarity': n[1],
                        'direction': n[2]
                    }
                    neighbors.append(obj)
            return neighbors
        
        
        @self.app.get("/article_text/{PMCID}")
        def get_article_text(pmcid:str):
            
            pmcid = pmcid.upper()
            pmcid = pmcid if pmcid.startswith('PMC') else f'PMC{pmcid}'
            
            with Session(self.engine) as session:
                article = session.exec(select(Article).where(Article.name == pmcid)).first()
                if article is None:
                    return ""
                
                return article.text


        # get_interactions('uniprot:P54829')
        # get_evidences1(1)
        # get_evidences2('uniprot:P54829', 'pfam:PF02985')
        # get_evidences3('uniprot:P54829', 'pfam:PF02985', True, False)
        # get_neighbors('uniprot:P54829')
        # get_article_text('PMC8910733')



    def start_server(self):
        print(f"Starting FastAPI server with database URL: {self.url_db} and host: http://{self.host}:{self.port}")
        uvicorn.run(self.app, host=self.host, port=self.port)




def main():
    default_url = 'postgresql://postgres:mysecretpassword@localhost/postgres'
    
    parser = argparse.ArgumentParser(description='Access the database via RESTAPI')
    parser.add_argument('--url-db', '-u', default=default_url, type=str, help='Database URL')
    parser.add_argument('--host-fastapi', '-hf', default='127.0.0.1', type=str, help='FastAPI host')
    parser.add_argument('--port', '-p', default=8000, type=int, help='FastAPI port')
    
    args = parser.parse_args()
    
    query(args.url_db, args.host_fastapi, args.port).start_server()

        

if __name__ == "__main__":
    main()