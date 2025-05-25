# MyTubeFeed

MyTubeFeed is a modern web application that allows you to create a personalized YouTube feed by subscribing to your favorite channels. Built with Next.js, it provides a clean and intuitive interface to manage your YouTube subscriptions and view the latest videos.

## Features

- 🔐 Secure authentication with NextAuth.js
- 📱 Responsive design that works on all devices
- 🌓 Dark mode support
- 📺 Channel management with easy add/remove functionality
- 🎥 Video feed grouped by channels
- ⚡ Real-time updates when adding/removing channels
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Framework:** Next.js 14
- **Authentication:** NextAuth.js
- **Database:** MongoDB
- **Styling:** Tailwind CSS
- **Icons:** React Icons
- **API:** YouTube Data API v3

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- YouTube Data API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# MongoDB
MONGODB_URI=your-mongodb-connection-string

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MyTubeFeed.git
   cd MyTubeFeed
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables in `.env`

4. Run the development server:
   ```bash
   npm run dev:local
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
MyTubeFeed/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   └── lib/               # Utility functions
├── public/                # Static files
└── data/                 # MongoDB data (gitignored)
```

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/channels` - Channel management
- `/api/videos` - Video feed data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
