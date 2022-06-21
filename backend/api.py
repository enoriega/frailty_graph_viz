# Create a router for the API
from argparse import Namespace
from typing import Optional

import networkx as nx
from fastapi import APIRouter, Depends
from networkx import MultiDiGraph
from sqlalchemy.orm import Session

from .utils import convert2cytoscapeJSON, get_global_edge_data
from evidence_index import Evidence
from evidence_index.client import EvidenceIndexClient
from . import models as md, utils
from .config import Settings
from .sql_app import schemas, crud
from .sql_app.schemas import RecordCreate, RecordMetadataCreate
import itertools as it
from .viz_api import get_category_number_from_id

from .dependencies import get_db, get_evidence, get_entities, get_structured_entities, get_commit_hash, get_graph_hash, \
    get_rankings_hash, get_cli_args, get_graph, get_frequencies, get_es_client, get_significance, get_synonyms, \
    get_entity_search_databases

api_router = APIRouter(prefix="/api")

@api_router.post('/label')
async def label_evidence(evidence_labels: md.EvidenceLabels, db: Session = Depends(get_db)):
    data = schemas.AnnotatedEvidence(
        sentence=evidence_labels.sentence,
        labels=[schemas.EvidenceLabel(label=name)
                for name, value in evidence_labels.labels.items()
                if value])

    crud.annotate_evidence_sentence(db, data)

    return "Success"


@api_router.put('/evidence-labels')
async def evidence_labels(evidence: md.EvidenceSentence, db: Session = Depends(get_db)):
    """ Returns all the existing labels in the annotations in the database """

    return crud.get_evidence_labels(db, evidence.sentence)


@api_router.get('/evidence/{source}/{destination}/{trigger}')
async def evidence(source, destination, trigger, db: Session = Depends(get_db),
                   evidence_sentences=Depends(get_evidence)):
    # Fetch the evidence from the cache
    evidence_items = evidence_sentences[(source, destination, trigger)]
    # Fetch the stored labels from the DB
    for item in evidence_items:
        labels = crud.get_evidence_labels(db, item.sentence)
        item.labels = labels

    # Return the data, let pydantic handle serialization and the client do the sorting
    return evidence_items


@api_router.get('/entities')
async def graph_entities(term='', entities=Depends(get_entities)):
    term = term.lower()
    candidates = [e for e in entities if term in e.lower()]
    return candidates


@api_router.get('/all_entities')
async def all_graph_entities(structured_entities=Depends(get_structured_entities)):
    return structured_entities


@api_router.get('/synonyms/{entity_id}')
async def entity_synonyms(entity_id:str, synonyms=Depends(get_synonyms)):
    return synonyms.get(entity_id, [])


@api_router.put('/record_weights/')
def record_weights(data: md.UserRecord, db: Session = Depends(get_db),
                   commit_hash: str = Depends(get_commit_hash),
                   graph_hash: str = Depends(get_graph_hash),
                   rankings_hash: str = Depends(get_rankings_hash),
                   settings: Settings = Depends(get_cli_args)):
    metadata = RecordMetadataCreate(
        commit=commit_hash,
        query_str=data.query_str,
        graph_name=settings.graph_file,
        graph_hash=graph_hash,
        rankings_name=settings.impact_factors,
        rankings_hash=rankings_hash
    )

    # metadata = crud.create_metadata(db, metadata)

    # Create the coefficients record
    records = list()
    for coef in data.coefficients:
        # variable = crud.get_or_create_variable(db, d.name)
        record = RecordCreate(variable=coef.name, value=coef.value)
        records.append(record)

    # Save  it to the DB
    crud.create_records(db, records, metadata=metadata)

    return "Success"


@api_router.get('/overview/{term}')
async def anchor(term, graph: MultiDiGraph = Depends(get_graph), frequencies=Depends(get_frequencies),
                 significance=Depends(get_significance)):
    """ Returns the neighors, classified by influenced on, by and reciprocal """

    if term not in graph:
        return {
            "reciprocals": [],
            "influenced": [],
            "influencers": []
        }
    successors = set(graph.neighbors(term))
    predecessors = set(graph.predecessors(term))

    reciprocals = successors & predecessors
    influenced = successors - reciprocals
    influencers = predecessors - reciprocals

    # Get the terms of the weights
    def get_weight_terms(a, b, bidirectional=False):
        has_sig = False
        avg_sig = 0.
        impacts = list()
        p_vals = list()
        max_impact = 0.

        if bidirectional:
            edges = it.chain(((a, b, i) for i in graph[a][b]), ((b, a, i) for i in graph[b][a]))
        else:
            edges = ((a, b, i) for i in graph[a][b])

        for x, y, z in edges:
            doc_data = get_global_edge_data((x, y, z), graph, significance)
            edge_data = graph.get_edge_data(x, y, z)
            has_sig |= doc_data['has_significance']
            avg_sig += doc_data['num_w_significance']
            impacts += edge_data['impact_factors']
            p_vals += doc_data['p_values']
            for impact in edge_data['impact_factors']:
                if impact > max_impact:
                    max_impact = impact

        avg_impact = sum(impacts) / len(impacts)
        avg_sig /= len(impacts)
        avg_p_value = (sum(p_vals) / len(p_vals)) if len(p_vals) > 0 else 1.

        return {'percentage_significance': avg_sig, 'has_significance': int(has_sig), 'avg_impact': avg_impact,
                'max_impact': max_impact, 'avg_pvalue': avg_p_value}

    return {
        'reciprocals': list(sorted(
            ((r, graph.nodes[r]['label'], frequencies[frozenset((term, r))], get_weight_terms(term, r)) for r in
             reciprocals if
             'label' in graph.nodes[r]), key=lambda x: x[1].lower())),
        'influenced': list(sorted(
            ((r, graph.nodes[r]['label'], frequencies[frozenset((term, r))], get_weight_terms(term, r)) for r in
             influenced if
             'label' in graph.nodes[r]), key=lambda x: x[1].lower())),
        'influencers': list(sorted(
            ((r, graph.nodes[r]['label'], frequencies[frozenset((term, r))], get_weight_terms(r, term)) for r in
             influencers if
             'label' in graph.nodes[r]), key=lambda x: x[1].lower())),
    }


@api_router.get('/ir/query/{query}',
                summary="Queries the evidence index for the top evicence entences with respect to the query parameter"
                )
async def retrieve(query: str, start: int = 0, size: int = 10, es: EvidenceIndexClient = Depends(get_es_client)):
    """
        Runs the ***query*** string and returns the number of results specified by size.
        The returned object contains the total number of hits and the slice of results specified by ***start*** and ***size***.
        Pagination is supported by controlling the results using the query arguments ***start*** and ***size***
    """

    total, results = await es.query('raw_sent', query, start, size)

    return {
        "total_hits": total,
        "data": results
    }


@api_router.get('/interaction_types')
async def interaction_types(es: EvidenceIndexClient = Depends(get_es_client)):
    total, interactions = await es.interaction_types()
    return interactions


@api_router.get('/ir/structured_search/{controller}/{controlled}')
async def structured_search(controller: str, controlled: str, interaction: Optional[str] = None,
                            es: EvidenceIndexClient = Depends(get_es_client)):
    body = {
        "query": {
            "bool": {
                "must": [
                    {
                        "term": {
                            "source": {
                                "value": controller
                            }
                        }
                    },
                    {
                        "term": {
                            "destination": {
                                "value": controlled
                            }
                        }
                    },

                ]
            }
        },
        "size": 1_000
    }

    if interaction:
        body["query"]["bool"]["must"].append({
            "term": {
                "event_type": {
                    "value": interaction
                }
            }
        })

    es_response = await es.json_query(body)

    ret = list()
    total_hits = es_response['hits']['total']['value']
    for res in es_response['hits']['hits']:
        data = res['_source']
        ev = Evidence(**data)
        ret.append(ev)

    return total_hits, ret


@api_router.get("/search_entity/{query}")
async def search_entity(query:str,
                        databases = Depends(get_entity_search_databases),
                        synonyms = Depends(get_synonyms)):

    query = query.strip().lower()

    ids, inv_names, inv_synonyms = databases

    id_matches = [i for i in ids if query in i]
    name_matches = [i for n, i in inv_names.items() if query in n]
    syn_matches = [i for s, i in inv_synonyms.items() if query in s]

    matched_ids = set(id_matches) | set(it.chain.from_iterable(n for n in name_matches)) | set(s for s in syn_matches)

    ret = []
    for m_id in matched_ids:
        if m_id in ids:
            label  = ids[m_id]
            syns = synonyms.get(m_id, [])

            ret.append(
                {
                    "id": {"text":m_id, "matched":query in m_id},
                    "desc": {"text":label, "matched":query in label},
                    "synonyms": [
                        {"text":s, "matched":query in s} for s in syns if s != label
                    ],
                    "category": get_category_number_from_id(m_id)
                }
            )

    return ret




@api_router.get("/interaction/{source}/{destination}/{bidirectional}")
async def interaction(source, destination, bidirectional: bool, graph: MultiDiGraph = Depends(get_graph),
                      significance=Depends(get_significance)):
    # Find the shortest path between source and destination
    path = nx.shortest_path(graph, source, destination)
    valid_edges = set(zip(path, path[1:]))
    subgraph = graph.subgraph(path)

    edges = list(
        sorted((e for e in subgraph.edges if bidirectional or (e[0], e[1]) in valid_edges), key=lambda e: (e[0], e[1])))
    grouped_edges = it.groupby(edges, key=lambda e: (e[0], e[1]))

    discarded = set()

    for group, subset in grouped_edges:
        subset = list(subset)
        subset.sort(key=lambda e: sum(v for k, v in subgraph.get_edge_data(*e).items() if k == 'freq'), reverse=True)

    # Add the significance data here
    new_edges = list()
    for e in edges:
        if e not in discarded:
            x = (*e, dict(**subgraph.get_edge_data(*e), **get_global_edge_data(e, graph, significance)))
            new_edges.append(x)
    # new_edges = [(*e, dict(**subgraph.get_edge_data(*e), **get_global_edge_data(e))) for e in subgraph.edges if e in edges and e not in discarded]

    # Group the new edges by their label
    aggregated_new_edges = dict()
    for (src, dst, _, data) in new_edges:
        # key = (src, dst, data['label'])
        field = 'label'

        for txt in data[field].split(" ++++ "):
            key = (src, dst, txt)
            local_data = dict(data.items())
            local_data[field] = txt
            if key not in aggregated_new_edges:
                aggregated_new_edges[key] = local_data
                aggregated_new_edges[key]['seen_in'] = list(aggregated_new_edges[key]['seen_in'])
                aggregated_new_edges[key]['impact_factors'] = list(local_data['impact_factors'])
                aggregated_new_edges[key]['p_values'] = list(local_data['p_values'])
            else:
                d = aggregated_new_edges[key]
                d[field] += ' ++++ ' + local_data[field]
                d['freq'] += local_data['freq']
                d['has_significance'] |= local_data['has_significance']
                d['seen_in'] += local_data['seen_in']
                d['num_w_significance'] += local_data['num_w_significance']
                d['impact_factors'] += local_data['impact_factors']
                d['p_values'] += local_data['p_values']

    # Remove duplicate terms from triggers
    for data in aggregated_new_edges.values():
        data[field] = ', '.join(sorted(set(data[field].split(" ++++ "))))

    new_edges = [(k[0], k[1], ix, v) for ix, (k, v) in enumerate(aggregated_new_edges.items())]

    new_g = nx.MultiDiGraph()
    # new_g.add_nodes_from(set(it.chain.from_iterable((e[0], e[1]) for e in new_edges)))
    new_nodes = list()

    for e in new_edges:
        new_nodes.append((e[0], subgraph.nodes[e[0]]))
        new_nodes.append((e[1], subgraph.nodes[e[1]]))
    # new_nodes = set(it.chain.from_iterable((n, subgraph.nodes[n]) for n in e for e in new_edges))
    new_g.add_nodes_from(list(new_nodes))
    new_g.add_edges_from(new_edges)

    new_g.remove_edges_from(discarded)

    return convert2cytoscapeJSON(new_g)


@api_router.get("/neighbors/{elem}")
async def neighbors(elem, graph: MultiDiGraph = Depends(get_graph), significance = Depends(get_significance)):
    subgraph = graph.subgraph(list(graph.neighbors(elem)) + list(graph.predecessors(elem)) + [elem])

    edges = [e for e in subgraph.edges if (e[0] == elem or e[1] == elem)]
    edges.sort(key=lambda e: sum(v for k, v in subgraph.get_edge_data(*e).items() if k == 'freq'), reverse=True)

    discarded = set(edges[100:])
    # discarded = set()
    edges = set(edges)

    new_edges = [(*e, dict(**subgraph.get_edge_data(*e), **get_global_edge_data(e, graph, significance))) for e in
                 subgraph.edges if
                 e in edges and e not in discarded]
    new_g = nx.MultiDiGraph()
    # new_g.add_nodes_from(set(it.chain.from_iterable((e[0], e[1]) for e in new_edges)))
    new_nodes = list()

    for e in new_edges:
        new_nodes.append((e[0], subgraph.nodes[e[0]]))
        new_nodes.append((e[1], subgraph.nodes[e[1]]))
    # new_nodes = set(it.chain.from_iterable((n, subgraph.nodes[n]) for n in e for e in new_edges))
    new_g.add_nodes_from(list(new_nodes))
    new_g.add_edges_from(new_edges)

    new_g.remove_edges_from(discarded)

    return convert2cytoscapeJSON(new_g)
