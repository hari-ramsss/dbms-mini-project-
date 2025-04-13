# E-Mall Property Management System

A comprehensive property management system for electronic malls (E-Malls) to manage shops, tenants, leases, and maintenance requests.

## Features

- **Dashboard**: View key metrics and statistics at a glance
- **Shops Management**: Manage shops, their status, and details
- **Tenant Management**: Keep track of all tenants and their information
- **Lease Management**: Manage lease agreements, dates, and payments
- **Maintenance Tracking**: Track and manage maintenance requests

## Tech Stack

- **Backend**: Flask with SQLAlchemy (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite (for development)

## Project Structure

```
emall-property-management/
│
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   └── venv/                  # Python virtual environment
│
└── frontend/
    ├── index.html            # Main HTML file
    ├── style.css             # CSS styles
    └── script.js             # JavaScript for frontend logic
```

## Installation & Setup

1. Clone the repository
2. Set up the Python environment:
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   ```
3. Run the application:
   ```
   python app.py
   ```
4. Open a web browser and go to `http://localhost:5000`

## Database Models

The system includes the following main database models:

- **Shops**: Properties available for rent
- **Tenants**: Businesses or individuals renting shops
- **Leases**: Contracts between property owners and tenants
- **Maintenance**: Maintenance requests for shops

## API Endpoints

- `/api/dashboard` - Get dashboard statistics
- `/api/shops` - Get all shops information
- `/api/tenants` - Get all tenants information 
- `/api/leases` - Get all leases information
- `/api/maintenance` - Get all maintenance requests

## Future Improvements

- User authentication and role-based access
- Advanced reporting and analytics
- Invoice and payment management
- Mobile application
- Email notifications for lease renewals and maintenance updates

## License

This project is licensed under the MIT License. 