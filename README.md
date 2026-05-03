# 🚀 Sensei AI Career Coach

An AI-powered career coaching platform that helps users with resume building, interview preparation, and industry insights using modern full-stack technologies and background job processing.

---

## 🌐 Live Demo

👉 https://sensei-ai-career-coach.vercel.app/

---

## ✨ Features

* 🤖 **AI Career Guidance** using Groq (Llama 3.1 models)
* 📄 **Resume Builder & Analyzer**
* 🎯 **Interview Preparation Module**
* 📊 **Industry Insights Generation**
* ⏱️ **Automated Background Jobs (Cron)** using Inngest
* 🗄️ **Database Integration** with Prisma
* ⚡ **Serverless Deployment** on Vercel

---

## 🏗️ Tech Stack

**Frontend**

* Next.js (App Router)
* React
* Tailwind CSS

**Backend**

* Node.js
* Next.js API Routes

**AI**

* Groq API (Llama 3.1)

**Database**

* Prisma ORM

**Background Jobs**

* Inngest (Event-driven + Cron jobs)

**Deployment**

* Vercel

---

## ⚙️ How It Works

1. User interacts with the platform (resume, interview, etc.)
2. Industry data is stored in the database
3. A scheduled Inngest function runs weekly:

   * Fetches industries
   * Calls Groq AI
   * Generates structured insights
   * Updates database
4. Data is displayed to users via UI

---

## ⏱️ Cron Job

```js
"0 0 * * 0"
```

Runs every Sunday at 12:00 AM UTC to update industry insights automatically.

---

## 📦 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/prathamas/Sensei-AI-Career-Coach.git
cd Sensei-AI-Career-Coach
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Setup environment variables

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=your_database_url
INNGEST_DEV=1
```

---

### 4. Run locally

```bash
npm run dev
```

Start Inngest dev server:

```bash
npx inngest-cli@latest dev
```

---

## 🚀 Deployment

### Vercel Setup

1. Push code to GitHub
2. Import project into Vercel
3. Add environment variables:

```env
GROQ_API_KEY=your_key
DATABASE_URL=your_db_url
INNGEST_SIGNING_KEY=your_signing_key
```

⚠️ Do NOT include:

```
INNGEST_DEV=1
```

---

## 🔗 Inngest Setup (Production)

1. Go to Inngest Dashboard
2. Sync new app
3. Add endpoint:

```
https://your-domain.vercel.app/api/inngest
```

---

## 📊 Future Improvements

* ⚡ Parallel processing for faster AI execution
* 📈 Dashboard with charts (salary, trends)
* 🔔 Real-time insights on user interaction
* 🧠 Improved prompt engineering
* 💾 Caching to reduce API cost

---

## 🧠 Key Learnings

* Building event-driven architectures
* Integrating AI APIs into production apps
* Handling cron jobs in serverless environments
* Managing environment configurations securely
* Debugging distributed systems (Inngest + Vercel)

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 🙌 Author

**Pratham Singh**

* GitHub: https://github.com/prathamas
* LinkedIn: https://www.linkedin.com/in/pratham-singh-42b943347/

---

⭐ If you like this project, give it a star!
