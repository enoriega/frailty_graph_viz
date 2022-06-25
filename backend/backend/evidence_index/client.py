""" Client interface to the ES index """
from typing import Optional, Dict, Any, Iterable

from elasticsearch import AsyncElasticsearch

from . import Evidence


class EvidenceIndexClient:

    def __init__(self, index:str, host:str = "localhost"):
        self._host = host
        self._index = index
        self._es: Optional[AsyncElasticsearch] = None

    @property
    def _client(self):
        if self._es is None:
            self._es = AsyncElasticsearch(hosts=[self._host])
        return self._es

    async def query(self, field: str, querystr: str, start: int, max_results: int) -> tuple[int,  Iterable[Evidence]]:
        es = self._client
        body = {
          "query": {
            "match": { field: querystr }
          },
            "from": start,
            "size": max_results
        }

        ret = list()
        resp = await es.search(body = body, index=self._index)
        total_hits = resp['hits']['total']['value']
        for res in resp['hits']['hits']:
            data = res['_source']
            ev = Evidence(**data)
            ret.append(ev)

        return total_hits, ret

    async def interaction_types(self):
        es = self._client
        body = {
            "size": 0,
            "aggs": {
                "langs": {
                    "terms": {"field": "event_type", "size": 500}
                }
            }
        }

        ret = list()
        resp = await es.search(body = body, index=self._index)
        total_hits = resp['hits']['total']['value']

        for res in resp['aggregations']['langs']['buckets']:
            ret.append(res['key'])

        return total_hits, ret


    async def json_query(self, body):
        es = self._client
        return await es.search(body = body, index=self._index)