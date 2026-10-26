"""
Mental Health Analysis on Tweets - Web frontend (Flask)
-------------------------------------------------------
Run:   python flask_app.py     then open  http://127.0.0.1:5000
The original Streamlit version (app.py) is untouched and still works.

Files used
  templates/index.html   -> page structure (HTML)
  static/css/style.css   -> all styling (CSS)
  static/js/app.js       -> interactivity (history, charts, batch mode...)
  static/images/*.svg    -> illustrations and icons
"""
import os
import re
import joblib
from flask import Flask, render_template, request, jsonify

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)

# ---------- Load trained artefacts (same files the Streamlit app uses) ----------
model = joblib.load(os.path.join(BASE_DIR, "mental_health_model.pkl"))
vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_vectorizer.pkl"))
label_encoder = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))
CLASSES = list(label_encoder.classes_)

# ---------- Text cleaning (matches the training notebook, incl. stop-words) ----------
_STOP = {
    'a', 'about', 'above', 'after', 'again', 'against', 'ain', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'couldn', "couldn't", 'd', 'did', 'didn', "didn't", 'do', 'does', 'doesn', "doesn't", 'doing', 'don',
    "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn', "hadn't", 'has', 'hasn',
    "hasn't", 'have', 'haven', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', 'hers',
    'herself', 'him', 'himself', 'his', 'how', 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is',
    'isn', "isn't", 'it', "it'd", "it'll", "it's", 'its', 'itself', 'just', 'll', 'm', 'ma', 'me', 'mightn',
    "mightn't", 'more', 'most', 'mustn', "mustn't", 'my', 'myself', 'needn', "needn't", 'no', 'nor', 'not',
    'now', 'o', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over',
    'own', 're', 's', 'same', 'shan', "shan't", 'she', "she'd", "she'll", "she's", 'should', "should've",
    'shouldn', "shouldn't", 'so', 'some', 'such', 't', 'than', 'that', "that'll", 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'these', 'they', "they'd", "they'll", "they're", "they've", 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 've', 'very', 'was', 'wasn', "wasn't", 'we',
    "we'd", "we'll", "we're", "we've", 'were', 'weren', "weren't", 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'why', 'will', 'with', 'won', "won't", 'wouldn', "wouldn't", 'y', 'you', "you'd", "you'll",
    "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
}
_STOP -= {"not", "no", "never", "sad", "happy", "suicidal", "anxious", "depressed"}


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    return " ".join(w for w in text.split() if w not in _STOP)


def analyse(text: str):
    cleaned = clean_text(text)
    if not cleaned.strip():
        return None
    proba = model.predict_proba(vectorizer.transform([cleaned]))[0]
    probs = {CLASSES[i]: round(float(p) * 100, 2) for i, p in enumerate(proba)}
    label = max(probs, key=probs.get)
    return {"label": label, "confidence": probs[label], "probabilities": probs}


# ---------- Static content shown in the UI ----------
CONDITIONS = [
    {"name": "Anxiety", "slug": "anxiety", "color": "#f59e0b",
     "desc": "Persistent worry, restlessness or fear that feels hard to control.",
     "tips": ["Try slow breathing: inhale 4s, hold 4s, exhale 6s.",
              "Write down what you are worried about and what you can control.",
              "Limit caffeine and take short walks outdoors."]},
    {"name": "Bipolar", "slug": "bipolar", "color": "#8b5cf6",
     "desc": "Swings between very high-energy moods and deep lows.",
     "tips": ["Keep a regular sleep and meal schedule.",
              "Track mood changes in a daily journal.",
              "Talk to a doctor or therapist about a long-term plan."]},
    {"name": "Depression", "slug": "depression", "color": "#3b82f6",
     "desc": "Ongoing sadness, low energy and loss of interest in daily life.",
     "tips": ["Reach out to one trusted person today, even with a short message.",
              "Aim for small wins: a shower, a short walk, a proper meal.",
              "Consider speaking to a mental-health professional."]},
    {"name": "Normal", "slug": "normal", "color": "#10b981",
     "desc": "No strong signs of a mental-health concern in the language used.",
     "tips": ["Keep up the habits that help you feel good.",
              "Check in with friends and family regularly.",
              "Notice changes early - small check-ins help."]},
    {"name": "Personality disorder", "slug": "personality_disorder", "color": "#ec4899",
     "desc": "Long-lasting patterns of thinking and relating that cause distress.",
     "tips": ["Therapies such as DBT can be very effective.",
              "Practise pausing before reacting to strong emotions.",
              "Build a support network you can rely on."]},
    {"name": "Stress", "slug": "stress", "color": "#ef4444",
     "desc": "Feeling overwhelmed by pressure, deadlines or life demands.",
     "tips": ["Break tasks into small steps and prioritise.",
              "Schedule real breaks and protect your sleep.",
              "Gentle exercise, stretching or music can lower tension."]},
    {"name": "Suicidal", "slug": "suicidal", "color": "#be123c",
     "desc": "Language that may reflect thoughts of self-harm or hopelessness.",
     "tips": ["You do not have to face this alone - please contact someone now.",
              "Reach out to a crisis line or a trusted person right away.",
              "If you are in immediate danger, call your local emergency number."]},
]
DATASET_COUNTS = {"Normal": 16351, "Depression": 15404, "Suicidal": 10653, "Anxiety": 3888,
                  "Bipolar": 2877, "Stress": 2669, "Personality disorder": 1201}


@app.route("/")
def index():
    return render_template("index.html", conditions=CONDITIONS, counts=DATASET_COUNTS,
                           total=sum(DATASET_COUNTS.values()))


@app.route("/about")
def about():
    return render_template("about.html", conditions=CONDITIONS, counts=DATASET_COUNTS,
                           total=sum(DATASET_COUNTS.values()))


@app.route("/resources")
def resources():
    return render_template("resources.html", conditions=CONDITIONS)


@app.route("/api/predict", methods=["POST"])
def api_predict():
    data = request.get_json(silent=True) or {}
    # Batch mode: {"texts": ["...", "..."]}
    if isinstance(data.get("texts"), list):
        out = []
        for t in data["texts"][:200]:
            t = str(t).strip()
            if not t:
                continue
            r = analyse(t)
            if r:
                out.append({"text": t, **r})
        return jsonify({"results": out})
    # Single mode: {"text": "..."}
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Please enter some text to analyse."}), 400
    if len(text) > 2000:
        return jsonify({"error": "Text is too long (max 2000 characters)."}), 400
    result = analyse(text)
    if result is None:
        return jsonify({"error": "Not enough readable words. Try writing a full sentence."}), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
