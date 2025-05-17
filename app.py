import requests
import time
import json
from datetime import datetime
from twilio.rest import Client
import google.generativeai as genai

NEWSDATA_API_KEY = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_SID = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
FROM_WHATSAPP_NUMBER = "whatsapp:+xxxxxxxxxxx"
TO_WHATSAPP_NUMBER = "whatsapp:+xxxxxxxxxxx"
CONTENT_SID = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'  # Twilio template content SID

# Configure Gemini with API key
genai.configure(api_key="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")

# Load the Gemini Pro model
model = genai.GenerativeModel("gemini-pro")

# Initialize Twilio client
twilio_client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)

def summarize_news(text):
    prompt = f"Summarize the following news article in one line:\n\n{text}"
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error during summarization: {e}")
        # Extract a short summary from the text (first 100 characters)
        short_text = text[:100] + "..." if len(text) > 100 else text
        return f"(API Unavailable) {short_text}"

def get_latest_news():
    print("Fetching latest news...")
    url = (
        f"https://newsdata.io/api/1/news?apikey={NEWSDATA_API_KEY}&category=top&country=in&language=en"
    )
    try:
        response = requests.get(url)
        print(f"API Response Status Code: {response.status_code}")

        # Print raw response for debugging
        print(f"Raw API Response: {response.text[:500]}...")  # Print first 500 chars

        data = response.json()
        print(f"API Status: {data.get('status')}")

        if data.get("status") == "success" and data.get("results"):
            print(f"Found {len(data['results'])} news articles")
            messages = []
            for i, article in enumerate(data["results"][:3]):
                print(f"Processing article {i+1}...")
                title = article["title"]
                source = article.get("source_id", "Unknown")
                pub_date = article["pubDate"]
                link = article["link"]

                # Get article content for summarization
                article_text = article.get("content", article.get("description", title))

                # Summarize the article
                print(f"Summarizing article {i+1}...")
                summary = summarize_news(article_text)
                print(f"Summary complete for article {i+1}")

                # Add both original title and AI summary to the message
                messages.append(f"🗞️ *{title}*\n📌 Summary: {summary}\n📍 {source} | 🕒 {pub_date}\n🔗 {link}")

            return "\n\n".join(messages)
        else:
            print(f"API Error or No Results: {data}")
            return "⚠️ No trending news found."
    except Exception as e:
        print(f"Exception during news fetch: {e}")
        return "⚠️ Error fetching news."

def send_whatsapp_message(message):
    print("Sending WhatsApp message...")
    try:
        # For custom messages with news content
        twilio_client.messages.create(
            from_=FROM_WHATSAPP_NUMBER,
            body=message,
            to=TO_WHATSAPP_NUMBER
        )
        print("Message sent successfully!")
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")

def send_template_message():
    print("Sending template WhatsApp message...")
    try:
        message = twilio_client.messages.create(
            from_=FROM_WHATSAPP_NUMBER,
            content_sid=CONTENT_SID,
            content_variables='{"1":"12/1","2":"3pm"}',
            to=TO_WHATSAPP_NUMBER
        )
        print(f"Template message sent successfully! SID: {message.sid}")
        return message.sid
    except Exception as e:
        print(f"Error sending template WhatsApp message: {e}")
        return None

def get_formatted_date_time():
    """Get current date and time formatted for template variables"""
    now = datetime.now()
    date_str = now.strftime("%m/%d")  # Format: MM/DD
    time_str = now.strftime("%I%p").lower()  # Format: 3pm
    return date_str, time_str

print("Starting WhatsApp News Bot...")
try:
    # First, send a template message
    date_str, time_str = get_formatted_date_time()
    content_variables = json.dumps({"1": date_str, "2": time_str})

    print(f"Sending template message with variables: {content_variables}")
    template_sid = twilio_client.messages.create(
        from_=FROM_WHATSAPP_NUMBER,
        content_sid=CONTENT_SID,
        content_variables=content_variables,
        to=TO_WHATSAPP_NUMBER
    ).sid
    print(f"Template message sent with SID: {template_sid}")

    # Then send news updates
    news = get_latest_news()
    send_whatsapp_message(news)
    print("First news cycle complete. Press Ctrl+C to stop.")

    # Run continuously
    while True:
        print("Waiting for next update cycle...")
        time.sleep(3700)  # Every hour

        # Send news updates
        news = get_latest_news()
        send_whatsapp_message(news)
except Exception as e:
    print(f"Error in main loop: {e}")
except KeyboardInterrupt:
    print("\nWhatsApp News Bot stopped by user.")