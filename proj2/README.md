# Saavi Lite — Professional CCTV & LED Display Solutions

A modern, responsive single-page website with an admin panel for gallery management.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Image Storage**: Cloudinary
- **Auth**: JWT (JSON Web Tokens)
- **Email**: Nodemailer (Gmail)

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd proj2
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable                | Description                          |
|------------------------|--------------------------------------|
| `MONGODB_URI`          | MongoDB Atlas connection string      |
| `JWT_SECRET`           | Random secret for JWT signing        |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary cloud name               |
| `CLOUDINARY_API_KEY`   | Cloudinary API key                   |
| `CLOUDINARY_API_SECRET`| Cloudinary API secret                |
| `EMAIL_USER`           | Gmail address for contact form       |
| `EMAIL_PASS`           | Gmail App Password                   |

### 3. Seed Admin User

```bash
npm run seed
```

Default credentials: `admin` / `admin123` — **change after first login**.

### 4. Run Locally

```bash
npm start
```

- **Website**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

---

## Deployment on Hostinger (via GitHub)

1. Push code to GitHub repository
2. In Hostinger dashboard → **Websites** → **Manage** → **Advanced** → **Git**
3. Connect your GitHub repo and branch (`main`)
4. Set **Node.js version** to 18+
5. Set **Entry point** to `server/server.js`
6. Add all environment variables from `.env` in the dashboard
7. Deploy!

### Build Command
```
npm install
```

### Start Command
```
npm start
```

---

## Project Structure

```
proj2/
├── public/              # Static frontend
│   ├── index.html       # Main website
│   ├── admin.html       # Admin panel
│   ├── css/
│   │   ├── index.css    # Main styles
│   │   └── admin.css    # Admin styles
│   └── js/
│       ├── main.js      # Site interactions
│       └── admin.js     # Admin logic
├── server/
│   ├── server.js        # Express entry point
│   ├── seed.js          # Admin user seeder
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   └── middleware/       # JWT auth
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint              | Auth | Description          |
|--------|-----------------------|------|----------------------|
| POST   | `/api/auth/login`     | No   | Admin login          |
| GET    | `/api/gallery`        | No   | Get all images       |
| POST   | `/api/gallery`        | Yes  | Upload image (5MB)   |
| DELETE | `/api/gallery/:id`    | Yes  | Delete image         |
| POST   | `/api/contact`        | No   | Submit contact form  |
