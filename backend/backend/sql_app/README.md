# Score Training Data Model

We store some configured weights to eventually train the ranking.

The main idea is: _Given the current elements visualized by the user, nodes and edges, and their information in the NX, store the configuration of the weight sliders, such that later we can do some regression to make "suggestions"_.

One important feature is __reproducibility__: Be able to fetch exactly the same data visualized and the same weight variables.

That means we need to keep track of the following configuration elements:

- Database (file name and md5 hash)
- Codebase commit hash (to track the weight formula)
- [Optional] The computed score, for sanity checking

We need to be able to change the weight variables as the requirements evolve, so the variable names must be dynamic, such that when we introduce a new term into the weight function, this component won't crash.

## Data Model

- __Variables__ (Terms used in the formula)
  - ID (PK)
  - Variable name (str)
- __Record__ (Observation storage. It will have multiple rows per record. Will be stored when the user clicks a button)
  - Table IX (PK): Counter, works as index to the table
  - Observation ID (UUID, Indexed): Groups all the entries beloning to the same "click"
  - Variable (Foreign key to Variables)
  - Value (Slider value)
  - Metadata (FK to Record Metadata)
- __Record Metadata__ (Keeps track of reproducibility metadata)
  - ID (PK)
  - commit (str commit hash of the codebase)
  - query_str (str contains the ID of the entities displayed)
  - graph_name (str path to the nx file)
  - graph_hash (str md5 hash of the nx file, for sanity)