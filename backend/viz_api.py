from functools import lru_cache
from typing import NamedTuple

from fastapi import APIRouter, Depends

import difflib

import networkx as nx

from networkx import MultiDiGraph, DiGraph
from backend.utils import calculateWeight, convert2cytoscapeJSON, get_global_edge_data
import itertools

# Data loading and preprocessing
from .dependencies import get_graph, get_significance

# Auxiliary data and data structures
from .models import CategoryCount, NodesList, Weights

categories = {
	"uniprot": "Proteins or Gene Products",
	"mesh": "Diseases",
	"go": "Biological Process",
	"fplx": "Proteins or Gene Products",
	"pubchem": "Chemicals",
	"interpro": "Proteins or Gene Products",
	"proonto": "Proteins or Gene Products",
	"chebi": "Chemicals",
	"pfam": "Proteins or Gene Products",
	"frailty": "Biological Process",
	"bioprocess": "Biological Process",
	"atcc": "Cells, Organs and Tissues",
	"cellosaurus": "Cells, Organs and Tissues",
	"cl": "Cells, Organs and Tissues",
	"tissuelist": "Cells, Organs and Tissues",
	"uberon": "Cells, Organs and Tissues",
}
category_encoding = {
    1: 'Proteins or Gene Products',
    2: 'Diseases',
    3: 'Biological Process',
    4: 'Chemicals',
    5: "Cells, Organs and Tissues"
}
category_encoding_rev = {v: k for k, v in category_encoding.items()}


def get_category_name_from_id(node_id):
    try:
        cat = categories[node_id.split(':')[0].lower()]
    except:
        print(f"Problem getting the category pf {node_id}")
        cat = categories["go"]

    return cat



def get_category_number_from_id(node_id):
    return category_encoding_rev[get_category_name_from_id(node_id)]


class PreprocessedVizData(NamedTuple):
    max_frequency: int
    graph_se: DiGraph
    reversed_graph: DiGraph


@lru_cache()
def get_blob_graph() -> PreprocessedVizData:
    """ Dependency injector for the data of the blob viz API """

    # Creating no-self-loop and singly-graph variants
    G_no_selfloop = get_graph()
    G_no_selfloop.remove_edges_from(nx.selfloop_edges(G_no_selfloop))
    G_se = nx.DiGraph()
    G_se.add_nodes_from(G_no_selfloop.nodes.data())
    single_edges = {}
    for u,v,_ in G_no_selfloop.edges:
        if (v,u) in single_edges:
            single_edges[(v,u)] = 0
        else:
            single_edges[(u,v)] = 0

    for _, (u, v, d) in enumerate(G_no_selfloop.edges.data()):
        if (u,v) not in single_edges:
            v,u = u,v
        if 'freq' in d:
            single_edges[(u, v)] += d['freq']
        else:
            single_edges[(u, v)] += 1
    for k, v in single_edges.items():
        G_se.add_edge(k[0], k[1], freq=v)

    max_freq = max([d[2]['freq'] for d in G_se.edges.data()])

    # Reverse graph: To calculate incident edges of X
    G_se_rev = G_se.reverse()

    return PreprocessedVizData(max_freq, G_se, G_se_rev)


# Router, to be exposed by the API entry point
api_router = APIRouter(prefix="/viz_api")

@api_router.get("/categories")
async def categories_details():
    return category_encoding

# Endpoints of the blob viz api
@api_router.post('/getbestsubgraph')
async def get_best_subgraph(nodes: NodesList, category_count: CategoryCount,
                            data: PreprocessedVizData = Depends(get_blob_graph)):
    """
    Request type
    {
        "nodes": {
            "nodes": [
            "uniprot:Q92504", "uniprot:Q0CJ54"
            ]
        },
        "category_count": {
            "categorycount": {
            "1": 10,
            "2": 10,
            "3": 15,
            "4": 20,
            ...
            }
        }
    }
    """

    max_freq, G_se, G_se_rev = data

    nodes = nodes.nodes
    category_count = category_count.categorycount

    catFinalList = {}
    for cat_id, cat_count in category_count.items():
        finalList = [{
            'id': node,
            'freq': max_freq + 1,
            'pinned': True,
            'total_search_freq': float('inf')
        } for node in nodes if get_category_number_from_id(node) == cat_id]
        search_space = finalList
        for node in nodes:
            neighbors = list(map(lambda d: {
                'id': d[0],
                'freq': d[1]['freq'],
                'pinned': False
            }, filter(lambda x: x[0] != '' and get_category_number_from_id(x[0]) == cat_id and x[0] not in nodes, dict(G_se[node]).items())))
            to_neighbors = sorted(neighbors, key=lambda x: x['freq'], reverse=True)[:cat_count]

            neighbors = list(map(lambda d: {
                'id': d[0],
                'freq': d[1]['freq'],
                'pinned': False
            }, filter(lambda x: get_category_number_from_id(x[0]) == cat_id and x[0] not in nodes, dict(G_se_rev[node]).items())))
            from_neighbors = sorted(neighbors, key=lambda x: x['freq'], reverse=True)[:cat_count]

            all_neighbors = to_neighbors + from_neighbors

            for neighbor in (to_neighbors + from_neighbors):
                for search_space_item in search_space:
                    if search_space_item['id'] == neighbor['id']:
                        search_space_item['total_search_freq'] += neighbor['freq']
                        break
                else:
                    neighbor['total_search_freq'] = neighbor['freq']
                    search_space.append(neighbor)

        catFinalList[cat_id] = sorted(search_space, key=lambda x: x['total_search_freq'], reverse=True)[:cat_count]

    finalNodes = []
    for v in catFinalList.values():
        finalNodes += v

    subgraph = G_se.subgraph(map(lambda x: x['id'], finalNodes))

    return {
        'nodes': list(map(lambda x: {
            'id': x[0],
            'category': get_category_number_from_id(x[0]),
            'label': d['label'] if 'label' in (d := x[1]) else x[0],
            'pinned': next(filter(lambda d: d['id'] == x[0], catFinalList[get_category_number_from_id(x[0])]))[
                'pinned'],
            'degree': G_se.degree(x[0])
        }, subgraph.nodes.data())),
        'links': list(map(lambda x: {
            'source': x[0],
            'target': x[1],
            'freq': x[2]['freq'] if 'freq' in x[2] else 1,
            'samecategory': get_category_number_from_id(x[0]) == get_category_number_from_id(x[1])
        }, subgraph.edges.data())),
    }


# @api_router.get("/searchnode/{node_text}/{n}")
# async def search_node(node_text: str, n: int, data: PreprocessedVizData = Depends(get_blob_graph)):
#     # https://stackoverflow.com/questions/10018679/python-find-closest-string-from-a-list-to-another-string

#     _, G_se, G_se_rev = data

#     search_space = set(list(G_se.nodes) + list(map(lambda x: x[1]["label"].strip(
#     ), filter(lambda x: "label" in x[1], G_se.nodes.data()))))
#     results = difflib.get_close_matches(node_text, search_space, n=n)

#     ret = []
#     for r in results:
#         node = next(filter(lambda x: x[0] == r, G_se.nodes.data()), None)
#         if not node:
#             node = next(filter(lambda x: 'label' in x[1] and x[1]['label'].strip(
#             ) == r, G_se.nodes.data()), None)
#         ret.append({
#             "id": node[0],
#             "label": node[1]['label'] if 'label' in node[1] else node[0],
#             'category': get_category_number_from_id(node[0])
#         })

#     return {
#         "matches": ret
#     }

def interaction(source, destination, bidirectional: bool, graph: MultiDiGraph = get_graph(),
                      significance=get_significance()):
    # Find the shortest path between source and destination
    path = nx.shortest_path(graph, source, destination)
    valid_edges = set(zip(path, path[1:]))
    subgraph = graph.subgraph(path)

    edges = list(
        sorted((e for e in subgraph.edges if bidirectional or (e[0], e[1]) in valid_edges), key=lambda e: (e[0], e[1])))
    grouped_edges = itertools.groupby(edges, key=lambda e: (e[0], e[1]))

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

    return new_g


@api_router.post("/noderadius")
async def node_radius(nodes: NodesList, weights: Weights, data: PreprocessedVizData = Depends(get_blob_graph)):
    nodes = nodes.nodes
    weights = weights.weights
    _, G_se, _ = data
    subgraph = G_se.subgraph(nodes)

    node_weights = {node:0 for node in nodes}

    for edge in subgraph.edges(data=True):
        edge_interactions = interaction(edge[0], edge[1], True)

        calculatedWeights = sum([calculateWeight(edge[2], weights) for edge in edge_interactions.edges(data=True)])
        node_weights[edge[0]] += calculatedWeights
        node_weights[edge[1]] += calculatedWeights

    return node_weights