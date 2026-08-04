FROM node:20-slim
WORKDIR /app

# Install Python 3, pip, and required packages
RUN apt-get update && apt-get install -y python3 python3-pip && \
    pip3 install pandas openpyxl mysql-connector-python --break-system-packages

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install


# Copy the rest of the server code
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]