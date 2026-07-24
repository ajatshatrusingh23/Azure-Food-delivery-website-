# 🍽️ Azure – AI-Powered Food Delivery Platform

> A production-ready full-stack food delivery platform inspired by modern food delivery applications. Azure enables customers to discover restaurants, order food, track deliveries in real time, and receive AI-powered food recommendations through a scalable microservice-oriented architecture.

---

# 🚀 Live Demo

* **Frontend:** https://your-frontend-url.com
* **Backend API:** https://your-backend-url.com
* **API Documentation:** https://your-api-docs.com

---

# 📸 Screenshots

> Add screenshots of:

* Home Page
* Login
* Restaurant Listing
* Restaurant Details
* Cart
* Checkout
* Order Tracking
* Restaurant Dashboard
* Admin Dashboard
* Delivery Dashboard

---

# ✨ Features

## 👤 Customer

* Secure Authentication
* JWT Authentication
* Refresh Tokens
* Google Authentication (Optional)
* Restaurant Search
* Location-based Restaurants
* Food Search
* Advanced Filters
* Categories
* Restaurant Details
* Menu Browsing
* Add to Cart
* Checkout
* Razorpay Payments
* Coupon System
* Order History
* Live Order Tracking
* Reviews & Ratings
* Favorite Restaurants
* Notifications
* Responsive Design

---

## 🍴 Restaurant Owner

* Restaurant Registration
* Restaurant Verification
* Restaurant Dashboard
* Menu Management
* Category Management
* Order Management
* Sales Dashboard
* Analytics
* Restaurant Profile
* Working Hours
* Cloudinary Image Upload

---

## 🚴 Delivery Partner

* Login
* Accept Orders
* Live Navigation
* Order Updates
* Earnings Dashboard
* Delivery History
* Availability Toggle

---

## 👨‍💼 Admin

* Dashboard
* User Management
* Restaurant Management
* Delivery Partner Management
* Order Monitoring
* Coupons
* Categories
* Revenue Analytics
* Reports
* Notifications
* Platform Settings

---

## 🤖 AI Features

* Personalized Food Recommendations
* Restaurant Recommendation Engine
* Smart Food Search
* AI Chat Assistant
* Review Sentiment Analysis
* Trending Food Detection
* Personalized Home Feed

---

# 🛠️ Tech Stack

## Frontend

* Next.js 15 (App Router)
* TypeScript
* Tailwind CSS
* Shadcn UI
* Redux Toolkit
* Axios
* React Hook Form
* Zod

---

## Backend

* Node.js
* Express.js
* TypeScript
* Prisma ORM
* REST API
* Socket.io

---

## Database

* PostgreSQL
* Redis

---

## Authentication

* JWT
* Refresh Tokens
* bcrypt

---

## Cloud

* Cloudinary

---

## Payment

* Razorpay

---

## AI

* LangChain
* OpenAI / Gemini

---

## DevOps

* Docker
* Docker Compose
* GitHub Actions

---

# 🏗️ System Architecture

```text
Client

↓

Next.js Frontend

↓

API Gateway

↓

Authentication Service

↓

Restaurant Service

↓

Menu Service

↓

Cart Service

↓

Order Service

↓

Payment Service

↓

Delivery Service

↓

Notification Service

↓

AI Recommendation Service

↓

PostgreSQL

↓

Redis

↓

Cloudinary
```

---

# 📂 Project Structure

```text
Ayuze/

frontend/
│
├── app/
├── components/
├── hooks/
├── services/
├── providers/
├── store/
├── utils/
├── constants/
├── lib/
├── types/

backend/
│
├── controllers/
├── routes/
├── services/
├── repositories/
├── middlewares/
├── config/
├── prisma/
├── socket/
├── validators/
├── modules/
├── utils/
├── types/
├── interfaces/

docker/

docs/
```

---

# 🗄️ Database Schema

Core entities include:

* Users
* Restaurants
* Menu Items
* Categories
* Orders
* Order Items
* Cart
* Payments
* Coupons
* Reviews
* Notifications
* Delivery Partners
* Favorites
* Addresses

---

# 🔐 Authentication Flow

1. User signs up.
2. Password is hashed using bcrypt.
3. JWT Access Token is generated.
4. Refresh Token is issued.
5. Protected routes validate JWT.
6. Refresh Token renews expired sessions.

---

# 📦 Installation

## Clone Repository

```bash
git clone https://github.com/your-username/ayuze.git

cd ayuze
```

---

## Backend

```bash
cd backend

npm install
```

Create a `.env` file and configure your environment variables.

Run Prisma migrations:

```bash
npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# 🐳 Docker

Build and start the application:

```bash
docker-compose up --build
```

---

# 🔑 Environment Variables

## Backend

```env
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=
REDIS_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GOOGLE_MAPS_API_KEY=
OPENAI_API_KEY=
```

## Frontend

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
```

---

# 📡 API Modules

* Authentication
* Users
* Restaurants
* Menus
* Categories
* Search
* Cart
* Orders
* Payments
* Delivery
* Reviews
* Notifications
* AI Recommendations

---

# 🔄 Order Flow

Customer → Cart → Checkout → Payment → Restaurant Acceptance → Delivery Partner Assignment → Live Tracking → Delivered → Review

---

# 📈 Performance Optimizations

* Redis Caching
* Pagination
* Lazy Loading
* Image Optimization
* Database Indexing
* Code Splitting
* API Rate Limiting
* Compression
* Optimized SQL Queries

---

# 🔒 Security

* JWT Authentication
* Refresh Tokens
* Password Hashing
* Helmet
* CORS
* Input Validation
* SQL Injection Protection
* XSS Protection
* Rate Limiting
* Secure Cookies

---

# 🧪 Testing

* Unit Testing
* Integration Testing
* API Testing
* Authentication Testing
* Payment Testing

---

# 🚀 Deployment

Frontend

* Vercel

Backend

* Render / Railway / AWS EC2

Database

* PostgreSQL

Storage

* Cloudinary

---

# 🗺️ Future Enhancements

* Native Android & iOS apps
* Voice-based food search
* Multi-language support
* Subscription plans
* Group ordering
* Scheduled deliveries
* Loyalty rewards
* Restaurant inventory management
* Dynamic pricing
* Machine learning-based delivery time prediction

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push to your branch.
5. Open a Pull Request.

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Ajatshatru Singh**

* GitHub: https://github.com/ajatshatrusingh23
* LinkedIn: https://www.linkedin.com/in/your-linkedin-profile

---

⭐ If you found this project useful, consider giving it a star on GitHub!
