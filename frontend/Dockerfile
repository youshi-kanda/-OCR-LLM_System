FROM node:18-alpine

WORKDIR /app

# package.jsonとyarn.lockをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# アプリケーションコードのコピー
COPY . .

EXPOSE 3000

CMD ["npm", "start"]