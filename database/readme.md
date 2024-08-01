# README.md

## Project Overview

This project provides a utility to import data into a PostgreSQL database and access it via a REST API using FastAPI. It supports two main operations:

1. **Creating a Database and Inserting Data**
2. **Initiating a FastAPI Server**


## Requirements

- Python 3.8+
- PostgreSQL
- Required Python packages (can be installed via `requirements.txt`)


## Database Setup
Create a Docker instance with postgresql installed:

```sh
docker pull postgres
```

Run the docker container:

```sh
docker run --name frailty_db_server -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```


## Checking the Database from Terminal [optional]
Run the folloing command to interact with the docker container:
```sh
docker exec -it frailty_db_server bash
```

If the container is not running, restart it. ```docker ps -a``` will give the active docker containers' information.
```sh
docker restart <containerId>
```

Access the database:
```sh
psql -U postgres
```


## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/your-repo/your-project.git
    cd your-project
    ```

2. Create and activate a virtual environment:

    ```sh
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3. Install the required dependencies:

    ```sh
    pip install -r requirements.txt
    ```


## Usage

### 1. Create Database and Insert Data

You can create the database and insert data using the `create-db` command.

**Command Syntax:**

```sh
python main.py create-db --url-db <DATABASE_URL> --data <DATA_PATH> --metadata <METADATA_PATH>
```

**Arguments:**

- `--url-db`, `-u`: Database URL (default: `postgresql://postgres:mysecretpassword@localhost/postgres`)
- `--data`, `-d`: Path to the data file (default: `data/`)
- `--metadata`, `-m`: Path to the metadata file (default: `articles_metadata.json`)

**Example:**

```sh
python main.py create-db -u postgresql://postgres:password@localhost/mydatabase -d data/ -m articles_metadata.json
```


### 2. Initiate FastAPI Server

You can start the FastAPI server using the `query-fastapi` command.

**Command Syntax:**

```sh
python main.py query-fastapi --url-db <DATABASE_URL> --host-fastapi <HOST> --port <PORT>
```

**Arguments:**

- `--url-db`, `-u`: Database URL (default: `postgresql://postgres:mysecretpassword@localhost/postgres`)
- `--host-fastapi`, `-hf`: FastAPI host (default: `127.0.0.1`)
- `--port`, `-p`: FastAPI port (default: `8000`)

**Example:**

```sh
python main.py query-fastapi -u postgresql://postgres:password@localhost/mydatabase -hf 127.0.0.1 -p 8000
```

## Project Structure

- `main.py`: The main script that parses arguments and calls the appropriate functions.
- `models.py`: Contains the database models.
- `data/`: Directory containing the data files.
- `articles_metadata.json`: Metadata file for the articles.
