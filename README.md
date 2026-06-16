# LDB Virtual Card — NestJS Service

## ຕິດຕັ້ງ ແລະ Start

```bash
# 1. Install dependencies
npm install

# 2. Copy .env ແລ້ວແກ້ຄ່າ
cp .env.example .env
nano .env

# 3. Generate AES key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Start development
npm run start:dev

# 5. Start production
npm run build
npm run start:prod
```

## .env config

```dotenv
PORT=3000
DB_USER=LDB_CARD
DB_PASS=your_password
DB_CONNECT_STRING=10.154.46.26:1521/LDBDB
AES_KEY=<64 hex chars>
AES_KEY_VERSION=v1
```

## API Endpoints

| Method | Path | ໜ້າທີ່ |
|--------|------|--------|
| POST | `/virtual-cards/issue-file` | Upload CMS file → encrypt → INSERT Oracle |
| POST | `/virtual-cards/issue-raw` | Test ດ້ວຍ JSON |
| GET | `/virtual-cards` | List cards (PAN masked) |
| GET | `/virtual-cards/:id/decrypt` | Decrypt ສຳລັບ Mobile |
| PATCH | `/virtual-cards/:id/activate` | Activate card |

## Test with curl

```bash
# Upload file
curl -X POST http://localhost:3000/virtual-cards/issue-file \
  -F "file=@cardvtest.txt" \
  -F "cifNo=CIF001" \
  -F "fullName=HE J Q" \
  -F "productCode=UPI_LDB_GOLD"

# List cards
curl http://localhost:3000/virtual-cards

# Decrypt card ID=1
curl http://localhost:3000/virtual-cards/1/decrypt

# Activate card ID=1
curl -X PATCH http://localhost:3000/virtual-cards/1/activate
```
