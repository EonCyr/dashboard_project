FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip ca-certificates && \
    update-ca-certificates && \
    pip3 install pandas openpyxl mysql-connector-python --break-system-packages

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]