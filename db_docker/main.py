import os
import json
import argparse
from tqdm import tqdm
from models import *
from sqlmodel import create_engine, Session


def initiate_engine(db_url):
    return create_engine(db_url, echo=False)


def create_db(db_engine):
    SQLModel.metadata.create_all(db_engine)
    

def import_data(db_engine, data_path):
    data_path = 'data/'
    files = os.listdir(data_path)
    
    for file_name in tqdm(files):
        file_path = os.path.join(data_path, file_name)
        
        if os.path.isfile(file_path):
            with open(file_path, 'r') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError as e:
                    print(f'Error reading {file_name}: {e}')
                    continue
                
                if not data:
                    continue
                
                with Session(db_engine) as session:
                    for item in data:
                        controller_participant = Participant(kb_name=item['controller_id'][0], kb_id=item['controller_id'][1])
                        controlled_participant = Participant(kb_name=item['controlled_id'][0], kb_id=item['controlled_id'][1])
                        
                        session.add(controller_participant)
                        session.add(controlled_participant)
                        session.commit()
                        
                        session.refresh(controller_participant)
                        session.refresh(controlled_participant)
                        
                        
                        controller_participant_description = ParticipantDescription(description=item['controller'], participant_id=controller_participant.id)
                        controlled_participant_description = ParticipantDescription(description=item['controlled'], participant_id=controlled_participant.id)
                        
                        session.add(controller_participant_description)
                        session.add(controlled_participant_description)
                        session.commit()
                        
                        # session.refresh(controller_participant_description)     #optional
                        # session.refresh(controlled_participant_description)     #optional
                        
                        
                        interaction = Interaction(controller= controller_participant.id, controlled= controlled_participant.id, polarity=item['polarity'], directed=True if item['label'].split('_')[-1]=='regulation' else False)
                        session.add(interaction)
                        session.commit()
                        session.refresh(interaction)
                        
                        
                        journal = Journal(name='None', impact_factor=None)
                        session.add(journal)
                        session.commit()
                        session.refresh(journal)
                        
                        
                        article = Article(provenance=None, url=None, name='None', publish_date=None, journal_id=journal.id)
                        session.add(article)
                        session.commit()
                        session.refresh(article)
                        
                        
                        significance = Significance(type=None, value=None, secondary_value=None, article_id=article.id)
                        session.add(significance)
                        # session.commit()                                        #optional
                        # session.refresh(significance)                           #optional
                        
                        
                        evidence = Evidence(
                            text=prepare_text(item['sentence_tokens']), 
                            markup=prepare_text(prepare_markup(item['sentence_tokens'], item['event_indices'], item['controller_indices'], item['controlled_indices'], item['trigger_indices'], item['label'])), 
                            article_id=article.id, 
                            interaction_id=interaction.id)
                        session.add(evidence)
                        session.commit()
                        # session.refresh(evidence)                               #optional
                
                # if i==100:
                #     break
                # i+=1
    

def prepare_text(sentence_tokens):
    return ' '.join(sentence_tokens).replace(' .', '.').replace(' ,', ',').replace(' !', '!').replace(' ?', '?').replace(' :', ':').replace(' ;', ';').replace(' )', ')').replace('( ', '(').replace(' /', '/').replace(' %', '%').replace(' - ', '-').replace(' = ', '=').replace(' + ', '+').replace(' * ', '*').replace(' & ', '&').replace(' | ', '|').replace(' ^ ', '^').replace(' > ', '>').replace(' < ', '<').replace(' @ ', '@').replace(' # ', '#').replace(' $ ', '$').replace(' ~ ', '~').replace(' ` ', '`').replace('{ ', '{').replace(' }', '}').replace(' ]', ']').replace('[ ', '[').replace(' " ', '"').replace(' \' ', '\'').replace(' \\ ', '\\').replace(' \n', ' ')


def prepare_markup(sentence_tokens, event_indices, controller_indices, controlled_indices, trigger_indices, label):
    markup = sentence_tokens.copy()
    
    arr = [(controller_indices[0], f'<span class="controller">'), (controller_indices[1], f'</span>')] + \
        [(controlled_indices[0], f'<span class="controlled">'), (controlled_indices[1], f'</span>')] + \
        [(trigger_indices[0], f'<span class="trigger">'), (trigger_indices[1], f'</span>')]

    arr.sort(key=lambda x: x[0])
    arr = [(event_indices[0], f'<span class="event {label}">')] + arr + [(event_indices[1], f'</span>')]
    
    for i in range(len(arr)-1, -1, -1):
        markup.insert(arr[i][0], arr[i][1])
    
    return markup
    
    
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Import data into a PostgreSQL database')
    parser.add_argument('--data-path', default='data/', help='Path to the data directory')
    parser.add_argument('--db-url', default='postgresql://postgres:mysecretpassword@localhost/db4', help='Database URL')
    
    return parser.parse_args()

    
def main():
    args = parse_args()
    db_engine = initiate_engine(args.db_url)
    create_db(db_engine)
    import_data(db_engine, args.data_path)


if __name__ == '__main__':
    main()