<div align="center">

<img src="server/public/readme_icon.png" alt="Wayfinder logo" width="120" />

# Wayfinder

**An explorer's journal at your fingertips.**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![Python](https://img.shields.io/badge/Python-3.13-blue)
[![Flask](https://img.shields.io/badge/Flask-3.1-purple)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-purple)](https://sqlite.org/)
[![Railway](https://img.shields.io/badge/Deployed-Railway-red)](https://railway.app/)

</div>

Wayfinder is an image-recognition-powered web app that lets users take photos of objects with heritage significance around them, including cultural items such as art, artifacts, and historical sites, as well as natural items such as fossils, geology, and landforms.
### Core Features
1. Take pictures, identify items, and add them to your collection.
2. 16 subcategories of items to discover
3. Collect all 9 stamps by completing challenging achievements
4. Add friends, compare stamps, and track their discovery process


## Screenshots
<!-- add screenshots here, do like 2 or 3 -->

## Built with
* **Backend**: `Sqlite3`, `Flask`, `Python`

* **Frontend**: `React`

* **Authentication**: `Auth0`

* **Image Recognition**: `Gemini API`

* **Deployment**: `Railway`

<!-- swap for this project's stack, current placeholder -->
The project is built with Flask and Sqlite, with HTML Jinja templates and JS handling the Frontend, and deployed using Gunicorn on Railway.  
1. Flask routes for generating questions, returning quiz settings, and more.
2. Multiple tables for Pokémon, types, and abilities.
3. Pokémon data is cached into the database via [PokeAPI](https://github.com/PokeAPI/pokeapi).


## Setup
<!-- swap for this project's setup, current placeholder -->

Running Pokemon Quiz locally is very simple.  

### 1. Clone the repository into working directory
```bash
git clone https://github.com/AustinN-Tech/Wayfinder.git
```
### 2. Create virtual environment
```bash
python -m venv venv
```
### 3. Install requirements
```bash
pip install -r requirements.txt
```
### 4. Run the python file `run.py`
```bash
python -m run
```

### 5. Navigate to localhost or other specified host in your browser

### Done!


## Roadmap
- [ ] More achievements   
Add more achievements such as `Deep Diver - Discover 10 Maritime Items`, `Seasoned Explorer - Discover 10 Landmarks`, etc...
- [ ] View friend's collection
Users able to view the entirety of collections of other users who are on their friend's list
- [ ] Weekly challenge
Global challenge available for all users, changes weekly
- [ ] Friendly challenge
Users able make a friendly challenge (ie: 'Obtain 5 new fossils by the end of the week') to other users on their friend's list
