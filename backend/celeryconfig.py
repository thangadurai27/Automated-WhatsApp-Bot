from celery.schedules import crontab

# Broker settings
broker_url = 'redis://localhost:6379/0'
result_backend = 'redis://localhost:6379/0'

# Task serialization format
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'

# Enable UTC
enable_utc = True

# Configure periodic tasks
beat_schedule = {
    'hourly-news-updates': {
        'task': 'celery_worker.schedule_hourly_updates',
        'schedule': crontab(minute=0),  # Run at the top of every hour
    },
    'daily-news-updates': {
        'task': 'celery_worker.schedule_daily_updates',
        'schedule': crontab(minute=0),  # Run every hour to check for daily schedules
    },
}
