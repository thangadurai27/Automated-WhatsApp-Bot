# WhatsApp News Bot SaaS

A SaaS platform that allows users to receive personalized news updates via WhatsApp based on their topics of interest.

## Features

- **User Dashboard**: Manage topics, WhatsApp numbers, and update schedules
- **Topic Management**: Create and manage news topics with keywords, country, and language preferences
- **WhatsApp Integration**: Verify and manage WhatsApp numbers for receiving updates
- **Scheduling**: Set up hourly or daily news updates
- **AI Summaries**: News articles are summarized using Google's Gemini AI
- **Subscription Tiers**: Free and premium plans with different feature sets

## Tech Stack

- **Frontend**: React with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Task Queue**: Celery with Redis
- **AI**: Google Gemini API for news summarization
- **WhatsApp API**: Twilio WhatsApp API
- **News Source**: NewsData.io API

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Twilio account with WhatsApp API access
- NewsData.io API key
- Google Gemini API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NEWSDATA_API_KEY=your_newsdata_api_key
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=whatsapp:+14155238886
GEMINI_API_KEY=your_gemini_api_key
```

### Running the Application

1. Build and start the containers:

```bash
docker-compose up -d
```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs

## Subscription Plans

### Free Tier
- Up to 3 topics
- Daily updates only
- Maximum 3 updates per day
- 1 WhatsApp number
- Basic AI summaries

### Premium Tier ($9.99/month)
- Unlimited topics
- Hourly or daily updates
- Unlimited updates
- Multiple WhatsApp numbers
- Advanced AI summaries
- Priority support

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## Deployment

The application can be deployed to various cloud platforms:

- **Render**: Deploy the Docker Compose setup directly
- **Railway**: Use the built-in PostgreSQL and Redis add-ons
- **AWS**: Deploy using ECS with RDS for PostgreSQL and ElastiCache for Redis

## License

This project is licensed under the MIT License - see the LICENSE file for details.
