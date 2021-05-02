pm2 start new_glam_listener.py --interpreter python3 --no-autorestart
pm2 start daily.py --cron '0 4 * * *' --interpreter python3 --no-autorestart