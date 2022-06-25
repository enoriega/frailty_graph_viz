""" Creates an elastic search index from the evidence in a networkx graph """
import pickle
from io import StringIO
from pathlib import Path
from typing import Optional, List, Tuple, Iterable
from html.parser import HTMLParser
from tqdm import tqdm
import logging
import elasticsearch
from elasticsearch import helpers

import plac

from evidence_index import Evidence


class EvidenceParser(HTMLParser):
    """ Use this class to strip markup and get the attributes of the tags as properties of the instance """
    def __init__(self, data:str):
        super().__init__()
        self.current_tag:Optional[str] = None
        self._raw_sentence = StringIO()
        self.event_type:Optional[str] = None
        self._data = data
        self.feed(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        # We can assume there will be no nested tags
        self.current_tag = tag
        if tag == "span":
            # Make attributes a dict for convenience
            attrs = dict(attrs)
            # Test whether this is the event's span tag
            classes = attrs.get("class", "")
            if "event" in classes:
                self.event_type = classes.split()[1]


    def handle_data(self, data: str) -> None:
        self._raw_sentence.write(data)

    @property
    def raw_sentence(self) -> str:
        return self._raw_sentence.getvalue()

    @property
    def directed(self) -> bool:
        if "association" in self.event_type.lower():
            return False
        else:
            return  True

    @property
    def polarity(self) -> str:
        if "positive" in self.event_type.lower():
            return "pos"
        elif "negative" in self.event_type.lower():
            return "neg"
        else:
            return "neutral"


def parse_markup(markup:str) -> Tuple[str, str, bool, str]:
    """ Extract the data from the markup text present in the arizona output """
    parser = EvidenceParser(markup)
    return parser.raw_sentence, parser.event_type, parser.directed, parser.polarity


def extract_evidence(data_path: Path) -> List[Evidence]:
    """ Reads the evidence from the graph into pydantic objects """

    with data_path.open('rb') as f:
        graph = pickle.load(f)['graph']

    evidences = list()
    errors = 0
    for src, dst, data in tqdm(graph.edges(data=True), desc="Extrtacting evidence"):
        for evidence in data['evidence']:
            impact_factor = data['impact_factors'][0] if 'impact_factors' in data else None
            try:
                raw_sent, event_type, directed, polarity = parse_markup(evidence[2])
                evidences.append(
                    Evidence(source=src, destination=dst, frequency=data['freq'],
                             raw_sent= raw_sent, event_type=event_type, directed=directed,
                             polarity= polarity, impact=impact_factor,
                             markup=evidence[2], hyperlink=evidence[0])
                )
            except Exception:
                errors += 1

    logging.info(f"Evidence sentences with error: ${errors}")

    return evidences


def bulk_index(documents: Iterable[Evidence], index_host:str, index_name:str):
    """ Bulk imports the documents into the ES index """

    # Initialize the client
    es = elasticsearch.Elasticsearch(hosts=[index_host])

    # Create the index and the mappings if they don't exist yet
    if not es.indices.exists(index_name):
        mappings = \
            {
                "mappings": {
                    "properties": {
                      "source": {"type": "keyword"},
                      "destination": {"type": "keyword"},
                      "event_type": {"type": "keyword"},
                      "raw_sent": {"type": "text"},
                      "markup": {"type": "text"},
                      "directed": {"type": "keyword"},
                      "polarity": {"type": "keyword"},
                      "hyperlink": {"type": "keyword"},
                      "frequency": {"type": "integer"},
                      "impact": {"type": "float"}
                    }
                }
            }

        es.indices.create(index_name, body=mappings)

    actions = list()
    for d in tqdm(documents, desc="Generating ES indexing actions ..."):
        action = dict()
        src = d.dict()
        action['_op_type'] = "index"
        action['_index'] = index_name
        src['type'] = 'evidence'
        action['_source'] = src

        actions.append(action)

    logging.info(f"Starting bulk index")
    helpers.bulk(es, actions)
    logging.info("Finished bulk indiex")


@plac.pos("data_path", help="Path to the pickle that holds the graph", type=Path)
@plac.opt("index_host", help="Path to the pickle that holds the graph", type=str)
@plac.pos("index_name", help="Path to the pickle that holds the graph", type=str)
def main(data_path: Path, index_name:str, index_host:str = "localhost"):
    documents = extract_evidence(data_path)
    bulk_index(documents, index_host, index_name)


if __name__ == "__main__":
    plac.call(main)

