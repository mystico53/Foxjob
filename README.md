# 🦊 FoxJob

FoxJob is an intelligent job application tracking system that uses GenAI to match your resume with job descriptions, helping you focus on opportunities that matter. Try it now at [foxjob.io](https://foxjob.io)!

## 🎯 About this document

This documents purpose is to explain what the Foxjob application does and how it works. This project was submitted to the Berkeley Hackathon 2024 in the Application Track. It is NOT a guide on how to make the code run on your machine. However, if you're interested, please shoot a message to konkaiser@gmail.com. Thanks! 

![FoxJob Dashboard](./public/dashboard-preview.png)

## 🎯 What FoxJob Does

- 🔍 **Find Jobs That Fit You** - Our GenAI technology matches your resume with job descriptions
- 📊 **Personalized Compatibility Scores** - Get instant feedback on how well you match each job
- 💪 **Strengths Analysis** - Understand your strengths and weaknesses before applying
- ⚡ **Skip Mismatches** - Focus your time on opportunities where you're a strong candidate
- 🤖 **GenAI-Powered Filtering** - Let AI help you find the most relevant positions

## 🚀 How It Works

### 1. Upload Your Resume

Start by uploading your resume to get personalized job matches

### 2. Install the Extension

Get real-time job compatibility analysis as you browse

### 3. Scan Job Descriptions

Instantly see how well you match with any job posting

## 🛠️ Tech Stack

- **Frontend**: Svelte + SvelteKit
- **UI Framework**: Skeleton UI
- **Styling**: Tailwind CSS
- **Backend**: Firebase
- **Authentication**: Firebase Auth (Google Sign-In)
- **Database**: Firestore
- **Hosting**: Vercel/Firebase Hosting
- **AI**: Custom GenAI integration

## 🔥 Features

- 📋 Google Sign-In integration
- 📄 Resume parsing and analysis
- 🎯 Job description matching
- 📊 Compatibility scoring
- 💡 AI-powered insights
- 🔍 Browser extension support
- 📱 Responsive design

## 💻 Development

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Firebase account

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/foxjob.git
cd foxjob
```

2. Install dependencies

```bash
npm install
```

3. Set up Firebase

- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project
- Go to Project Settings > General
- Add a new web app
- Copy the Firebase configuration

4. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials

5. Start the development server

```bash
npm run dev
```

## 📝 Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📜 License

This project is MIT licensed. See [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [foxjob.io](https://foxjob.io)
- **Privacy Policy**: [foxjob.io/privacy](https://foxjob.io/privacy)
- **Terms of Service**: [foxjob.io/terms](https://foxjob.io/terms)

## 📦 Version

Current Version: 0.2

---

© 2024 FoxJob. All rights reserved.
