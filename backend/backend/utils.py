""" Utility functions for the backend """
import hashlib
import itertools as it
import logging
import os
import subprocess
from typing import List
import math

from .network import SignificanceRow

logger = logging.getLogger("frailty_viz_utils")


def get_global_edge_data(edge, graph, significance):
    """ Returns a dictionary with significance information for the edge which will go into cytoscape """
    # Get the paper IDs for this edge

    data = graph[edge[0]][edge[1]][edge[2]]
    seen_in = set(data['seen_in'])  # Make this a set to avoid double counting
    summary = {
        'has_significance': False,
        'num_w_significance': 0,
        # 'impact_factors': data['impact_factors'],
        'p_values': list(),
    }
    for paper_id in seen_in:
        # Fetch the significance extractions
        significance_detections: List[SignificanceRow] = significance.get(paper_id, [])
        if len(significance_detections) > 0:
            summary['has_significance'] = True
            summary['num_w_significance'] += 1

        # Get the p-values and the correlations
        for detection in significance_detections:
            if detection.type_.strip() == "p":
                try:
                    val = float(detection.value.strip().strip('='))
                except ValueError as ex:
                    # logger.exception(ex)
                    # TODO pipe this to a file
                    pass
                else:
                    summary['p_values'].append(val)

    return summary


def get_git_revision_hash(path: str) -> str:
    cwd = os.getcwd()
    os.chdir(path)
    hash = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode('ascii').strip()
    os.chdir(cwd)
    return hash


def md5_hash(path: str) -> str:
    return hashlib.md5(open(path, 'rb').read()).hexdigest()


# Deprecated
def convert2cytoscapeJSON(G, label_field="polarity"):
    """ Converts an nx graph into the cytoscape js data structure """

    # Sort all the edges to be able to use group by. Make it a list to be able to iterate over it multiple times
    nx_edges = list(sorted(G.edges(data=True), key=lambda e: (e[0], e[1], e[2][label_field])))

    # load all nodes into nodes array
    final = []

    edges = list()
    cluster_edges = dict()
    for node in G.nodes():
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = node
        nx["data"]["label"] = G.nodes[node]['label'] if 'label' in G.nodes[node] else node
        final.append(nx.copy())

    def aggregate_edges(edges):
        """ Aggregates edges from a groupby """
        data = {'freq': 0, 'seen_in': list(), 'label': list(), 'trigger': list(),
                'has_significance': False, 'percentage_significance': 0,
                'avg_impact': 0., 'max_impact': 0., 'avg_pvalue': list()}
        for edge in edges:
            e = edge[2]
            data['freq'] += int(e['freq'])
            data['trigger'].append(e['trigger'])
            data['label'].append(e['label'])
            data['polarity'] = e['polarity']
            data['seen_in'] += e['seen_in']
            data['has_significance'] |= e['has_significance']
            data['percentage_significance'] += e['num_w_significance']
            data['avg_pvalue'] += e['p_values']
            for impact in e['impact_factors']:
                data['avg_impact'] += impact
                if impact > data['max_impact']:
                    data['max_impact'] = impact

        data['percentage_significance'] /= len(data['seen_in'])
        data['avg_impact'] /= len(data['seen_in'])
        data['avg_pvalue'] = (sum(data['avg_pvalue']) / len(data['avg_pvalue'])) if len(data['avg_pvalue']) > 0 else 0.
        del data['seen_in']
        data['trigger'] = ', '.join(data['trigger'])
        data['label'] = ', '.join(data['label'])

        return edge[0], edge[1], data

    # load all edges to edges array. Aggregate them by the label field
    for (ix, (g, es)) in enumerate(it.groupby(nx_edges, key=lambda e: (e[0], e[1], e[2][label_field]))):
        edge = aggregate_edges(es)
        data = edge[2]
        # for ix, data in enumerate(G.get_edge_data(edge[0], edge[1]).values()):
        nx = {}
        nx["data"] = {}
        nx["data"]["id"] = edge[0] + edge[1] + str(ix)
        nx["data"]["source"] = edge[0]
        nx["data"]["target"] = edge[1]
        nx["data"]["freq"] = data['freq']
        nx["data"]["trigger"] = (data['trigger'].replace(" ++++ ", ", ") if type(data['trigger']) != float else "")
        nx['data']['label'] = data['label']
        nx['data']['has_significance'] = data['has_significance']
        nx['data']['percentage_significance'] = data['percentage_significance']
        nx['data']['avg_impact'] = data['avg_impact']
        nx['data']['max_impact'] = data['max_impact']
        nx['data']['avg_pvalue'] = data['avg_pvalue']

        nx['data']['polarity'] = data['polarity']
        edges.append(nx)

    # Create the cluster edges
    for edge in edges:
        key = edge['data']['source'], edge['data']['target']
        if key not in cluster_edges:
            nx = {}
            nx["data"] = {}
            nx["data"]["id"] = "cluster_" + key[0] + key[1]
            nx["data"]["source"] = key[0]
            nx["data"]["target"] = key[1]
            nx["data"]["freq"] = edge['data']['freq']
            nx["data"]["trigger"] = ""
            nx['data']['label'] = ""

            cluster_edges[key] = nx
        else:
            nx["data"]["freq"] += edge['data']['freq']

    # Sort the edges by endpoints, then by frequency
    # edges.sort(key=lambda e: (e['data']['source'], e['data']['target'], e['data']['trigger']))
    # edges.sort(key=lambda e: e['data']['freq'])
    cluster_edges = list(cluster_edges.values())
    # cluster_edges.sort(key=lambda e: e['data']['freq'])
    # Add the edges to the result
    final += (edges + cluster_edges)
    return final

def calculateWeight(meta, coefficients):
    frequency = coefficients['frequency']
    hasSignificance = coefficients['hasSignificance']
    avgImpactFactor = coefficients['avgImpactFactor']
    maxImpactFactor = coefficients['maxImpactFactor']
    pValue = coefficients['pValue']

    weight = math.log((meta['freq']) + 1) * frequency + \
        (meta['has_significance'] if 'has_significance' in meta else 0.0) * hasSignificance + \
        (sum(meta['impact_factors'])/len(meta['impact_factors'])) * avgImpactFactor + \
        max(meta['impact_factors']) * maxImpactFactor + \
        (1 - (1 if len(meta['p_values']) == 0 else (sum(meta['p_values'])/len(meta['p_values'])))) * pValue

    return weight
