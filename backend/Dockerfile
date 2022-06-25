FROM python:3.9
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONBUFFERED 1

COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir --upgrade -r /requirements.txt
COPY backend /code/backend/
COPY data /data

ENV GRAPH_FILE=/data/graph_xdd.pickle
ENV IMPACT_FACTORS=/data/journal_rankings.pickle
ENV RECORDS_DB=/data/records.db
ENV ES_INDEX=frailty_001

EXPOSE 1601
ENV PYTHONPATH /code/
CMD ["uvicorn", "backend.start:app", "--host", "0.0.0.0", "--port", "1601"]
