FROM python:3.9
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONBUFFERED 1

COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir --upgrade -r /requirements.txt
COPY backend /code/backend/

EXPOSE 1601
ENV PYTHONPATH /code/
CMD ["uvicorn", "backend.start:app", "--host", "0.0.0.0", "--port", "1601"]
