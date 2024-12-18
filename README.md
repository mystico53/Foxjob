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

## 🚀 Getting Started

### 1. Create Your Account

- Visit [foxjob.io](https://foxjob.io)
- Sign in with Google
- Upload your resume to enable personalized matching

### 2. Install the Extension

- Get it from the [Chrome Web Store](link-to-extension)
- Pin the extension for easy access (click the puzzle piece icon → pin)

### 3. Start Scanning Jobs

- Browse any job board (LinkedIn, Indeed, company sites)
- Click the Foxjob extension icon and hit "Scan"
- Continue browsing - processing happens in background
- View your analyzed jobs in the webapp

## 📊 Understanding Your Job Analysis

### Quick Overview

- Job title and company details
- Industry and compensation info
- Remote work status
- Company and role summary

### Match Analysis

- Overall compatibility score
- Top 3 strengths - perfect for cover letters and networking
- Areas for improvement - prepare your talking points
- Customized assessment based on your resume

### Detailed Breakdown

Click "Show Details" for:

- 📋 "Big Six" Requirements Analysis
  - Key requirements with direct quotes
  - Your match score for each
- 💻 Hard Skills Assessment
  - Critical technical skills
  - Your proficiency evaluation
- 🎯 Domain Expertise Analysis
  - Industry knowledge requirements
  - Experience match assessment

## 💡 Pro Tips

- Focus on strong matches (65%+ match score)
- Use identified strengths in your cover letters
- Prepare for interviews using the detailed analysis
- Customize applications based on the insights
- Scan multiple positions to understand market trends

## 🛠️ Tech Stack

- **Frontend**: Svelte + SvelteKit
- **UI Framework**: Skeleton UI
- **Styling**: Tailwind CSS
- **Backend**: Firebase
- **Authentication**: Firebase Auth (Google Sign-In)
- **Database**: Firestore
- **Hosting**: Vercel/Firebase Hosting
- **AI**: Custom GenAI integration

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

## 📦 Version

- Webapp Version: 0.2
- Chrome Extension Version: 0.19

## 🤝 Support

Need help? We're here:

- Email: konkaiser@gmail.com
- In-app: Use the "Give Feedback" button

## 🔗 Links

- **Website**: [foxjob.io](https://foxjob.io)
- **Privacy Policy**: [foxjob.io/privacy](https://foxjob.io/privacy)
- **Terms of Service**: [foxjob.io/terms](https://foxjob.io/terms)

## 📜 License

This project is MIT licensed. See [LICENSE](LICENSE) file for details.

---

© 2024 FoxJob. All rights reserved.
