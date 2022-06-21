""" Global dependencies of the API server """
import itertools
import logging
import pickle
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

import networkx as nx
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm

# from backend.cli_parser import args
from .config import Settings
from evidence_index.client import EvidenceIndexClient
from .models import EvidenceItem
from backend.rankings import ImpactFactors
from .sql_app import models
from .sql_app.database import construct_engine
from .utils import get_git_revision_hash, md5_hash

logger = logging.getLogger("frailty-viz-dependencies")

# Dependencies
@lru_cache()
def get_cli_args():
    return Settings()

@lru_cache()
def _build_db_session_class():
    engine = construct_engine(Path(get_cli_args().records_db))
    models.Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = _build_db_session_class()()
    try:
        yield db
    finally:
        db.close()


@lru_cache()
def get_es_client():
    return EvidenceIndexClient(get_cli_args().es_index)


@lru_cache()
def get_commit_hash():
    """ Get the current directory from the script's location """
    commit_hash = get_git_revision_hash(str(Path(__file__).parent))
    return commit_hash


@lru_cache()
def get_graph_hash():
    graph_hash = md5_hash(get_cli_args().graph_file)
    return graph_hash


@lru_cache()
def get_rankings_hash():
    rankings_hash = md5_hash(get_cli_args().impact_factors)
    return rankings_hash


@lru_cache()
def get_impact_factors():
    impacts = ImpactFactors(Path(get_cli_args().impact_factors))
    return impacts


@lru_cache()
def read_graph_and_significance():

    def infer_polarity(edge):
        """ Temporary function that will infer polarity out of the label for display and grouping purposes """
        label = edge['label'].lower()
        if "positive" in label:
            polarity = "Positive"
        elif "negative" in label:
            polarity = "Negative"
        else:
            polarity = "Neutral"

        return polarity

    print("Loading data ...")
    with open(get_cli_args().graph_file, 'rb') as f:
        data = pickle.load(f)

    graph = data['graph']
    significance = data['significance']
    synonyms  = {k.strip().lower():list({s.strip().lower() for s in v}) for k, v in data['synonyms'].items()}

    # Add polarity to all edges. This will go away soon
    for (_, _, data) in graph.edges(data=True):
        polarity = infer_polarity(data)
        data['polarity'] = polarity

    print("Cleaning graph ...")
    graph.remove_edges_from(list(nx.selfloop_edges(graph)))
    uaz_nodes = [n for n in graph.nodes if n.startswith("uaz:")]
    graph.remove_nodes_from(uaz_nodes)

    return graph, significance, synonyms


def get_graph():
    graph, _, _ = read_graph_and_significance()
    return graph


def get_significance():
    _, significance, _ = read_graph_and_significance()
    return significance


def get_synonyms():
    _, _, synonyms = read_graph_and_significance()
    return synonyms

@lru_cache()
def get_entity_search_databases():
    synonyms = get_synonyms()
    graph = get_graph()
    inverted_synonyms = dict()

    for k, syns in synonyms.items():
        for s in syns:
            inverted_synonyms[s.strip().lower()] = k.strip().lower()

    inverted_entities = defaultdict(list)
    for n in graph.nodes:
        if 'label' in graph.nodes[n]:
            inverted_entities[graph.nodes[n]['label'].strip().lower()].append(n.strip().lower())

    # inverted_entities = {graph.nodes[n]['label'].lower():n.lower() for n in graph.nodes if 'label' in graph.nodes[n]}

    ids = dict()
    for l, iss in inverted_entities.items():
        for i in iss:
            assert i not in ids, f"{i} already in ids"
            ids[i] = l
    # ids = {l:i for i, l in inverted_entities.items()}

    return ids, inverted_entities, inverted_synonyms

@lru_cache()
def get_entities():
    graph = get_graph()
    # Compute the graph entities
    entities = {f"{graph.nodes[n]['label']} ({n})" for n in graph.nodes if 'label' in graph.nodes[n]}

    return entities


@lru_cache()
def get_structured_entities():
    graph = get_graph()
    structured_entities = [{"label": graph.nodes[n]['label'], "id": n} for n in
                           {nn for nn in graph.nodes if 'label' in graph.nodes[nn]}]

    return structured_entities


@lru_cache()
def get_evidence_sentences_and_frequencies():
    graph = get_graph()

    # Cache the evidence
    print("Building evidence")
    evidence_sentences = defaultdict(list)
    frequencies = defaultdict(int)
    for s, d, ix in tqdm(graph.edges, desc="Caching evidence"):
        edge = graph[s][d][ix]

        polarity = edge['polarity']

        trigger = edge['trigger']

        key = (s, d, polarity)
        w_key = frozenset((s, d))
        sents = list(set(edge['evidence']))
        formatted_sents = set()
        for link, impact, sent in sents:
            fimpact = "%.2f" % impact
            ev = EvidenceItem(sentence=sent, impact=impact, hyperlink=link,
                              list_item=f'({fimpact}) <a href="{link}" target="_blank">Source</a>: {sent}', markup=sent)
            formatted_sents.add(ev)

        frequencies[w_key] += len(formatted_sents)
        evidence_sentences[key] += formatted_sents
        del edge['evidence']

    return evidence_sentences, frequencies


def get_evidence():
    evidence, _ = get_evidence_sentences_and_frequencies()
    return evidence


def get_frequencies():
    _, frequencies = get_evidence_sentences_and_frequencies()
    return frequencies
