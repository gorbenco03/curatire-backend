# Sistem de Management pentru Curățătorie

Backend REST API pentru sistemul de management al unei curățătorii, dezvoltat în Node.js cu TypeScript și MongoDB.

## 🌟 Caracteristici Principale

- **Gestionare Comenzi**: Creare, urmărire și gestionare completă a comenzilor
- **Sistem QR Code**: Generare și scanare QR codes pentru urmărirea articolelor
- **Gestionare Clienți**: Evidența clienților cu istoric comenzi și puncte de loialitate
- **Servicii Flexibile**: Catalog de servicii cu prețuri și categorii diferite
- **Autentificare și Autorizare**: Sistem JWT cu roluri (Admin/Angajat)
- **Raportare**: Statistici detaliate și rapoarte pentru business
- **API RESTful**: Documentație completă și endpoints structurate

## 🏗️ Arhitectura Proiectului

```
src/
├── config/          # Configurări (database, environment)
├── controllers/     # Logica pentru endpoint-uri
├── middleware/      # Middleware-uri (auth, validare, erori)
├── models/          # Modele MongoDB (Mongoose)
├── routes/          # Definirea rutelor API
├── services/        # Logica de business
├── utils/           # Utilități și constante
└── app.ts          # Configurarea aplicației Express
```

## 📋 Funcționalități

### 🛒 Gestionare Comenzi
- Creare comenzi cu articole multiple
- Urmărire status (Înregistrată → În procesare → Gata → Livrată)
- Scanare QR pentru marcarea articolelor finalizate
- Generare bon fiscal și etichete
- Calculare automată dată estimată de finalizare

### 👥 Gestionare Clienți
- Profil client cu date de contact
- Istoric comenzi și statistici
- Sistem puncte de loialitate
- Căutare avansată după nume/telefon

### 🏷️ Sistem QR Code
- Generare QR unic pentru fiecare articol
- Scanare pentru urmărire în timp real
- QR pentru bonuri fiscale
- Suport pentru scanare în lot (batch)

### 📊 Raportare și Statistici
- Dashboard cu KPI-uri în timp real
- Rapoarte personalizabile pe perioade
- Comenzi întârziate și notificări
- Servicii populare și statistici vânzări

### 🔐 Securitate
- Autentificare JWT
- Roluri și permisiuni granulare
- Rate limiting și protecție CORS
- Validare strictă date de intrare

## 🚀 Instalare și Configurare

### Cerințe
- Node.js 18+
- MongoDB 5.0+
- npm sau yarn

### Pas cu pas

1. **Clonează repository-ul**
```bash
git clone <repository-url>
cd laundry-management-backend
```

2. **Instalează dependințele**
```bash
npm install
```

3. **Configurează variabilele de environment**
```bash
cp .env.example .env
```

Editează fișierul `.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/laundry_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development

# Business Info
BUSINESS_NAME=Curătătorie Premium
BUSINESS_ADDRESS=Strada Exemplu Nr. 123, Timișoara
BUSINESS_PHONE=0256123456
BUSINESS_EMAIL=contact@curatarie.ro

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minute
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

4. **Rulează aplicația**

**Dezvoltare:**
```bash
npm run dev
```

**Producție:**
```bash
npm run build
npm start
```

## 📚 Utilizare API

### Autentificare

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "root"
}
```

**Utilizatori demo:**
- **Admin**: `admin` / `root`
- **Angajat**: `angajat` / `angajat`

### Comenzi

**Creare comandă nouă**
```bash
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer": {
    "name": "Ion Popescu",
    "phone": "0740123456",
    "email": "ion@example.com"
  },
  "items": [
    {
      "serviceCode": "CAMASA_BARBAT",
      "quantity": 2,
      "price": 80,
      "notes": "Fără amidon"
    }
  ],
  "notes": "Comandă urgentă",
  "isExpress": false
}
```

**Scanare QR Code**
```bash
POST /api/orders/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "qrCode": "CMD-2024-0001-A1"
}
```

**Listare comenzi**
```bash
GET /api/orders?status=ready&page=1&limit=20
Authorization: Bearer <token>
```

### Căutare

**După telefon**
```bash
GET /api/orders/search/phone/0740123456
Authorization: Bearer <token>
```

**După nume client**
```bash
GET /api/orders/search/customer/Popescu
Authorization: Bearer <token>
```

## 🗄️ Structura Bazei de Date

### Modele Principale

**User** - Utilizatori sistem
- `username`, `password`, `name`, `role`, `email`, `phone`
- Roluri: `admin`, `employee`

**Order** - Comenzi
- `orderNumber`, `customer`, `items[]`, `status`, `totalPrice`
- Status: `registered`, `in_progress`, `ready`, `delivered`, `cancelled`

**Customer** - Clienți
- `name`, `phone`, `email`, `totalOrders`, `totalSpent`, `loyaltyPoints`

**Service** - Servicii disponibile
- `code`, `name`, `category`, `price`, `priceMax`, `unit`

## 🧪 Testare

```bash
# Rulează toate testele
npm test

# Testare cu coverage
npm run test:coverage

# Testare în modul watch
npm run test:watch
```

## 🔧 Scripts Disponibile

```bash
npm run dev          # Dezvoltare cu hot reload
npm run build        # Build pentru producție
npm start           # Pornire aplicație (production)
npm run lint        # Verificare cod (ESLint)
npm run lint:fix    # Corectare automată erori lint
npm run typecheck   # Verificare TypeScript
npm run verify      # Verificare integritate fix-uri
```

## 📊 Monitoring și Logging

### Endpoints de Monitorizare

- **Health Check**: `GET /api/health`
- **API Info**: `GET /api/version`
- **Statistici**: `GET /api/orders/statistics` (Admin)

### Loguri

Aplicația loghează automat:
- Autentificări și activități utilizatori
- Operații cu comenzi și scanare QR
- Erori și warning-uri sistem
- Performance și request timing

Logurile sunt salvate în:
- **Dezvoltare**: Console
- **Producție**: Console + `logs/app.log`

## 🚀 Deployment

### Docker (Recomandat)

1. **Creează imaginea**
```bash
docker build -t laundry-management .
```

2. **Rulează cu Docker Compose**
```bash
docker-compose up -d
```

### PM2 (Producție Node.js)

```bash
npm install -g pm2
npm run build
pm2 start dist/server.js --name "laundry-api"
```

### Variabile Environment (Producție)

```env
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@hostname:port/database
JWT_SECRET=your-production-secret-key
PORT=4000
```

## 🤝 Contribuție

1. Fork repository-ul
2. Creează branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit modificările (`git commit -m 'Add AmazingFeature'`)
4. Push pe branch (`git push origin feature/AmazingFeature`)
5. Deschide Pull Request

### Ghid Dezvoltare

- Respectă standardele ESLint
- Adaugă teste pentru funcționalități noi
- Documentează API endpoints-urile
- Folosește conventional commits

## 📄 Licență

Acest proiect este licențiat sub MIT License - vezi fișierul [LICENSE](LICENSE) pentru detalii.

## 📞 Contact și Suport

- **Email**: contact@curatarie.ro
- **GitHub Issues**: Pentru bug reports și feature requests
- **Documentație API**: `/api-docs` (în dezvoltare)

## 🎯 Roadmap

- [ ] Integrare SMS pentru notificări
- [ ] Aplicație mobile (React Native)
- [ ] Dashboard web (React)
- [ ] Integrare sisteme de plată
- [ ] API pentru parteneri
- [ ] Backup automat și disaster recovery

---

**Dezvoltat cu ❤️ pentru industria curățătoriilor în România**
