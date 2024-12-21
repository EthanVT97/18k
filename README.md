# 7Dragon Chat Application

A modern chat application with an admin dashboard for managing users, games, and transactions.

## Features

- Real-time chat functionality
- Admin dashboard with comprehensive management tools
- User management system
- Game statistics and monitoring
- Transaction tracking
- Report generation and downloads
- Responsive design for all devices

## Tech Stack

- Frontend:
  - HTML5, CSS3, JavaScript
  - Bootstrap for responsive design
  - Chart.js for data visualization
  - Font Awesome for icons

- Backend:
  - Python (HTTP Server)
  - WebSocket support for real-time communication
  - JSON for data storage and API responses

## Getting Started

### Prerequisites

- Python 3.x
- Modern web browser
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/7dragon-chat.git
   cd 7dragon-chat
   ```

2. Start the server:
   ```bash
   python server.py
   ```

3. Access the application:
   - Main site: `http://127.0.0.1:8000`
   - Admin dashboard: `http://127.0.0.1:8000/admin`

### Network Access

To access from other devices on your network:
1. Start the server (it will show your local IP)
2. Access using:
   - Main site: `http://<your-ip>:8000`
   - Admin dashboard: `http://<your-ip>:8000/admin`

## Admin Dashboard

The admin dashboard provides:
- User management
- Game statistics
- Transaction monitoring
- Report generation
- Data downloads (CSV, JSON, PDF)
- Real-time analytics

## Project Structure

```
7dragon-chat/
├── public/
│   ├── admin/
│   │   ├── css/
│   │   ├── js/
│   │   └── *.html
│   ├── css/
│   ├── js/
│   └── index.html
├── server.py
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Font Awesome for icons
- Bootstrap team for the responsive framework
- Chart.js team for the charting library
