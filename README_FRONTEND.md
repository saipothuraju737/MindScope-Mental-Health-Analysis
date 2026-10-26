# MindScope — Mental Health Analysis on Tweets

## Run the updated website
1. Open this folder in VS Code.
2. In the VS Code terminal run `python -m pip install -r requirements-web.txt`.
3. Run `python flask_app.py`.
4. Open `http://127.0.0.1:5000` in your browser.

## Pages
- `/` — Analyze tweets, batch mode, results, history and category overview.
- `/about` — How the model works, training-data counts and limitations.
- `/resources` — Mental-health resources, category information and helpful habits.

## Files to edit
- `templates/index.html` — main Analyze page
- `templates/about.html` — About page
- `templates/resources.html` — Help & resources page
- `static/css/style.css` — styling, themes and responsive layout
- `static/js/app.js` — frontend interactions on the Analyze page
- `flask_app.py` — Flask routes and prediction API

The original Streamlit app remains available separately: `python -m streamlit run app.py`. The Flask site uses the existing `.pkl` model files and does not require retraining. This is an experimental educational classifier, not a medical diagnostic tool.
