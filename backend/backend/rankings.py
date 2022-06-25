""" Make a dictionary with maps from PMCID -> journal name and journal name to impact metrics """

import csv
import pickle
import re
from pathlib import Path

import plac
from tqdm import tqdm

class ImpactFactors:
    """ Puts together all the information for easy retrieval of impact factor information """

    def __init__(self, data_path: Path) -> None:
        with data_path.open('rb') as f:
            data = pickle.load(f)

        self._pmc_to_sjr = data['pmc_to_sjr']
        self._pmc_to_journal = data['journals']
        self._hindex = data['hindex']
        self._sjr = data['sjr']

    def get_impact(self, publication:str, metric="sjr") -> float:
        """ Returns an impact factor metric for a PMCID entry """

        metric = self.__data_for(metric)

        # Get the journal for the specific pmcid
        if publication in self._pmc_to_journal:
            journal = self._pmc_to_journal[publication]
            value = metric.get(journal, 0.) # Find the impact for the current journal. If missing, then return 0.
            return value
        else:
            score = metric.get(publication, 0.)
            return score



    def __data_for(self, metric):
        """ Utility method to fetch the appropriate impact metric """
        if metric == "hindex":
            return self._hindex
        if metric == "sjr":
            return self._sjr
        else:
            raise Exception(f"Invalid impact metric: {metric}")


@plac.pos('pmc_file_list', help='Path to the FTP service file list', type=Path)
@plac.pos('rankings_file', help='CSV file with the rankings and impact factor data', type=Path)
@plac.pos('output_pickle', help='Output path for the pickle with the resulsts', type=Path)
def main(pmc_file_list:Path = Path('../data', 'oa_file_list.csv'), rankings_file = Path('../data', 'scimagojr 2020.csv'), output_pickle = Path(
    '../data', "journal_rankings.pickle")):
    """ Builds the data structures with the impact factor information """


    with open(pmc_file_list) as f:
        reader = csv.DictReader(tqdm(f, desc="Reading PMC OA file list", unit='lines'))
        rows = list(reader)


    with open(rankings_file) as f:
        reader = csv.DictReader(tqdm(f, desc='Reading rankings', unit='lines'), delimiter=';')
        srows = list(reader)

    pmcid = re.compile(r'PMC[0-9]+')
    def extract_pmcid_journal(row):
        match = pmcid.search(row['File'])
        journal = row['Article Citation'].split('.')[0]
        return match.group(0), journal


    pmcid_2_journal = dict(extract_pmcid_journal(r) for r in rows)
    pmcoa_journals = list(sorted(set(pmcid_2_journal.values())))
    rankings = {s['Title'].lower():s for s in srows}



    maps = list()
    hindex = dict()
    sjr = dict()
    journal_keys = list(sorted(rankings.keys()))

    for j in tqdm(pmcoa_journals, desc='Matching journals to rankings', unit='entries'):
        for key in journal_keys:
            if key.startswith(j.lower()):
                maps.append((j, key))
                data = rankings[key]
                h = float(data['H index'])
                s = data['SJR'].replace(',', '.')
                if s:
                    s = float(s)
                else:
                    s = 0.
                hindex[j] = h
                sjr[j] = s
                break


    with open(output_pickle, 'wb') as f:
        pickle.dump({
            'pmc_to_sjr': maps,
            'journals':pmcid_2_journal,
            'hindex': hindex,
            'sjr':sjr
        }, f)

if __name__ == '__main__':
    plac.call(main)