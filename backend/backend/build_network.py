import csv
import glob
import itertools as it
import json
import logging
import os.path
import pickle
import re
from collections import Counter, defaultdict
from html.parser import HTMLParser
from io import StringIO
from pathlib import Path
from typing import NamedTuple, Set, Optional, Mapping

import networkx as nx
import plac as plac
from tqdm import tqdm

# Function definitions
from backend.network import SignificanceRow
from evidence_index.create_evidence_index import parse_markup
from rankings import ImpactFactors

pmcid_pattern = re.compile(r"^PMC[1-9]\d{0,6}$", re.IGNORECASE)

black_listed_entities = {
    "uniprot:P31944",
    "pubchem:6234",
    "uniprot:O14896"
}


class XDDMetaData(NamedTuple):
    journal: str
    link: str
    doi: Optional[str]


def read_uniprot(path):
    """ Parse the fasta file with uniprot data to generate a dictionary of descriptions """

    ret = {}
    with open(path, 'r') as f:
        for line in tqdm(f, desc='Reading uniprot ...'):
            if line.startswith('>sp'):
                prefix = line.split('OS=')[0]
                triplet, desc = prefix.split(' ', 1)
                gid = triplet.split('|')[1]
                ret[gid] = desc
    return ret


def parse_file(p, bibliography: Mapping[str, XDDMetaData]):
    """
    Reads a TSV (Arizona format) file and returns a list with dictionary elements for each row
    """
    try:
        with open(p) as f:
            reader = csv.DictReader(f, delimiter='\t')
            rows = list()
            for r in reader:
                if r['SEEN IN'] is not None:
                    # TODO: Fix this in the source
                    if r['SEEN IN'] == "PMC0" or not pmcid_pattern.match(r['SEEN IN']):
                        r['SEEN IN'] = Path(p).name.split('-')[0]

                    seen_in = r['SEEN IN'][3:]
                    if seen_in in bibliography:
                        metadata = bibliography[seen_in]
                        r['JOURNAL'] = metadata.journal
                        r['LINK'] = metadata.link
                        if not metadata.doi:
                            continue
                    else:
                        r['LINK'] = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{r['SEEN IN']}"
                    rows.append(r)
    except Exception as ex:
        rows = list()

    return rows


def parse_files(ps, bibliography):
    """
    Reads all files and joins the resulting dictionaries
    """
    frs = list()
    for p in ps:
        fr = parse_file(p, bibliography)
        frs.extend(fr)
    return frs


def is_black_listed(s: str) -> bool:
    """
    Used to filter out rows due to malformed participants in its fields
    """
    # If participant is not a string, don't proceed
    if s == '':
        return True
    # If participant is "complex"  don't proceed
    if s[0] == '{' or s[-1] == '}':
        return True
    # Otherwise, can proceed
    return False


def fix_frailty_groundings(pre):
    """ Will apply ad-hoc fixes to the grounding ids"""
    # Will fix labels
    return pre.replace("frailty:FR00001", "mesh:D000073496")


# Pre-compile a regex to save time
suffix = re.compile(r"(\.\w+|:\[\w+\])+$", re.IGNORECASE)


def decompose_complex(sq):
    """ Breaks down complex participants into individual participants """

    for s in sq:
        s = s.strip('{}')
        elems = s.split(', ')
        for e in elems:
            if '::' in e:
                e = suffix.sub("", e)
                assert e != ''
                if 'uaz:' not in e:
                    txt, gid = e.split('::', maxsplit=1)
                    yield txt, gid.split('.')[0]


def merge_graphs(g, h):
    """ Merges two existing graphs preserving information """
    i = nx.MultiDiGraph()

    i.add_edges_from(tqdm(it.chain(g.edges(data=True), h.edges(data=True)), desc="Merging edges"))
    i.add_nodes_from(tqdm(it.chain(g.nodes(data=True), h.nodes(data=True)), desc="Merging nodes"))

    return i


doi_pattern = re.compile(r"10.\d{4,9}/[-._;()/:A-Z0-9]+", re.IGNORECASE)


def parse_xdd_blibliography(path: Path) -> Mapping[str, XDDMetaData]:
    # Read the json file with the bibliography
    with path.open() as f:
        bib = json.load(f)

    # Transform the json file into a dictionary with the data we need
    # Key = xDD UUID
    # Value: NamedTuple with the following fields
    #   - Journal name
    #   - Article link
    #   - Article DOI

    entries = list()
    for elem in tqdm(bib, desc="Reading xDD bibliography", unit="entries"):
        key, doi = None, None
        for identifier in elem["identifier"]:
            id_type = identifier["type"]
            if id_type == "_xddid":
                key = identifier["id"]
            elif id_type == "doi":
                doi = identifier["id"]

        assert key is not None, f"Problem reading xdd id"

        journal = elem["journal"]["name"]["name"]
        link = elem["link"][0]["url"]

        # If no DOI specified, try finding it in the link
        if doi is None:
            match = doi_pattern.search(link)
            if match:
                doi = match.group()
            else:
                doi = None

        entry = XDDMetaData(journal, link, doi)
        entries.append((key, entry))

    # Return the dictionary built from the list of extracted entries
    return dict(entries)


class EdgeKey(NamedTuple):
    """ Named tuple to encode the identity of an edge in the graph"""
    controller: str
    input: str
    output: str
    trigger: str
    label: str


pmcid_pattern = re.compile(r"^PMC[1-9]\d{0,6}$", re.IGNORECASE)


def resolve_document(seen_in: str, bibilography: Mapping[str, XDDMetaData], doi2pmcid:Mapping[str, str]) -> str:
    """ Resolves the document to either the PMCID or the DOI """

    if pmcid_pattern.match(seen_in):
        return seen_in
    else:
        key = seen_in[3:]
        xdd_metadata = bibilography[key]
        if xdd_metadata.doi:
            doi = xdd_metadata.doi
            return doi2pmcid.get(doi, doi)
        else:
            return key


@plac.pos('output_file', 'Graph output file', type=Path)
@plac.opt('index_factors_path', 'Pickle file that contains impact factors', type=Path)
@plac.opt('bibliography_path', 'Json file with the bibliography generated by xDD', type=Path)
@plac.opt('uniprot_path', 'Uniprot fasta file, for the participant descriptions', type=Path)
@plac.opt('pmcid_map_path', 'PMCID to DOI and others file', type=Path)
@plac.pos('input_files_dirs', 'Arizona files directory', type=Path)
def main(output_file:Path,
         index_factors_path: Optional[Path],
         bibliography_path: Optional[Path],
         uniprot_path=Path('../data/uniprot_sprot.fasta'),
         pmcid_map_path=Path('../data/PMC-ids.csv'),
         *input_files_dirs
         ):
    """
    Reads
    """

    # Read uniprot for the top_descriptions
    uniprot_names = read_uniprot(uniprot_path)
    paths = it.chain.from_iterable(glob.glob(os.path.join(input_dir, "*.tsv")) for input_dir in input_files_dirs)

    index_factors = None
    # Load the index factors if they are specified
    if index_factors_path:
        index_factors = ImpactFactors(index_factors_path)

    xdd_bib = None
    if bibliography_path:
        xdd_bib = parse_xdd_blibliography(bibliography_path)

    # Parse the PMCIDs file
    with pmcid_map_path.open() as f:
        reader = csv.DictReader(f)
        doi2pmcid = {r['DOI']:r['PMCID'] for r in tqdm(reader, desc="Reading PMCID metadata")}

    # Generate a data frame from the arizona output files
    all_rows = parse_files(tqdm(paths, desc='Parsing files'), xdd_bib)

    # Dict to resolve the oututs
    dataset_outputs = dict()
    # Dict to resolve the inputs
    dataset_inputs = dict()
    # Store the significance extractions in this variable
    significance_extractions = defaultdict(list)
    # Journals associated to each row
    journals = defaultdict(set)
    impact_factors = defaultdict(list)

    # Fix the participant names here:
    for row in tqdm(all_rows, desc='Fixing participant\'s names'):
        try:
            row['INPUT'] = fix_frailty_groundings(row['INPUT'])
            row['OUTPUT'] = fix_frailty_groundings(row['OUTPUT'])
            row['CONTROLLER'] = fix_frailty_groundings(row['CONTROLLER'])

            # Handle significance rows
            if row['EVENT LABEL'] == 'Significance':
                type_ = row['INPUT'].lower()
                value = row['OUTPUT']
                paper = resolve_document(row['SEEN IN'], xdd_bib, doi2pmcid)
                if paper is not None:  # Be sure to memorize only those instances that can be attributed to a paper
                    significance_extractions[paper].append(SignificanceRow(type_, value))
        except Exception:
            print(f'Problem in {row["SEEN IN"]}')

    for row in tqdm(all_rows, desc="Caching inputs and outputs"):
        # key = (row._19, row._4) # ._4 = EVENT ID, ._19 = SEEN IN
        key = (row['EVENT ID'], row['SEEN IN'])
        val_o = row['OUTPUT']
        dataset_outputs[key] = val_o
        val_i = row['INPUT']
        dataset_inputs[key] = val_i
        if 'JOURNAL' in row:
            journals[key] = row['JOURNAL']

    # Filter criteria to discard any row with a malformed participant
    row_stays = lambda row: not is_black_listed(row['INPUT']) and \
                            not is_black_listed(row['OUTPUT']) and \
                            not is_black_listed(row['CONTROLLER'])

    filtered_rows = [row for row in tqdm(all_rows, desc='Choosing the rows to keep') if row_stays(row)]

    # Build top_descriptions
    all_descriptions = defaultdict(Counter)

    for row in tqdm(filtered_rows, desc='Generating entity top_descriptions'):
        for participant in (row[p] for p in ('INPUT', 'OUTPUT', 'CONTROLLER')):
            if participant != 'NONE':
                for txt, gid in decompose_complex([participant]):
                    # Normalize the text to remove case variations of the same description
                    txt = txt.lower().strip()
                    num = gid.split(':')[-1]  # Uniprot key
                    all_descriptions[gid][uniprot_names.get(num, txt)] += 1  # If in uniprot, use the desc, otherwise,
                    # use the text

    # Choose the  most frequent description for each entity
    top_descriptions = {k: v.most_common()[0][0] for k, v in
                        tqdm(all_descriptions.items(), desc='Choosing the most frequent description')}

    # Start building the graph edges here
    counts = Counter()
    evidences = defaultdict(set)
    seen_in = defaultdict(set)  # Keep track of the papers where an edge has been observed
    edges: Set[EdgeKey] = set()

    def resolve(eid, col, paper):
        cache = dataset_inputs if col == 'OUTPUT' else dataset_outputs

        if "::" not in eid and eid != 'NONE':
            # Resolve complex events by following the trace of the events in the frame
            row = cache[(eid, paper)]
            # If we look for the input, of an event, then the realized element is the outut of the input
            if col == 'INPUT':
                return resolve(row, 'OUTPUT', paper)
            elif col == 'OUTPUT':
                return resolve(row, 'INPUT', paper)
            elif col == 'CONTROLLER':
                return resolve(row, 'OUTPUT', paper)
            else:
                raise Exception("Invalid resolution")
        else:
            return eid

    # Build the edges from the rows in the data frame
    for row in tqdm(filtered_rows, desc='Building edges'):

        # Skip this extraction if it comes from a paper with low index factor
        if index_factors:
            source = row['JOURNAL'] if 'JOURNAL' in row else row['SEEN IN'].strip()
            # TODO make this dynamic
            # if row['SEEN IN'] and index_factors.get_impact(source) < 0.5:
            #     continue

        # Ignore those that have adhoc entities, i.e. uaz prefixes
        if "uaz:" not in row['INPUT'] and "uaz:" not in row['OUTPUT'] and "uaz:" not in row['CONTROLLER']:
            try:
                paper = resolve_document(row['SEEN IN'], xdd_bib, doi2pmcid)
                inputs = list(decompose_complex([resolve(row['INPUT'], 'INPUT', paper)]))
                outputs = list(decompose_complex([resolve(row['OUTPUT'], 'OUTPUT', paper)]))
                controllers = list(decompose_complex([resolve(row['CONTROLLER'], 'CONTROLLER', paper)]))
                label = row['EVENT LABEL']

                if len(controllers) > 0:
                    for controller, input, output in it.product(controllers, inputs, outputs):
                        controller = controller[1]
                        input = input[1]
                        output = output[1]
                        freq = row['SEEN']
                        doc = resolve_document(row['SEEN IN'], xdd_bib, doi2pmcid)
                        trigger = row['TRIGGERS']
                        evidence = row['EVIDENCE'].split(' ++++ ')

                        if 'JOURNAL' in row:
                            journal = row['JOURNAL']
                        else:
                            journal = None

                        source = journal if journal else row['SEEN IN'].strip()
                        impact_factor = index_factors.get_impact(source)

                        key = EdgeKey(controller, input, output, trigger, label)
                        seen_in[key].add(doc)  # This is the PMCID or paper id where the edge has been seen
                        counts[key] += int(freq)  # This comes as string, cast it to an int
                        link = row['LINK']
                        evidences[key] |= {(link, impact_factor, e) for e in evidence}
                        journals[key].add(journal)
                        impact_factors[key].append(impact_factor)

                        # Build the edge
                        edges.add(key)
                elif "ssociation" in label:

                    participants = [p for p in row['INPUT'].split(', ') if '::' in p]
                    if len(participants) > 1:
                        controller, output = [p[1] for p in list(decompose_complex([row.INPUT]))]
                        if controller != output:
                            input = controller
                            freq = row['SEEN']
                            doc = resolve_document(row['SEEN IN'], xdd_bib, doi2pmcid)
                            trigger = row['TRIGGERS']
                            evidence = row['EVIDENCE'].split(' ++++ ')

                            if 'JOURNAL' in row:
                                journal = row['JOURNAL']
                            else:
                                journal = None

                            source = journal if journal else row['SEEN IN'].strip()
                            impact_factor = index_factors.get_impact(source)

                            key = EdgeKey(controller, input, output, trigger, label)
                            seen_in[key].add(doc)  # This is the PMCID or paper id where the edge has been seen
                            counts[key] += int(freq)  # This comes as string, cast it to an int
                            link = row['LINK']

                            evidences[key] |= {(link, impact_factor, e) for e in evidence}
                            journals[key].add(journal)
                            impact_factors[key].append(impact_factor)

                            # Build the edge
                            edges.add(key)
            except Exception as ex:
                pass  # TODO log exceptions


    # Create the nx graph
    G = nx.MultiDiGraph()

    for key in tqdm(edges, desc="Making graph"):
        try:
            if key.controller not in G.nodes:
                G.add_nodes_from([(key.controller, {'label': top_descriptions[key.controller]})])
            if key.input not in G.nodes:
                G.add_nodes_from([(key.input, {'label': top_descriptions[key.input]})])
            if key.output not in G.nodes:
                G.add_nodes_from([(key.output, {'label': top_descriptions[key.output]})])

            if type(key.trigger) == str:
                trigger = key.trigger
            else:
                trigger = key.label

            evidence = evidences[key]
            kept_evidence = list()
            seen = set()
            for link, significance, markup in evidence:
                stripper = TagStripper(markup)
                raw_sent = stripper.raw_sentence
                if raw_sent not in seen:
                    kept_evidence.append((link, significance, markup))
                    seen.add(raw_sent)

            metadata = {
                "input": key.output,
                "trigger": trigger,
                "freq": len(kept_evidence),
                "evidence": kept_evidence,
                "seen_in": seen_in[key],
                "label": key.label,
                "journals": journals[key],
                "impact_factors": impact_factors[key]
            }

            # Ignore problematic entities
            if key.controller in black_listed_entities or key.output in black_listed_entities:
                continue

            G.add_edge(key.controller, key.output, **metadata)
        except Exception as ex:
            print(key)
            print(ex)

    output = {
        'graph': G,
        'significance': dict(**significance_extractions),
        'synonyms':{k:list(v.keys()) for k, v in all_descriptions.items()}
    }
    # Save the graph into a file
    logging.info(f"Saving output to {output_file}")
    with output_file.open('wb') as f:
        pickle.dump(output, f)
    logging.info("Done")


class TagStripper(HTMLParser):
    """ Use this class to strip markup and get the attributes of the tags as properties of the instance """
    def __init__(self, data:str):
        super().__init__()
        self._raw_sentence = StringIO()
        self._data = data
        self.feed(data)
        self.space_remover = re.compile(r'\s+')

    def handle_data(self, data: str) -> None:
        self._raw_sentence.write(data)

    @property
    def raw_sentence(self) -> str:
        return self.space_remover.sub(' ', self._raw_sentence.getvalue().strip())


if __name__ == "__main__":
    plac.call(main)
