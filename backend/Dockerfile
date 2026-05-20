FROM python:3.11-slim 

# Using python as base image

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Creating and moving into the main folder for our application files
WORKDIR /app

# Downloading necessary system tools and clearing setup files to stay light
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Moving just the package list file over to help speed up future builds
COPY requirements.txt .

# Installing all the required Python libraries for the project
RUN pip install --no-cache-dir -r requirements.txt

# Copying the rest of the backend files into setup folder
COPY . .

# Opening up network communication on the main web server channel
EXPOSE 8000

# Launching the backend application so external devices can connect to it
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]