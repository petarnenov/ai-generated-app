# GitLab PR AI Reviewer

A powerful Node.js/React application that provides AI-powered code reviews for GitLab merge requests. This application integrates with GitLab's API and various AI providers (OpenAI, Anthropic) to automatically analyze code changes and provide intelligent feedback.

## Features

### 🤖 AI-Powered Reviews
- **Multiple AI Providers**: Support for OpenAI GPT-4, Anthropic Claude, and more
- **Review Types**: General code review, security analysis, performance optimization, and test coverage
- **Intelligent Analysis**: Contextual code analysis with specific suggestions and improvements
- **Scoring System**: Automatic scoring of code quality (1-10 scale)

### 🔧 GitLab Integration
- **Webhook Support**: Automatic triggering of reviews on merge request events
- **API Integration**: Seamless integration with GitLab's REST API
- **Project Management**: Easy tracking and management of multiple GitLab projects
- **Comment Posting**: Automatic posting of review comments back to GitLab

### 📊 Dashboard & Analytics
- **Overview Dashboard**: Real-time statistics and activity monitoring
- **Review History**: Complete history of all AI reviews and their outcomes
- **Project Analytics**: Per-project review statistics and trends
- **Performance Metrics**: Track review accuracy and effectiveness

### ⚙️ Configuration Management
- **Easy Setup**: Simple configuration wizard for GitLab and AI providers
- **Customizable Rules**: Configurable review settings and thresholds
- **Security First**: Secure storage of API keys and tokens
- **Flexible Settings**: Per-project and global configuration options

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for beautiful, responsive UI
- **React Router** for navigation
- **Lucide React** for icons
- **Headless UI** for accessible components

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **SQLite** for data storage
- **GitLab API** integration
- **OpenAI & Anthropic** API integration

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- GitLab instance with API access
- OpenAI or Anthropic API key

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd gitlab-pr-ai-reviewer
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start development servers**:
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # Frontend on http://localhost:5173
npm run dev:backend   # Backend on http://localhost:3001
```

### Configuration

1. **Access the application** at `http://localhost:5173`
2. **Configure GitLab**:
   - Go to Settings → GitLab
   - Enter your GitLab URL and Personal Access Token
   - Test the connection
3. **Configure AI Providers**:
   - Go to Settings → AI Providers
   - Add your OpenAI or Anthropic API keys
   - Test the connections
4. **Add Projects**:
   - Go to Projects → Browse GitLab Projects
   - Search and add projects you want to track
   - Configure webhooks if needed

## API Endpoints

### GitLab Integration
- `GET /api/gitlab/config` - Get GitLab configuration
- `POST /api/gitlab/config` - Update GitLab configuration
- `GET /api/gitlab/projects` - List GitLab projects
- `POST /api/gitlab/projects/:id/track` - Add project to tracking
- `POST /api/gitlab/webhook` - Webhook endpoint for GitLab events

### Pull Request Management
- `GET /api/pr` - List merge requests
- `GET /api/pr/:id` - Get merge request details
- `POST /api/pr/:id/review` - Trigger AI review
- `GET /api/pr/stats/summary` - Get review statistics

### AI Integration
- `GET /api/ai/config` - Get AI configuration
- `POST /api/ai/config` - Update AI configuration
- `POST /api/ai/test` - Test AI provider connection
- `GET /api/ai/models` - List available AI models
- `GET /api/ai/templates` - Get review templates

## Development

### Project Structure
```
gitlab-pr-ai-reviewer/
├── src/                 # Frontend React application
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   └── ...
├── server/             # Backend Node.js application
│   ├── routes/         # API route handlers
│   ├── database/       # Database initialization
│   └── middleware/     # Express middleware
├── public/             # Static assets
└── database.sqlite     # SQLite database (auto-created)
```

### Available Scripts
- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Start frontend only
- `npm run dev:backend` - Start backend only
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
```env
# Server
PORT=3001
NODE_ENV=production

# GitLab (can be configured via UI)
GITLAB_URL=https://gitlab.example.com
GITLAB_TOKEN=your_token_here

# AI Providers (can be configured via UI)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security

- API keys are stored securely in the database
- Webhook tokens are generated and validated
- All API requests are authenticated
- Input validation and sanitization

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

---

**Built with ❤️ for better code reviews**
