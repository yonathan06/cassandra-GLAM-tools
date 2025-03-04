# GLAM Wiki Dashboard

The purpose of this project is to Support GLAMs* in monitoring and evaluating
their cooperation with Wikimedia projects. Starting from a Wikimedia Commons
category this tool collects data about usage, views, contributors and topology
of the files inside.

** GLAM - galleries, libraries, archives and museums

## Structure

The project is split into two packages - app & services.

* app - includes an express.js server that functions both as an API and as a front-end server (using mostly handlebars as render engine)
* services - includes python & node.js scripts for ETL (extract, transform & load) and recommendations (not currently active). The ETL includes a new GLAM loader (for when adding a new GLAM to the system), and a daily cron job to updated the analytical data of yesterday for all of the GLAMs in the system.

## Installation - app

Enter the /app folder

```bash
cd app
```

Install Node.js project dependencies:

```bash
npm install
```

**Add a production config file inside the config folder: `./config/config.production.json` With the same structure as in `./config/config.sample.json`**

export ENV:

```bash
export ENV="production"
```

Run the local server:

```bash
pm2 start server.js
```

You can see the logs by running th following command:

```bash
pm2 logs
```

## Installation - services

Enter services folder

```bash
cd services
```

Install Python dependencies:

```bash
pip3 install -r requirements.txt
npm install
```

export ENV:

```bash
export ENV="production"
```

**Add a production config file inside the config folder: `./config/config.production.json` With the same structure as in `./config/config.sample.json`**


### Run initdaily.sh - script that run dail.py. <br /> Run it with the following commands to do it with a daily cron job
The daily script runs every day at 4:00 AM

### Run daily cronjob

```bash
pm2 start daily.py --cron '0 4 * * *' --interpreter python3 --no-autorestart -- -e production
```

### Save the process

```bash
pm2 save
```

A Logs folder will be created, every day  at 4:00 AM a new file will be added with the date of the day, where you can always see the logs of the daily.  <br >

### Run new glam listener

```bash
pm2 start new_glam_listener.py --interpreter python3 -- -e production
```

You can see the logs by running th following command:

```bash
pm2 logs
```

## Starting local postgres instance using docker compose

```bash
docker-compose up -d
```

# FLOW

## Adding a new organization

1. User submits a response in the google form
2. Supporter (that's you) gets an email notification (set it up in advance...)
3. Verify the user's response validity
4. Log in to the WikiGlams control panel. Use the details from the production config file.
5. **Make sure that the `new_glam_listener` is running**
6. **Create a new GLAM** with the relevant details of the organization
7. Make sure that the `new_glam_listener` finishes the job
