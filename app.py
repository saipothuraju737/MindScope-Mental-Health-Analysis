import streamlit as st
import pandas as pd
import joblib
import re
from sklearn.feature_extraction.text import TfidfVectorizer

# Load trained model & vectorizer
model = joblib.load("mental_health_model.pkl")
vectorizer = joblib.load("tfidf_vectorizer.pkl")
label_encoder = joblib.load("label_encoder.pkl")  # Save & load the label encoder

# Text Cleaning Function
def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+|www\S+|https\S+", '', text)  # Remove URLs
    text = re.sub(r'[^a-zA-Z\s]', '', text)  # Remove special characters
    return text

# Function to predict mental health status
def predict_status(text):
    cleaned_text = clean_text(text)
    transformed_text = vectorizer.transform([cleaned_text])
    prediction = model.predict(transformed_text)[0]
    return label_encoder.inverse_transform([prediction])[0]

# Streamlit UI
st.title("🧠 Mental Health Analysis on Tweets")
st.subheader("Analyze tweets and predict the mental health status of the user.")

# User Input
user_input = st.text_area("Enter a tweet:", "")

if st.button("Analyze"):
    if user_input.strip():
        prediction = predict_status(user_input)
        st.success(f"🧐 Predicted Mental Health Status: **{prediction}**")
    else:
        st.warning("⚠ Please enter a tweet to analyze.")

# Footer
st.markdown("---")
st.markdown("🚀 Built with ❤️ using Streamlit")

