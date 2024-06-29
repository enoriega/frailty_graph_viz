## Database Setup
Create a Docker instance with postgresql installed

```
docker run --name frailty_db_server -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```

Run ```main.ipynb``` to create the tables and insert the data into the database.




## Checking the Database from Terminal [optional]
Run the folloing command to interact with the docker container:
```
docker exec -it frailty_db_server bash
```

Access the database:
```
psql -U postgres
```